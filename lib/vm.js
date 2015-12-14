"use strict";

const DEFAULT_TIME_SLICE = 1024;

const OPS = {
  sourceline(ctx, lineNumber) {
    let pc = ctx.pause();
    ctx.debug(() => { ctx.resume(pc); },
              pc, ctx.variables, lineNumber);
  },

  // Immediates

  int16(ctx, val) {
    ctx.stack.push(val);
  },

  string(ctx, val) {
    ctx.stack.push(val);
  },

  // Variables

  loadvar(ctx, name) {
    ctx.stack.push(ctx.variables[name]);
  },

  storevar(ctx, name) {
    ctx.variables[name] = ctx.stack.pop();
  },

  pushscope(ctx) {
    ctx.variables = Object.create(ctx.variables);
  },

  popscope(ctx) {
    ctx.variables = Object.getPrototypeOf(ctx.variables);
  },

  // Flow control

  jump(ctx) {
    const stmtNo = ctx.stack.pop();
    ctx.pc = ctx.statementAddr[stmtNo];
  },

  jumpif(ctx) {
    const stmtNo = ctx.stack.pop();
    const pred = ctx.stack.pop();

    if (pred)
      ctx.pc = ctx.statementAddr[stmtNo];
  },

  call(ctx) {
    const newPC = ctx.stack.pop();

    ctx.callStack.push(ctx.pc);
    ctx.pc = ctx.statementAddr[newPC];
  },

  return(ctx) {
    ctx.pc = ctx.callStack.pop();
  },

  callbuiltin(ctx, name) {
    const arg = ctx.stack.pop();

    ctx.stack.push(functionTable[name](arg));
  },

  for(ctx, name) {
    const step = ctx.stack.pop();
    const target = ctx.stack.pop();
    const value = ctx.stack.pop();

    ctx.forStack.push({
      name,
      step,
      target,
      pc: ctx.pc,
      oldValue: ctx.variables[name],
    });

    ctx.variables[name] = value;
  },

  next(ctx, name) {
    let { forStack } = ctx;

    function pop() {
      let frame = forStack.pop();
      ctx.variables[frame.name] = frame.oldValue;
    }
    let tos = () => forStack[forStack.length - 1];

    while (forStack.length && tos().name != name)
      pop();

    let frame = tos();
    if (!(frame && frame.name == name))
      throw Error(`Invalid NEXT argument: ${name}: No matching FOR loop.`);

    ctx.variables[name] += frame.step;
    if (ctx.variables[name] == frame.target)
      pop();
    else
      ctx.pc = frame.pc;
  },

  end(ctx) {
    ctx.complete = true;
    ctx.repl.basicPrint('\n\nfin.');
  },

  // I/O

  print(ctx) {
    ctx.repl.basicPrint(ctx.stack.pop());
  },

  println(ctx) {
    ctx.repl.basicPrint('\n');
  },

  input(ctx) {
    let { stack } = ctx;
    let pc = ctx.pause();

    ctx.repl.basicInput(stack.pop(), str => {
      // If it parses as an int, use an int.
      // parseInt accepts values like "10foo", though, so make sure it's
      // actually a valid conversion.
      let val = parseInt(str, 10);
      if (val == str) {
        stack.push(val);
      } else {
        stack.push(str);
      }
      ctx.resume(pc);
    });
  },

  // Binary ops

  // TODO: Applesoft BASIC automatically converts ints to reals
  // sometimes. Should we truncate, or convert to double, on overflow?

  add(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(a + b);
  },

  sub(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(a - b);
  },

  mul(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(a * b);
  },

  div(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(a / b);
  },

  mod(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(a % b);
  },

  and(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();

    stack.push(exprL && exprR);
  },

  or(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();

    stack.push(exprL || exprR);
  },

  lte(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();

    stack.push(exprL <= exprR);
  },

  gte(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();

    stack.push(exprL >= exprR);
  },

  lt(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();

    stack.push(exprL < exprR);
  },

  gt(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();

    stack.push(exprL > exprR);
  },

  noteq(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();

    stack.push(exprL != exprR);
  },

  eq(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();

    stack.push(exprL == exprR);
  },

  // Unary ops

  neg(ctx) {
    const { stack } = ctx;
    const a = stack.pop();
    stack.push(-a);
  },

  pos(ctx) {
    const { stack } = ctx;
    const a = stack.pop();
    stack.push(+a);
  },

  not(ctx) {
    const { stack } = ctx;
    const a = stack.pop();
    stack.push(!a);
  },
};

function Context(repl, program) {
  this.pc = 0;

  this.repl = repl;
  this.text = program.text;
  this.program = program;

  this.callStack = [];
  this.forStack = [];
  this.stack = [];
  this.statementAddr = program.statementAddr;
  this.variables = Object.create(null);

  this.paused = false;
  this.complete = false;

  this.schedule = step => step();
  this.debug = null;

  this.completed = new Promise((resolve, reject) => {
    this._completed = { resolve, reject };
  });
}

Context.prototype = {
  runSlowly(schedule = null, debug = null) {
    if (schedule !== null)
      this.schedule = schedule;
    if (debug !== null)
      this.debug = debug;

    let step = () => {
      if (this.run())
        this.schedule(step);
      else
        this._completed.resolve();
    };
    step();
  },

  run(steps = DEFAULT_TIME_SLICE) {
    while (!(this.paused || this.complete || --steps < 0)) {
      // Increment the PC *before* executing the instruction, since some
      // ops will change it.
      let instr = this.text[this.pc++];

      console.log('Line ' + this.program.pcMap[this.pc],
                  'Statement ' + this.program.pcStatement[this.pc],
                  'PC=' + (isNaN(this.pc) ? this.pc : `0x${this.pc.toString(16)}`),
                  instr);
      OPS[instr.opcode](this, instr.argument);
    }

    return !this.complete;
  },

  // Pauses execution and returns the PC for the instruction which would
  // have been executed next had we not paused.
  pause() {
    this.paused = true;
    return this.pc;
  },

  resume(pc = null) {
    if (pc !== null)
      this.pc = pc;

    this.paused = false;
    this.runSlowly();
  },
};

function ByteCompiler(program, options = {}) {
  this.pc = null;
  this.program = program;

  this.pcMap = [];
  this.pcStatement = [];
  this.text = [];
  this.statementAddr = Object.create(null);
  this.userFunctions = Object.create(null);

  this.instrument = options.instrument;

  this.compile(program.statements);
}

ByteCompiler.prototype = {
  emit(opcode, argument) {
    this.pc = this.text.length;
    this.pcMap[this.pc] = this.lineNumber;
    this.pcStatement[this.pc] = this.stmtNumber;

    this.text.push({ opcode, argument });
  },

  compileStatement(stmt) {
    this.pc = this.text.length;
    this.lineNumber = stmt.lineNumber;
    this.stmtNumber = stmt.stmtNumber;
    this.statementAddr[stmt.stmtNumber] = this.pc;

    if (this.instrument) {
      this.emit("sourceline", stmt.lineNumber);
    }

    for (let cmd of stmt.commands) {
      switch (cmd.type) {
      case "Goto":
        this.emit("int16", cmd.stmtNumber);
        this.emit("jump");
        break;

      case "GoSub":
        this.emit("int16", cmd.stmtNumber);
        this.emit("call");
        break;

      case "Def":
        this.userFunctions[cmd.name] = cmd;
        break;

      case "Return":
        this.emit("return");
        break;

      case "End":
        this.emit("end");
        break;

      case "Let":
        this.compileExpr(cmd.expr);
        this.emit("storevar", cmd.variable.value);
        break;

      case "Print":
        for (let expr of cmd.exprs) {
          this.compileExpr(expr);
          this.emit("print");
        }
        if (cmd.println)
          this.emit("println");
        break;

      case "Input":
        this.emit("string", cmd.message);
        this.emit("input");
        this.emit("storevar", cmd.variable.value);
        break;

      case "If":
        this.compileExpr(cmd.expr);
        this.emit("int16", cmd.stmtNumber);
        this.emit("jumpif");
        break;

      case "For":
        let { exprL, exprR } = cmd.initExpr;

        this.compileExpr(exprR);
        this.compileExpr(cmd.toExpr);
        if (cmd.stepExpr)
          this.compileExpr(cmd.stepExpr);
        else
          this.emit("int16", 1);

        this.emit("for", exprL.variable.value);
        break;

      case "Next":
        this.emit("next", cmd.stepVar);
        break;

      default:
        throw new SyntaxError("Invalid statement");
      }
    }
  },

  compile(statements) {
    for (let stmt of statements)
      this.compileStatement(stmt);
    this.emit("end");
  },

  compileExpr(expr) {
    if (typeof expr == "string") {
      this.emit("string", expr);
      return;
    }
    if (typeof expr == "number") {
      this.emit("int16", expr);
      return;
    }

    switch (expr.type) {
    case "Variable":
      this.emit("loadvar", expr.variable.value);
      break;

    case "UnaryOp":
      this.compileExpr(expr.exprR);
      this.emit(expr.op.toLowerCase());
      break;

    case "BinOp":
      this.compileExpr(expr.exprL);
      this.compileExpr(expr.exprR);
      this.emit(expr.op.toLowerCase());
      break;

    case "Call":
      this.compileExpr(expr.arg);

      let fnname = expr.fn.value;
      if (fnname in functionTable)
        this.emit("callbuiltin", fnname);
      else {
        // TODO: This should probably be dynamic.
        if (!(fnname in this.userFunctions)) {
          throw new SyntaxError("Undefined function: " + fnname);
        }

        let fn = this.userFunctions[fnname];
        this.emit("pushscope");
        this.emit("storevar", fn.arg);
        this.compileExpr(fn.body);
        this.emit("popscope");
      }
      break;

    default:
      throw new InternalError("Unexpected expr type " + expr.type);
    }
  },
};

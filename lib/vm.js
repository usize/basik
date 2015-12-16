"use strict";

const DEFAULT_TIME_SLICE = 1024;
const DEBUG = false;

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

  loadstr(ctx, addr) {
    ctx.stack.push(ctx.strings[addr]);
  },

  storestr(ctx, addr) {
    ctx.strings[addr] = ctx.stack.pop();
  },

  loadint(ctx, addr) {
    ctx.stack.push(ctx.ints[addr]);
  },

  storeint(ctx, addr) {
    ctx.ints[addr] = ctx.stack.pop();
  },

  loadreal(ctx, addr) {
    ctx.stack.push(ctx.reals[addr]);
  },

  storereal(ctx, addr) {
    ctx.reals[addr] = ctx.stack.pop();
  },

  swap(ctx) {
    const { stack } = ctx;
    const [a, b] = stack.splice(-2);
    stack.push(b, a);
  },

  // Flow control

  jump(ctx) {
    ctx.pc = ctx.stack.pop();
  },

  jumpif(ctx) {
    const newPC = ctx.stack.pop();
    const pred = ctx.stack.pop();

    if (pred)
      ctx.pc = newPC;
  },

  call(ctx) {
    ctx.callStack.push(ctx.pc);
    ctx.pc = ctx.stack.pop();
  },

  return(ctx) {
    ctx.pc = ctx.callStack.pop();
  },

  callbuiltin(ctx, name) {
    const arg = ctx.stack.pop();

    ctx.stack.push(functionTable[name](arg));
  },

  for(ctx, addr) {
    const step = ctx.stack.pop();
    const target = ctx.stack.pop();
    const value = ctx.stack.pop();

    ctx.forStack.push({
      addr,
      step,
      target,
      pc: ctx.pc,
      oldValue: ctx.reals[addr],
    });

    ctx.reals[addr] = value;
  },

  next(ctx, addr) {
    let { forStack } = ctx;

    function pop() {
      let frame = forStack.pop();
      ctx.reals[frame.addr] = frame.oldValue;
    }

    let frame;
    do {
      if (frame)
        pop();

      frame = forStack[forStack.length - 1];
    } while (frame && frame.addr != addr);

    if (!frame)
      throw Error(`Invalid NEXT argument: ${ctx.program.reals.getName(addr)}: No matching FOR loop.`);

    if (ctx.reals[addr] == frame.target)
      pop();
    else {
      ctx.reals[addr] += frame.step;
      ctx.pc = frame.pc;
    }
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

  input(ctx, dataType) {
    let pc = ctx.pause();

    ctx.repl.basicInput(ctx.stack.pop(), dataType, val => {
      ctx.stack.push(val);
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

  pow(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(Math.pow(a, b));
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

function Context(repl, program, options = {}) {
  this.pc = 0;

  this.repl = repl;
  this.text = program.text;
  this.program = program;

  this.strings = [];
  this.ints = new Int16Array(program.ints.size);
  this.reals = new Float64Array(program.reals.size);

  this.callStack = [];
  this.forStack = [];
  this.stack = [];

  if (options.debug) {
    this.variables = Object.create(null);

    let forward = (prop, target, idx) => {
      Object.defineProperty(variables, prop, {
        enumerable: true,
        get() { return target[idx] },
        set(val) { target[idx] = val; },
      });
    }

    for (let data of program.strings.values())
      forward(data.name + "$", this.strings, data.index);

    for (let data of program.ints.values())
      forward(data.name + "%", this.ints, data.index);

    for (let data of program.reals.values())
      forward(data.name, this.reals, data.index);
  }

  this.paused = false;
  this.complete = false;

  this.schedule = options.schedule || (step => step());
  this.debug = options.debug;

  this.completed = new Promise((resolve, reject) => {
    this._completed = { resolve, reject };
  });

  this.runSlowly = this.runSlowly.bind(this);
}

Context.prototype = {
  runSlowly() {
    if (this.run())
      this.schedule(this.runSlowly);
    else if (this.complete)
      this._completed.resolve();
  },

  run(steps = DEFAULT_TIME_SLICE) {
    while (steps-- > 0) {
      if (this.paused || this.complete)
        return false;

      // Increment the PC *before* executing the instruction, since some
      // ops will change it.
      const pc = this.pc++;
      const instr = this.text[pc];

      if (DEBUG)
        console.log('Line ' + this.program.pcLine[pc],
                    'Statement ' + this.program.pcStatement[pc],
                    `PC=0x${pc.toString(16)}`,
                    instr);
      OPS[instr.opcode](this, instr.argument);
    }

    return true;
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
    this.schedule(this.runSlowly);
  },
};

function Namespace() {
  this.map = new Map();
}

Namespace.prototype = {
  get size() { return this.map.size; },

  get(varName) {
    let key = varName.slice(0, 2).toUpperCase();

    let data = this.map.get(key);
    if (data) {
      if (data.name != varName) {
        basicPrint(`You are attempting to use the variable '${varName}',\n` +
                   `which is an alias for the existing variable '${data.name}'.\n` +
                   `This will go very badly for you.\nYou have been warned.\n\n`);
      }
    } else {
      data = { index: this.size, name: varName };
      this.map.set(key, data);
    }

    return data.index;
  },

  getName(index) {
    for (let data of this.map.values()) {
      if (data.index == index)
        return data.name;
    }
  },
};

function ByteCompiler(program, options = {}) {
  this.pc = null;
  this.program = program;

  this.reals = new Namespace();
  this.ints = new Namespace();
  this.strings = new Namespace();

  this.pcLine = [];
  this.pcStatement = [];
  this.text = [];
  this.statementAddr = Object.create(null);
  this.userFunctions = Object.create(null);

  this.instrument = options.instrument;

  this.linkOps = [];
  this.compile(program.statements);
  this.link();
}

ByteCompiler.prototype = {
  emit(opcode, argument) {
    this.pc = this.text.length;
    if (DEBUG) {
      this.pcLine[this.pc] = this.lineNumber;
      this.pcStatement[this.pc] = this.stmtNumber;
    }

    this.text.push({ opcode, argument });
  },

  linkOp() {
    this.linkOps.push(this.text[this.text.length - 1]);
  },

  link() {
    for (let op of this.linkOps)
      op.argument = this.statementAddr[op.argument];

    this.linkOps = null;
  },

  compile(statements) {
    for (let stmt of statements)
      this.compileStatement(stmt);

    this.emit("end");
  },

  compileStatement(stmt) {
    this.pc = this.text.length;
    this.lineNumber = stmt.lineNumber;
    this.stmtNumber = stmt.stmtNumber;
    this.statementAddr[stmt.stmtNumber] = this.pc;

    if (this.instrument)
      this.emit("sourceline", stmt.lineNumber);

    for (let cmd of stmt.commands) {
      switch (cmd.type) {
      case "Goto":
        this.emit("int16", cmd.stmtNumber);
        this.linkOp();
        this.emit("jump");
        break;

      case "GoSub":
        this.emit("int16", cmd.stmtNumber);
        this.linkOp();
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
        this.store(cmd.variable);
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
        this.emit("input", cmd.variable.dataType);
        this.store(cmd.variable);
        break;

      case "If":
        this.compileExpr(cmd.expr);
        this.emit("int16", cmd.stmtNumber);
        this.linkOp();
        this.emit("jumpif");
        break;

      case "For":
        let init = cmd.initExpr;

        this.compileExpr(init.expr);
        this.compileExpr(cmd.toExpr);
        if (cmd.stepExpr)
          this.compileExpr(cmd.stepExpr);
        else
          this.emit("int16", 1);

        this.emit("for", this.reals.get(init.variable.name));
        break;

      case "Next":
        this.emit("next", this.reals.get(cmd.stepVar));
        break;

      default:
        throw new SyntaxError("Invalid statement");
      }
    }
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
      this.load(expr);
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

        this.load(fn.arg);
        this.emit("swap");

        this.store(fn.arg);

        if (this.instrument)
          this.emit("sourceline", fn.lineNumber);

        this.compileExpr(fn.body);

        this.emit("swap");
        this.store(fn.arg);
      }
      break;

    default:
      throw new InternalError("Unexpected expr type " + expr.type);
    }
  },

  load(variable) {
    if (variable.dataType == "string")
      this.emit("loadstr", this.strings.get(variable.name));
    else if (variable.dataType == "int")
      this.emit("loadint", this.ints.get(variable.name));
    else
      this.emit("loadreal", this.reals.get(variable.name));
  },

  store(variable) {
    if (variable.dataType == "string")
      this.emit("storestr", this.strings.get(variable.name));
    else if (variable.dataType == "int")
      this.emit("storeint", this.ints.get(variable.name));
    else
      this.emit("storereal", this.reals.get(variable.name));
  },
};

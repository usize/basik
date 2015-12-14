"use strict";

const DEFAULT_TIME_SLICE = 16;

const OPS = {
  // TODO: Applesoft BASIC automatically converts ints to reals
  // sometimes. Should we truncate, or convert to double, on overflow?

  add(ctx) {
    const a = stack.pop();
    const b = stack.pop();
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

  int16(ctx, val) {
    ctx.stack.push(val);
  },

  string(ctx, val) {
    ctx.stack.push(val);
  },

  loadvar(ctx, name) {
    ctx.stack.push(ctx.variables[name]);
  },

  storevar(ctx, name) {
    ctx.variables[name] = ctx.stack.pop();
  },

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
    ctx.pc = ctx.statementAddr[ctx.stack.pop()];
  },

  return(ctx) {
    ctx.pc = ctx.callStack.pop();
  },

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

  end(ctx) {
    ctx.complete = true;
    ctx.repl.basicPrint('\n\nfin.');
  },

  not(ctx) {
    const exprR = ctx.stack.pop();

    ctx.stack.push(!exprR);
  },

  neg(ctx) {
    const exprR = ctx.stack.pop();

    ctx.stack.push(-exprR);
  },

  pos(ctx) {
    const exprR = ctx.stack.pop();

    ctx.stack.push(+exprR);
  },


  add(ctx) {
    const exprR = ctx.stack.pop();
    const exprL = ctx.stack.pop();

    ctx.stack.push((exprL + exprR));
  },

  sub(ctx) {
    const exprR = ctx.stack.pop();
    const exprL = ctx.stack.pop();

    ctx.stack.push(exprL - exprR);
  },

  mul(ctx) {
    const exprR = ctx.stack.pop();
    const exprL = ctx.stack.pop();

    ctx.stack.push(exprL * exprR);
  },

  div(ctx) {
    const exprR = ctx.stack.pop();
    const exprL = ctx.stack.pop();

    ctx.stack.push(exprL / exprR);
  },

  mod(ctx) {
    const exprR = ctx.stack.pop();
    const exprL = ctx.stack.pop();

    ctx.stack.push(exprL % exprR);
  },

  and(ctx) {
    const exprR = ctx.stack.pop();
    const exprL = ctx.stack.pop();

    ctx.stack.push(exprL && exprR);
  },

  or(ctx) {
    const exprR = ctx.stack.pop();
    const exprL = ctx.stack.pop();

    ctx.stack.push(exprL || exprR);
  },

  lte(ctx) {
    const exprR = ctx.stack.pop();
    const exprL = ctx.stack.pop();

    ctx.stack.push(exprL <= exprR);
  },

  gte(ctx) {
    const exprR = ctx.stack.pop();
    const exprL = ctx.stack.pop();

    ctx.stack.push(exprL >= exprR);
  },

  lt(ctx) {
    const exprR = ctx.stack.pop();
    const exprL = ctx.stack.pop();

    ctx.stack.push(exprL < exprR);
  },

  gt(ctx) {
    const exprR = ctx.stack.pop();
    const exprL = ctx.stack.pop();

    ctx.stack.push(exprL > exprR);
  },

  noteq(ctx) {
    const exprR = ctx.stack.pop();
    const exprL = ctx.stack.pop();

    ctx.stack.push(exprL != exprR);
  },

  eq(ctx) {
    const exprR = ctx.stack.pop();
    const exprL = ctx.stack.pop();

    ctx.stack.push(exprL == exprR);
  },
};

function Context(repl, program) {
  this.pc = 0;

  this.repl = repl;
  this.text = program.text;

  this.callStack = [];
  this.stack = [];
  this.statementAddr = program.statementAddr;
  this.variables = Object.create(null);

  this.paused = false;
  this.complete = false;

  this.completed = new Promise((resolve, reject) => {
    this._completed = { resolve, reject };
  });
}

Context.prototype = {
  runSlowly(schedule = null) {
    if (schedule !== null)
      this.schedule = schedule;

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

      console.log(instr, this.pc, this.text);
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

function ByteCompiler(program) {
  this.pc = null;
  this.program = program;

  this.text = [];
  this.statementAddr = Object.create(null);
  this.pcMap = [];

  this.compile(program.statements);
}

ByteCompiler.prototype = {
  emit(opcode, argument) {
    this.text.push({ opcode, argument });
  },

  compile(statements) {
    for (let stmt of statements) {
      this.pc = this.text.length;
      this.pcMap[stmt.lineNumber] = this.pc;
      this.statementAddr[stmt.stmtNumber] = this.pc;

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
          // TODO
          // defineVariable(cmd.name, cmd, scopes);
          break;

        case "Return":
          this.emit("return");
          break;

        case "Next":
          // TODO
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
          // TODO
          break;

        default:
          throw new SyntaxError("Invalid statement");
        }
      }
    };
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
      // TODO
      break;

    default:
      throw new InternalError("Unexpected expr type " + expr.type);
    }
  },
};

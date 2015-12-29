"use strict"

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
      if (fnname in builtinFunctions)
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

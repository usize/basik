"use strict"

function ByteCompiler(program, options = {}) {
  this.pc = null;
  this.program = program;

  this.reals = new Namespace();
  this.ints = new Namespace();
  this.strings = new Namespace();
  this.arrays = new Namespace();

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
    for (var op of this.linkOps)
      op.argument = this.statementAddr[op.argument];

    this.linkOps = null;
  },

  compile(statements) {
    for (var stmt of statements)
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

    for (var cmd of stmt.commands) {
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

      case "ArrayAssign":
        this.compileExpr(cmd.exprR)
        var arrayDepth = cmd.args.length;
        for (var i = arrayDepth - 1; i >= 0; i--)
          this.compileExpr(cmd.args[i]);
        this.emit("int16", arrayDepth);
        this.emit("storearray", this.arrays.get(cmd.name));
        break;

      case "Print":
        for (var expr of cmd.exprs) {
          this.compileExpr(expr);
          this.emit("print");
        }
        if (cmd.println)
          this.emit("println");
        break;

      case "Input":
        // we may take in more than one input at a time
        this.emit("int16", cmd.variables.length);
        this.emit("string", cmd.message);
        this.emit("input", cmd.variables[0].dataType);
        for (var i = cmd.variables.length - 1; i >= 0; i--)
            this.store(cmd.variables[i]);
        break;

      case "If":
        this.compileExpr(cmd.expr);
        this.emit("int16", cmd.stmtNumber);
        this.linkOp();
        this.emit("jumpif");
        break;

      case "IfStmt":
        var textSizeOrig = this.text.length;
        var bytecodes = []
        // compile our statement then immediately move it
        // out of the program so that we can re-order it
        // this allows us to skip over the bytecodes
        // even though they come from the same line
        // as the predicate expression.
        this.compileStatement(cmd.stmt);
        while (this.text.length > textSizeOrig) {
          bytecodes.push(this.text[textSizeOrig]);
          this.text.splice(textSizeOrig, 1);
        }
        this.emit("int16", bytecodes.length);
        this.compileExpr(cmd.expr);
        this.emit("stmtif");
        // Add our statement back into the program
        this.text = this.text.concat(bytecodes);
        break;

      case "Data":
        for (var i in cmd.args)
          this.compileExpr(cmd.args[i]);
        this.emit("int16", cmd.args.length)
        this.emit("storedata");
        break;

      case "Read":
        this.emit("int16", cmd.args.length);
        this.emit("loaddata")
        var args = cmd.args.reverse();
        for (var a in args)
          this.store(args[a]);
        break;

      case "Restore":
        this.emit("restoredata");
        break;

      case "For":
        var init = cmd.initExpr;

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

      case "Dim":
        var arrayDepth = cmd.args.length;
        for (var i = arrayDepth - 1; i >= 0; i--)
            this.compileExpr(cmd.args[i]);
        this.emit("int16", arrayDepth);
        this.store(cmd);
        break;

      default:
        throw new SyntaxError(`Invalid statement: ${cmd.type}`);
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

    case "ArrayAccess":
      var arrayDepth = expr.args.length;
      for (var i = arrayDepth - 1; i >= 0; i--)
        this.compileExpr(expr.args[i]);
      this.emit("int16", arrayDepth);
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

      var fnname = expr.fn.value;
      if (fnname in builtinFunctions)
        this.emit("callbuiltin", fnname);
      else {
        // TODO: This should probably be dynamic.
        if (!(fnname in this.userFunctions)) {
          throw new SyntaxError("Undefined function: " + fnname);
        }

        var fn = this.userFunctions[fnname];

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
      throw new InternalError(`Unexpected expr type: ${expr.type}`);
    }
  },

  load(variable) {
    if (variable.dataType == "string")
      this.emit("loadstr", this.strings.get(variable.name));
     else if (variable.dataType == "int")
      this.emit("loadint", this.ints.get(variable.name));
     else if (variable.dataType == "array")
      this.emit("loadarray", this.arrays.get(variable.name));
     else
      this.emit("loadreal", this.reals.get(variable.name));
  },

  store(variable) {
    if (variable.dataType == "string")
      this.emit("storestr", this.strings.get(variable.name));
    else if (variable.dataType == "int")
      this.emit("storeint", this.ints.get(variable.name));
    else if (variable.dataType == "real")
      this.emit("storereal", this.reals.get(variable.name));
    else if (variable.dataType == "arraystring")
      this.emit("createarraystr", this.arrays.get(variable.name));
    else if (variable.dataType == "arrayint")
      this.emit("createarrayint", this.arrays.get(variable.name));
    else if (variable.dataType == "arrayreal")
      this.emit("createarrayreal", this.arrays.get(variable.name));
  },
};

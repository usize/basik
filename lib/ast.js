"use strict"

function Program(statements) {
  this.statements = statements;
  this.stmtNumberToIndex = {};
  this.indexToStmtNumber = {};
}

function Statement(lineNumber, stmtNumber, commands) {
  this.type = "Statement";
  this.lineNumber = lineNumber;
  this.stmtNumber = stmtNumber;
  this.stmtIndex = undefined;
  this.commands = commands;
}

function Goto(stmtNumber) {
  this.type = "Goto";
  this.stmtNumber = stmtNumber;
  this.targetIndex = undefined;
}

function GoSub(stmtNumber, returnNumber) {
  this.type = "GoSub";
  this.stmtNumber = stmtNumber;
  this.returnNumber = returnNumber;
  this.targetIndex = undefined;
}

function Def(name, arg, body) {
  this.type = "Def";
  this.name = name;
  this.arg = arg;
  this.body = body;
}

function Return() {
  this.type = "Return";
}

function Next(stepVar) {
  this.type = "Next";
  this.stepVar = stepVar;
}

function End() {
  this.type = "End";
}

function Data(args) {
  this.type = "Data";
  this.args = args;
}

function Read(args) {
  this.type = "Read";
  this.args = args;
}

function Restore() {
  this.type = "Restore";
}

function Let(variable, expr) {
  this.type = "Let";
  this.variable = variable;
  this.expr = expr;
}

function Print(exprs, println) {
  this.type = "Print";
  this.exprs = exprs;
  this.println = println;
}

function Input(variables, message) {
  this.type = "Input";
  this.message = message || "";
  this.variables = variables;
}

function If(expr, stmtNumber) {
  this.type = "If";
  this.expr = expr;
  this.stmtNumber = stmtNumber;
  this.targetIndex = undefined;
}

/**
 * args: {
 *  initExpr: {},
 *  toExpr: {},
 *  stepExpr: {},
 *  trueTarget: int,
 *  falseTarget: int,
 *  nextVar: Variable
 * }
 **/
function For(args) {
  this.type = "For";
  this.initExpr = args.initExpr;
  this.toExpr = args.toExpr;
  this.stepExpr = args.stepExpr;
  this.trueTarget = args.trueTarget;
  this.falseTarget = args.falseTarget;
  this.nextVar = args.nextVar;
  this.stepValue = 1; // The default
}

function Variable(variable) {
  this.type = "Variable";
  this.variable = variable;

  this.fullName = variable.value;

  if (this.fullName.endsWith("$")) {
    this.suffix = "$";
    this.dataType = "string";
    this.name = this.fullName.slice(0, -1);
  } else if (this.fullName.endsWith("%")) {
    this.suffix = "%";
    this.dataType = "int";
    this.name = this.fullName.slice(0, -1);
  } else {
    this.suffix = "";
    this.dataType = "real";
    this.name = this.fullName;
  }

  this.key = this.name.slice(0, 2).toUpperCase();
  this.fullKey = this.key + this.suffix;
}


function Dim(name, args) {
  this.type = "Dim";
  // arrays have the same data types as variables
  // so we can just reuse the parsing logic
  var variable = (new Variable(name));
  this.name = variable.name;
  this.dataType = "array" + variable.dataType;
  this.args = args;
};

function ArrayAssign(name, args, exprR) {
  this.type = "ArrayAssign";
  this.name = name.name;
  this.dataType = "array";
  this.args = args;
  this.exprR = exprR;
}
function ArrayAccess(name, args) {
  this.type = "ArrayAccess";
  var variable = (new Variable(name));
  this.name = variable.name;
  this.dataType = "array";
  this.args = args;
}

function UnaryOp(exprR, op) {
  this.type = "UnaryOp";
  this.exprR = exprR;
  this.op = op;
}

function BinOp(exprL, exprR, op) {
  this.type = "BinOp";
  this.exprL = exprL;
  this.exprR = exprR;
  this.op = op.value;
}

function Call(fn, arg) {
  this.type = "Call";
  this.fn = fn;
  this.arg = arg;
}

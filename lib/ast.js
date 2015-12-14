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

function Input(variable, message) {
  this.type = "Input";
  this.message = message || "";
  this.variable = variable;
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
}

function Variable(variable) {
  this.type = "Variable";
  this.variable = variable;
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

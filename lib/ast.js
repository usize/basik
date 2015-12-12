function Statement(stmtNumber, command) {
  this.type = "Statement";
  this.stmtNumber = stmtNumber;
  this.stmtIndex = undefined;
  this.command = command;
}

function Goto(stmtNumber) {
  this.type = "Goto";
  this.stmtNumber = stmtNumber;
  this.stmtIndex = undefined;
}

function Let(variable, expr) {
  this.type = "Let";
  this.variable = variable;
  this.expr = expr;
}

function Print(expr) {
  this.type = "Print";
  this.expr = expr;
}

function Input(variable) {
  this.type = "Input";
  this.variable = variable;
}

function If(expr, stmtNumber) {
  this.type = "If";
  this.expr = expr;
  this.stmtNumber = stmtNumber;
}

function Variable(variable) {
  this.type = "Variable";
  this.variable = variable;
}

function UnaryMinus(expr) {
  this.type = "UnaryMinus";
  this.expr = expr;
}

function Not(expr) {
  this.type = "Not";
  this.expr = expr;
}

function BinOp(exprL, exprR, op) {
  this.exprL = exprL;
  this.exprR = exprR;
  this.op = op;
};
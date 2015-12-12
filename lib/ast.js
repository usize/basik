function Statement(stmtNumber, command) {
  this.stmtNumber = stmtNumber;
  this.stmtIndex = undefined;
  this.command = command;
}

function Goto(stmtNumber) {
  this.stmtNumber = stmtNumber;
  this.stmtIndex = undefined;
}

function Let(variable, expr) {
  this.variable = variable;
  this.expr = expr;
}

function Print(expr) {
  this.expr = expr;
}

function Input(variable) {
  this.variable = variable;
}

function If(expr, stmtNumber) {
  this.expr = expr;
  this.stmtNumber = stmtNumber;
}

function Variable(variable) {
  this.variable = variable;
}

function UnaryMinus(expr) {
  this.expr = expr;
}

function Not(expr) {
  this.expr = expr;
}

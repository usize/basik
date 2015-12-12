function parseExpression(ctx) {
  var token = ctx.next();
  switch (token.name) {
    case "INT":
      return parseInt(token.value, 10);

    case "VARIABLE":
      return new Variable(token);

    case "STRING":
      return token.value;

    case "SUB":
      var expr = parseExpression(ctx);
      return UnaryMinus(expr);

    case "NOT":
      var expr = parseExpression();
      return Not(expr);

    case "L_PAR":
      var expr = parseExpression(ctx);
      ctx.matchName("R_PAR");
      return expr;

      // TODO: Expression Binary_Op Expression
  }
}

function parseCommand(ctx) {
  var token = ctx.next();
  switch (token.name) {
    case "GOTO":
      var tok = ctx.matchName("INT");
      return new Goto(parseInt(tok.value, 10));

    case "LET":
      var variable = ctx.matchName("VARIABLE");
      ctx.matchBinOp("ASSIGN");
      var expr = parseExpression(ctx);
      return new Let(variable, expr);

    case "PRINT":
      var expr = parseExpression(ctx);
      return new Print(expr);

    case "INPUT":
      var variable = ctx.matchName("VARIABLE");
      return new Input(variable);

    case "IF":
      var expr = parseExpression(ctx);
      ctx.matchName("THEN");
      var int = ctx.matchName("INT");
      return new If(expr, parseInt(int, 10));

    default:
      throw new Error("Error at line " +
                      token.line +
                      ": unexpected token " +
                      JSON.stringify(token));
  }
}

function parseLine(ctx) {
  var tok = ctx.matchName("STMTNO");
  var stmtNumber = parseInt(tok.value, 10);
  var cmd = parseCommand(ctx);
  return new Statement(stmtNumber, cmd);
}

function parseProgram(ctx, statements) {
  while (ctx.peek()) {
    statements.push(parseLine(ctx));
  }

  return statements;
}

function ParserContext(tokens) {
  this.tokens = tokens;
  this.index = 0;
}

ParserContext.prototype.peek = function () {
  return this.tokens[this.index];
};

ParserContext.prototype.matchName = function (name) {
  var token = this.tokens[this.index];
  if (!token) {
    throw new Error("Unexpected EOF!");
  }

  this.index++;
  if (token.name !== name) {
    throw new Error("Error at line " +
                    token.lineNumber +
                    ": expected a " +
                    name +
                    " token, found " +
                    JSON.stringify(token));
  }

  return token;
};

ParserContext.prototype.matchBinOp = function (op) {
  var tok = this.matchName("BINOP");
  if (tok.value !== op) {
    throw new Error("Error at line " +
                    tok.line +
                    ": expected " +
                    op + ", found " +
                    JSON.stringify(tok));
  }

  return tok;
};

ParserContext.prototype.next = function () {
  var tok = this.tokens[this.index];
  this.index++;
  return tok;
};

function parse(tokens) {
  var ctx = new ParserContext(tokens);
  return parseProgram(ctx, []);
}

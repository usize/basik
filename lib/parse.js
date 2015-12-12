BINOPS_PRIORITY = {
  'ASSIGN': 3,

  'AND': 5,
  'OR': 5,

  'LT': 6,
  'LTE': 6,
  'GT': 6,
  'GTE': 6,

  'SUB': 8,
  'ADD': 8,

  'DIV': 9,
  'MUL': 9,
  'MOD': 9,
};

function parseTerm(ctx) {
  var token = ctx.next();
  switch (token.name) {
    case "INT":
      var value = parseInt(token.value, 10);
      if (value != value & 0xffff)
        throw "bad number range";
      return value;

    case "VARIABLE":
      if (ctx.peek() && ctx.peek().name == "L_PAR") {
          ctx.next();
          var expr = parseExpression(ctx);
          ctx.matchName("R_PAR");
          return new Call(token, expr);
      }
      return new Variable(token);

    case "STRING":
      return token.value;

    case "SUB":
      var expr = parseExpression(ctx);
      return UnaryMinus(expr);

    case "NOT":
      return Not(parseExpression());

    case "L_PAR":
      var expr = parseExpression(ctx);
      ctx.matchName("R_PAR");
      return expr;

    default:
      throw new Error("Error at line " +
                      token.lineNumber +
                      ": unexpected token " +
                      JSON.stringify(token));
  }
}

function parseExpression(ctx) {
  var exprList = [];
  var binOps = [];
  for (;;) {
    exprList.push(parseTerm(ctx));

    var tokenNext = ctx.peek();
    if (tokenNext && tokenNext.name == 'BINOP') {
      while (binOps.length >= 1 &&
             BINOPS_PRIORITY[binOps[binOps.length-1].value] >=
             BINOPS_PRIORITY[tokenNext.value]) {
        var b = exprList.pop();
        var a = exprList.pop();
        exprList.push(new BinOp(a, b, binOps.pop()));
      }
      binOps.push(tokenNext);
      ctx.next();
    } else {
      while (binOps.length) {
        var b = exprList.pop();
        var a = exprList.pop();
        exprList.push(new BinOp(a, b, binOps.pop()));
      }
      return exprList[0];
    }
  }
}

function parseCommand(ctx) {
  var token = ctx.next();
  switch (token.name) {
    case "GOTO":
      var tok = ctx.matchName("INT");
      return new Goto(parseInt(tok.value, 10));

    case "GOSUB":
      var stmt = ctx.matchName("INT");
      return new GoSub(parseInt(stmt.value, 10), stmt.lineNumber);

    case "RETURN":
      return new Return();

    case "END":
      return new End();

    case "LET":
      var variable = ctx.matchName("VARIABLE");
      ctx.matchBinOp("ASSIGN");
      var expr = parseExpression(ctx);
      return new Let(variable, expr);

    case "VARIABLE":
      ctx.matchBinOp("ASSIGN");
      var expr = parseExpression(ctx);
      return new Let(token, expr);

    case "PRINT":
      var exprs = [];
      // Only try to parse an expression if there's anything else on this line.
      if (ctx.peek() && ctx.peek().lineNumber == token.lineNumber) {
        exprs.push(parseExpression(ctx));
        while (ctx.peek() && ctx.peek().name == "SEMICOLON") {
          ctx.next();
          exprs.push(parseExpression(ctx));
        }
      }
      return new Print(exprs);

    case "INPUT":
      var variable = ctx.matchName("VARIABLE");
      return new Input(variable);

    case "IF":
      var expr = parseExpression(ctx);
      ctx.matchName("THEN");
      var int = ctx.matchName("INT").value;
      return new If(expr, parseInt(int, 10));

    default:
      throw new Error("Error at line " +
                      token.lineNumber +
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

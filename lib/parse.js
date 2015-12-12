BINOPS_PRIORITY = {
  'SUB': 0,
  'ADD': 0,
  'DIV': 1,
  'MUL': 2,
};

function parseExpression(ctx) {
  var token = ctx.next();
  var exprList = [];
  var binOps = [];
  for (;;) {
    switch (token.name) {
      case "INT":
        exprList.push(parseInt(token.value, 10));
        break;

      case "VARIABLE":
        exprList.push(new Variable(token));
        break;

      case "STRING":
        exprList.push(token.value);
        break;

      case "SUB":
        var expr = parseExpression(ctx);
        exprList.push(UnaryMinus(expr));
        break;

      case "NOT":
        var expr = parseExpression();
        exprList.push(Not(expr));
        break;

      case "L_PAR":
        var expr = parseExpression(ctx);
        ctx.matchName("R_PAR");
        exprList.push(expr);
        break;

      default:
        throw new Error("Error at line " +
                        token.line +
                        ": unexpected token " +
                        JSON.stringify(token));
    }

    tokenNext = ctx.peek();
    if (tokenNext && tokenNext.name == 'BINOP') {
      while (binOps.length >= 1 &&
             BINOPS_PRIORITY[binOps[binOps.length-1]] >=
             BINOPS_PRIORITY[tokenNext]) {
        var b = exprList.pop();
        var a = exprList.pop();
        exprList.push(new BinOp(a, b, binOps.pop()));
      }
      binOps.push(tokenNext);
      ctx.next();
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
      var int = ctx.matchName("INT").value;
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
  try {
    return parseProgram(ctx, []);
  } catch (e) {
    console.log(e);
  }
}

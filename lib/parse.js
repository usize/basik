"use strict";

var BINOPS_PRIORITY = {
  'EQ': 3,

  'OR': 4,
  'AND': 5,

  'LT': 6,
  'LTE': 6,
  'GT': 6,
  'GTE': 6,
  'NOTEQ': 6,

  'SUB': 8,
  'ADD': 8,

  'DIV': 9,
  'MUL': 9,
  'MOD': 9,

  'POW': 10
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

    case "UNOP":
      var expr = parseTerm(ctx);
      return new UnaryOp(expr, token.value);

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

    case "DEF":
      var name = ctx.matchName("VARIABLE");
      ctx.matchName("L_PAR");
      var arg = ctx.matchName("VARIABLE");
      ctx.matchName("R_PAR");
      ctx.matchBinOp("EQ");
      var body = parseExpression(ctx);
      return new Def(name.value, arg.value, body);

    case "RETURN":
      return new Return();

    case "NEXT":
      // will specify a value to be incremented
      var stepVar = ctx.matchName("VARIABLE");
      return new Next(stepVar.value);

    case "END":
      return new End();

    case "DIM":
      /* memory allocation builtin, just skip it */
      while (ctx.peek().lineNumber == token.lineNumber) {
        ctx.next();
      }
      return;

    case "LET":
      var variable = ctx.matchName("VARIABLE");
      ctx.matchBinOp("EQ");
      var expr = parseExpression(ctx);
      return new Let(variable, expr);

    case "VARIABLE":
      if (ctx.peek() && ctx.peek().name == "L_PAR") {
          ctx.next();
          var expr = parseExpression(ctx);
          ctx.matchName("R_PAR");
          return new Call(token, expr);
      }
      ctx.matchBinOp("EQ");
      var expr = parseExpression(ctx);
      return new Let(token, expr);

    case "PRINT":
      var exprs = [];
      var println = true;

      // Only try to parse an expression if there's anything else on this line.
      while (ctx.peek() && ctx.peek().lineNumber == token.lineNumber && ctx.peek().name != "COLON") {
        exprs.push(parseExpression(ctx));
        if (ctx.peek() && ctx.peek().lineNumber == token.lineNumber && ctx.peek().name == "SEMICOLON") {
          ctx.next();
          println = true;
        } else {
          println = true;
          break;
        }
      }
      return new Print(exprs, println);

    case "INPUT":
      var message = "";
      if (ctx.peek().name == "STRING")
        message = ctx.matchName("STRING").value;
      if (ctx.peek().name == "SEMICOLON")
        ctx.next();
      var variable = ctx.matchName("VARIABLE");
      return new Input(variable, message);

    case "IF":
      var expr = parseExpression(ctx);
      ctx.matchName("THEN");
      var int = ctx.matchName("INT").value;
      return new If(expr, parseInt(int, 10));

    case "FOR":
      var initExpr = parseExpression(ctx);
      var trueTarget = token.lineNumber;
      ctx.matchName("TO");
      var toExpr = parseExpression(ctx);
      var stepExpr;
      if (ctx.peek().name == "STEP") {
        ctx.next();
        stepExpr = parseExpression(ctx);
      }
      // find the end of for's the code block
      var rewind = 0;
      while (ctx.peek().name != "NEXT") {
        ctx.next();
        rewind++;
      }
      ctx.next();
      rewind++;
      var nextVar = ctx.matchName("VARIABLE");
      rewind++;
      // we'll want to backup the lexer
      ctx.index -= rewind;
      var falseTarget = nextVar.lineNumber;
      return new For({
        initExpr,
        toExpr,
        stepExpr,
        trueTarget,
        falseTarget,
        nextVar
      });

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
  var commands = [];
  if (!ctx.peek() || ctx.peek().lineNumber != tok.lineNumber)
    throw new Error(`Error at line ${tok.lineNumber}: nothing on line`);
  if (ctx.peek().name != "REM") {
    for (;;) {
      var cmd = parseCommand(ctx);
      commands.push(cmd);
      var nextToken = ctx.peek();
      if (!nextToken || nextToken.lineNumber != tok.lineNumber || nextToken.name != "COLON")
        break;
      ctx.matchName("COLON");
    }
  }
  if (ctx.peek() && ctx.peek().name == "REM") {
    ctx.next();
  }
  if (ctx.peek() && ctx.peek().lineNumber == tok.lineNumber) {
    throw new Error(`Error at line ${tok.lineNumber}: unexpected extra stuff on line: ${JSON.stringify(ctx.peek())}`);
  }
  return new Statement(tok.lineNumber, stmtNumber, commands);
}

function parseProgram(ctx, statements) {
  while (ctx.peek()) {
    statements.push(parseLine(ctx));
  }

  return new Program(statements);
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

/* Evaluate a program */
function startEvaluation(program) {
  var pc = 0;
  var vars = {};

  var step = () => {
    var stmt = program[pc];
    if (!stmt) {
      return;
    }
    console.log(stmt.stmtNumber, stmt);
    var command = stmt.command;
    pc++;

    if (command.type == "Goto") {
      pc = command.targetIndex;
    } else if (command.type == "Let") {
      vars[command.variable] = evaluateExpression(command.expr, vars);
    } else if (command.type == "Print") {
      basicPrint(evaluateExpression(command.expr, vars) + "\n");
    } else if (command.type == "Input") {
      var str = window.prompt("INPUT", "10");
      // if it parses as an int, use an int
      val = parseInt(str);
      if (isNaN(val)) {
        vars[command.variable] = str;
      } else {
        vars[command.variable] = val;
      }
    } else if (command.type == "Rem") {
    } else if (command.type == "If") {
      if (evaluateExpression(command.expr, vars)) {
        pc = command.targetIndex;
      }
    } else {
      basicPrint("INVALID STATEMENT");
      return;
    }

    setTimeout(step, 1);
  };
  setTimeout(step, 1);
}

function evaluateExpression(expr, vars) {
  if (typeof(expr) == "string" || typeof(expr) == "number") {
      return expr;
  }
  if (expr.type == "Variable") {
    return vars[expr.variable];
  }
  if (expr.type == "UnaryMinus") {
    return -evaluateExpression(expr.expr, vars);
  }
  if (expr.type == "Not") {
    return !evaluateExpression(expr.expr, vars);
  }
  if (expr.type == "BinOp") {
    return {
     'ADD': (exprL, exprR) => (exprL + exprR) << 16 >> 16,
     'SUB': (exprL, exprR) => (exprL - exprR) << 16 >> 16,
     'MUL': (exprL, exprR) => (exprL * exprR) << 16 >> 16,
     'DIV': (exprL, exprR) => (exprL / exprR) | 0,
     'MOD': (exprL, exprR) => (exprL % exprR) | 0,
     'AND': (exprL, exprR) => exprL & exprR,
     'LTE': (exprL, exprR) => exprL <= exprR,
     'GTE': (exprL, exprR) => exprL >= exprR,
     'LT': (exprL, exprR) => exprL < exprR,
     'GT': (exprL, exprR) => exprL > exprR,
     'NOTEQ': (exprL, exprR) => exprL != exprR,
     'EQ': (exprL, exprR) => exprL == exprR,
    }[expr.op.value](evaluateExpression(expr.exprL, vars),
                     evaluateExpression(expr.exprR, vars));
  }
}

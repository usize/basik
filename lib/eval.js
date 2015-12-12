/* Evaluate a program */
function startEvaluation(program, scheduler) {
  var pc = 0;
  var returnStack = [];
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
    } else if (command.type == "GoSub") {
      pc = command.targetIndex;
      returnStack.push(command.returnNumber);
    } else if (command.type == "Return") {
      pc = returnStack.pop();
    } else if (command.type == "End") {
      pc = program.length;
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

    scheduler(step, pc);
  };

  scheduler(step, pc);
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
     'ADD': (exprL, exprR) => (exprL + exprR),
     'SUB': (exprL, exprR) => (exprL - exprR),
     'MUL': (exprL, exprR) => (exprL * exprR),
     'DIV': (exprL, exprR) => (exprL / exprR),
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
  if (expr.type == "Call") {
    var fnname = expr.fn.value;
    if (!functionTable.hasOwnProperty(fnname))
      throw new Error("Error on line " + expr.fn.lineNumber + ": no function named " + fnname);
    return functionTable[fnname](evaluateExpression(expr.arg, vars));
  }
  throw new Error("internal error: unexpected expr type " + expr.type);
}

var functionTable = {
  "TAB": n => Array(n + 1).join(" ")
};

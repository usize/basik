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
}

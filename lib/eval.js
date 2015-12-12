/* Evaluate a program */
function startEvaluation(program) {
  var pc = 0;
  var vars = {};

  var step = () => {
    var stmt = program[pc];
    if (!stmt) {
      return;
    }
    var command = stmt.command;
    pc++;

    if (command instanceof Goto) {
      pc = command.targetIndex;
    } else if (command instanceof Let) {
      vars[command.variable] = evaluateExpression(command.expr, vars);
    } else if (command instanceof Print) {
      basicPrint(evaluateExpression(command.expr, vars) + "\n");
    } else if (command instanceof Input) {
      throw new Error("INPUT not supported yet");
    //} else if (command instanceof Rem) {
    } else if (command instanceof If) {
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

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
      throw "not supported yet"
    } else if (command instanceof Rem) {
    } else if (command instanceof If) {
      if (evaluteStatement(command.expr)) {
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
  if (expr instanceof UnaryOp) {
  }
  if (expr instanceof BinaryOp) {
  }
  if (expr instanceof BinaryOp) {
  }
}

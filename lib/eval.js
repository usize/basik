/* scope aware variable helpers */
function defineVariable(key, value, scopes) {
  scopes[Math.max(scopes.length - 1, 0)][key] = value;
}

/* lexical/static resolver TODO: make this dynamic */
function lookupVariable(key, scopes) {
  var currentLevel = Math.max(scopes.length - 1, 0);
  var value = scopes[currentLevel][key];
  while ((value === undefined) && currentLevel > 0) {
    currentLevel--;
    value = scopes[currentLevel][key];
  }
  return value;
}

/* Evaluate a program */
function startEvaluation(program, scheduler) {
  var pc = 0;
  var returnStack = [];
  var scopes = [{}];

  var step = () => {
    var stmt = program.statements[pc];
    if (!stmt) {
      return;
    }
    console.log(stmt.stmtNumber, stmt);
    pc++;

    for (var command of stmt.commands) {
      if (command.type == "Goto") {
        pc = command.targetIndex;
      } else if (command.type == "GoSub") {
        pc = command.targetIndex;
        returnStack.push(command.returnNumber);
      } else if (command.type == "Def") {
        defineVariable(command.name, command, scopes);
      } else if (command.type == "Return") {
        pc = returnStack.pop();
      } else if (command.type == "End") {
        pc = program.length;
      } else if (command.type == "Let") {
        defineVariable(command.variable.value, evaluateExpression(command.expr, scopes), scopes);
      } else if (command.type == "Print") {
        for (var expr of command.exprs)
          basicPrint(evaluateExpression(expr, scopes));
        if (command.println)
          basicPrint("\n");
      } else if (command.type == "Input") {
        var str = window.prompt(command.message, "");
        // if it parses as an int, use an int
        val = parseInt(str);
        if (isNaN(val)) {
          defineVariable(command.variable.value, str, scopes);
        } else {
          defineVariable(command.variable.value, val, scopes);
        }
      } else if (command.type == "If") {
        if (evaluateExpression(command.expr, scopes)) {
          pc = command.targetIndex;
        }
      } else {
        basicPrint("INVALID STATEMENT");
        return;
      }
    }

    var lineNumber = program.statements[pc] ? program.statements[pc].lineNumber - 1 : null;
    scheduler(step, program.indexToStmtNumber[pc], vars, lineNumber);
  };

  var lineNumber = program.statements[pc] ? program.statements[pc].lineNumber - 1 : null;
  scheduler(step, program.indexToStmtNumber[pc], vars, lineNumber);
}

function evaluateExpression(expr, scopes) {
  if (typeof(expr) == "string" || typeof(expr) == "number") {
      return expr;
  }
  if (expr.type == "Variable") {
    return lookupVariable(expr.variable.value, scopes);
  }
  if (expr.type == "UnaryMinus") {
    return -evaluateExpression(expr.expr, scopes);
  }
  if (expr.type == "Not") {
    return !evaluateExpression(expr.expr, scopes);
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
     'ASSIGN': (exprL, exprR) => defineVariable(exprL, exprR, scopes),
    }[expr.op.value](evaluateExpression(expr.exprL, scopes),
                     evaluateExpression(expr.exprR, scopes));
  }
  if (expr.type == "Call") {
    var fnname = expr.fn.value;
    var userFunc = lookupVariable(fnname, scopes);
    var result;
    // set up scope
    scopes.push({});
    if (functionTable.hasOwnProperty(fnname)) {
      // native function call
      result = functionTable[fnname](evaluateExpression(expr.arg, scopes));
    } else if (userFunc) {
      defineVariable(userFunc.arg, evaluateExpression(expr.arg, scopes), scopes);
      result = evaluateExpression(userFunc.body, scopes);
    } else {
      scopes.pop();
      throw new Error("Error on line " + expr.fn.lineNumber + ": no function named " + fnname);
    }
    scopes.pop();
    return result;
  }
  throw new Error("internal error: unexpected expr type " + expr.type);
}

var functionTable = {
  TAB: n => Array(n + 1).join(" "),
  INT: n => Math.floor(n),
};

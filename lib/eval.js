"use strict";

/* scope aware variable helpers */
function defineVariable(key, value, scopes) {
  scopes[Math.max(scopes.length - 1, 0)][key] = value;
}

/* lexical/static resolver TODO: add a dynamic resolver */
function lookupVariable(key, scopes) {
  var currentLevel = Math.max(scopes.length - 1, 0);
  var value = scopes[currentLevel][key];
  while ((value === undefined) && currentLevel > 0) {
    currentLevel--;
    value = scopes[currentLevel][key];
  }
  return value;
}

/* Flatten scopes into a single object */
function flattenScopes(scopes) {
  if (scopes.length <= 1)
    return scopes[0];

  var result = {};
  for (var obj of scopes) {
    for (var attrname in obj) { result[attrname] = obj[attrname]; }
  }
  return result;
}

/* Evaluate a program */
function startEvaluation(program, scheduler) {
  var pc = 0;
  var returnStack = [];
  var scopes = [{}];

  var step = (expNumber) => {
    var stmt = program.statements[pc];
    if (!stmt) {
      return;
    }
    console.log(stmt.stmtNumber, stmt);

    // If we have no expression number to continue at, increment the PC.
    // Otherwise, continue at the next command in the previous expression.
    if (expNumber === undefined) {
        pc++;
        expNumber = 0;
    }

    for (var [i, command] of stmt.commands.entries()) {
      if (i < expNumber)
        continue;

      if (command.type == "Goto") {
        pc = command.targetIndex;
      } else if (command.type == "GoSub") {
        pc = command.targetIndex;
        returnStack.push(command.returnNumber);
      } else if (command.type == "Def") {
        defineVariable(command.name, command, scopes);
      } else if (command.type == "Return" || command.type == "Next") {
        pc = returnStack.pop();
      } else if (command.type == "End") {
        pc = program.length;
      } else if (command.type == "Let") {
        defineVariable(command.variable.fullName, evaluateExpression(command.expr, scopes), scopes);
      } else if (command.type == "Dim") {
        var arrays = new Array(evaluateExpression(command.args.pop(), scopes));
        while (command.args.length) {
          arrays[arrays.length - 1].push(
            new Array(evaluateExpression(command.args.pop(), scopes)));
        }
        defineVariable(command.name, arrays, scopes);
      } else if (command.type == "DimAssign") {
        var dim = lookupVariable(command.name, scopes);
        dim[evaluateExpression(command.innerExpr)] = evaluateExpression(command.exprR, scopes);
      } else if (command.type == "Print") {
        for (var expr of command.exprs)
          basicPrint(evaluateExpression(expr, scopes));
        if (command.println)
          basicPrint("\n");
      } else if (command.type == "Input") {
        basicInput(command.message, command.variable.dataType, val => {
          defineVariable(command.variable.fullName, val, scopes);
          step(i + 1);
        });
        return;
      } else if (command.type == "If") {
        if (evaluateExpression(command.expr, scopes)) {
          pc = command.targetIndex;
        }
      } else if (command.type == "For") {
        // initialize (will always be a variable assignment)
        if (!command.initialized) {
          // We need scoping for nested loops
          scopes.push({});
          evaluateExpression(command.initExpr, scopes);
          command.initialized = true;
        }

        var currentValue = lookupVariable(command.nextVar.fullName, scopes);
        var stepValue = 1;

        if (currentValue < evaluateExpression(command.toExpr, scopes)) {
          returnStack.push(command.trueTarget - 1);
          pc = command.trueTarget;

          if (command.stepExpr !== undefined)
            stepValue = evaluateExpression(command.stepExpr, scopes)
          defineVariable(command.nextVar.fullName, currentValue + stepValue, scopes);

        } else {
          pc = command.falseTarget;
          command.initialized = false;
          scopes.pop({});
        }
      } else {
        basicPrint("INVALID STATEMENT");
        return;
      }
    }

    var lineNumber = program.statements[pc] ? program.statements[pc].lineNumber - 1 : null;
    scheduler(step, program.indexToStmtNumber[pc], scopes, lineNumber);
  };

  var lineNumber = program.statements[pc] ? program.statements[pc].lineNumber - 1 : null;
  scheduler(step, program.indexToStmtNumber[pc], flattenScopes(scopes), lineNumber);
}

var unaryOps = {
  'NOT': exprR => !exprR,
  'NEG': exprR => -exprR,
  'POS': exprR => +exprR,
};

var binaryOps = {
  'ADD': (exprL, exprR) => (exprL + exprR),
  'SUB': (exprL, exprR) => (exprL - exprR),
  'MUL': (exprL, exprR) => (exprL * exprR),
  'DIV': (exprL, exprR) => (exprL / exprR),
  'MOD': (exprL, exprR) => (exprL % exprR) | 0,
  'POW': Math.pow,
  'AND': (exprL, exprR) => exprL && exprR,
  'OR': (exprL, exprR) => exprL || exprR,
  'LTE': (exprL, exprR) => exprL <= exprR,
  'GTE': (exprL, exprR) => exprL >= exprR,
  'LT': (exprL, exprR) => exprL < exprR,
  'GT': (exprL, exprR) => exprL > exprR,
  'NOTEQ': (exprL, exprR) => exprL != exprR,
  'EQ': (exprL, exprR) => exprL == exprR,
};

function evaluateExpression(expr, scopes) {
  if (typeof(expr) == "string" || typeof(expr) == "number") {
      return expr;
  }
  if (expr.type == "Variable") {
    return lookupVariable(expr.fullName, scopes);
  }
  if (expr.type == "UnaryOp") {
    return unaryOps[expr.op](evaluateExpression(expr.exprR, scopes));
  }
  if (expr.type == "BinOp") {
    return binaryOps[expr.op](evaluateExpression(expr.exprL, scopes),
                              evaluateExpression(expr.exprR, scopes));
  }
  if (expr.type == "Let") {
      defineVariable(expr.variable.fullName,
                     evaluateExpression(expr.expr, scopes), scopes);
      return;
  }
  if (expr.type == "Call") {
    var result;
    var fnname = expr.fn.value;
    var userFunc = lookupVariable(fnname, scopes);
    if (functionTable.hasOwnProperty(fnname)) {
      // native function call
      result = functionTable[fnname](evaluateExpression(expr.arg, scopes));
    } else if (Array.isArray(userFunc)) {
      result = userFunc[evaluateExpression(expr.arg, scopes)];
    } else if (userFunc) {
      scopes.push({});
      defineVariable(userFunc.arg.fullName, evaluateExpression(expr.arg, scopes), scopes);
      result = evaluateExpression(userFunc.body, scopes);
      scopes.pop();
    } else {
      throw new Error("Error on line " + expr.fn.lineNumber + ": no function named " + fnname);
    }
    return result;
  }
  throw new Error("internal error: unexpected expr type " + expr.type);
}

var functionTable = {
  TAB: n => Array(n + 1).join(" "),
  INT: n => Math.floor(n),
};

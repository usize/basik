/* Compile a program */
//
// The following functions are used to compile the basic code into a JS function which do a for-switch where each statement line number is used as a case number.

var header = `
function run() {
function module(heap, builtins) {
  var print = builtins.print;
  var println = builtins.println;
  var input = builtins.input;
  function program(pc) {
    var pc = pc | 0;
`;
var varindent = `
    `;
var programHeader = `
    while (1) {
      switch (pc) {
`;
var caseindent = `
        `;
var stmtindent = `
          `;
var footer = `
        default: return;
      }
    }
  }

  function start() {
    program(0);
  }

  return { start: start };
}

  var strings = [];
  var heap = [];
`;

var runFooter = `
  var builtins = {
    print: function (value) {
      if (value < 0x10000)
        basicPrint(value);
      else
        basicPrint(strings[value - 0x10000]);
    },
    println: function () {
      basicPrint("\\n");
    },
    input: function () {
      var str = window.prompt("INPUT", "10");
      var value = parseInt(str, 10);
      if (isNaN(value)) {
        strings.push(str);
        value = strings.length - 1 + 0x10000;
      }
      return value;
    }
  };
  module(heap, builtins).start();
}
`;

function startCompilation(program) {
  var variables = computeVarBindings(program);
  var code = header;
  for (var n = 0; n < variables.numExprs; n++) {
    code += varindent + "var e"+ n +" = 0;"
  }
  code += programHeader;
  for (var pc = 0; pc < program.length; pc++) {
    code += caseindent + "case " + pc + ":";
    var stmt = program[pc];
    if (!stmt)
      continue;
    for (var command of stmt.commands) {
      switch (command.type) {
        case "Rem":
          break;
        case "Let":
          var {lastVar, exprCode} = compileExpression(0, command.expr, variables);
          code += exprCode;
          code += stmtindent + "heap[" + variables.bindings[command.variable.value] + "] = e" + lastVar + "|0;"
          break;
        case "Goto":
          code += stmtindent + "pc = " + command.targetIndex + ";"
          code += stmtindent + "break;";
          break;
        case "If":
          var {lastVar, exprCode} = compileExpression(0, command.expr, variables);
          code += exprCode;
          code += stmtindent + "if (e"+lastVar+") { pc = "+ command.targetIndex +"; break; }"
          break;
        case "Input":
          code += stmtindent + "heap["+ variables.bindings[command.variable.value] +"] = input()|0;"
          break;
        case "Print":
          command.exprs.forEach(function (expr) {
            var {lastVar, exprCode} = compileExpression(0, expr, variables);
            code += exprCode;
            code += stmtindent + "print(e"+ lastVar +");"
          });
          if (command.println)
            code += stmtindent + "println();"
          break;
        default:
          throw "INVALID STATEMENT";
          break;
      }
    }
    code += stmtindent + "pc += 1;";
    code += stmtindent + "break;";
  }

  code += footer;
  for (var i = 0; i < variables.stringsArray.length; i++) {
    code += `  strings.push("${variables.stringsArray[i]}");
`;
  }
  code += runFooter;
  return code;
}

function computeVarBindings(program) {
  var bindings = {};
  var num = 0;
  var numStrings = 0;
  var strings = {};
  var stringsArray = [];
  var numExprs = 0;
  for (var stmt of program) {
    if (!stmt)
      continue;
    for (var cmd of stmt.commands) {
      console.log("searching for strings in command: " + JSON.stringify(cmd));
      var exprs = [];
      if ("expr" in cmd) {
        exprs = [cmd.expr];
      } else if ("exprs" in cmd) {
        exprs = cmd.exprs;
      }
      for (var expr of exprs) {
        var numSubExprs = collectStrings(strings, stringsArray, expr);
        numExprs = Math.max(numExprs, numSubExprs);
      }
      if (cmd.type != "Let" && cmd.type != "Input")
        continue;
      if (!(cmd.variable in bindings)) {
        bindings[cmd.variable.value] = num++;
      }
    }
  }
  numStrings = stringsArray.length;
  return { bindings, strings, stringsArray, num, numStrings, numExprs }
}

function collectStrings(strings, strArray, expr) {
  var numExpr = 1;
  if (typeof(expr) == "string") {
    if (!(expr in strings)) {
      strings[expr] = strArray.length;
      strArray.push(expr);
    }
    return numExpr;
  }
  if (typeof(expr) == "number")
    return numExpr;
  if ("expr" in expr)
    numExpr += collectStrings(strings, strArray, expr.expr);
  if ("exprL" in expr)
    numExpr += collectStrings(strings, strArray, expr.exprL);
  if ("exprR" in expr)
    numExpr += collectStrings(strings, strArray, expr.exprR);
  return numExpr;
}

function compileExpression(lastVar, expr, variables) {
  var exprCode = "";
  if (typeof(expr) == "string") {
    var stringTag = 0x10000;
    var stringCode = stringTag + variables.strings[expr];
    exprCode = stmtindent + "e" + lastVar + " = " + stringCode +";";
  } else if (typeof(expr) == "number") {
    lastVar = lastVar++;
    exprCode = stmtindent + "e" + lastVar + " = " + expr +";";
  } else {
    switch (expr.type) {
      case "Variable":
        exprCode = stmtindent + "e" + lastVar +" = "+ "heap["+ variables.bindings[expr.variable.value] +"]|0;";
        break;
      case "UnaryMinus":
        var inner = compileExpression(lastVar, expr.expr, variables);
        lastVar = inner.lastVar + 1;
        exprCode += inner.exprCode;
        exprCode += stmtindent + "e" + lastVar +" = (-e"+ inner.lastVar + ")|0;";
        break;
      case "Not":
        var inner = compileExpression(lastVar, expr.expr, variables);
        lastVar = inner.lastVar + 1;
        exprCode += inner.exprCode;
        lastVar = lastVar++;
        exprCode += stmtindent + "e" + lastVar +" = (!e"+ inner.lastVar + ")|0;";
        break;
      case "BinOp":
        var lhs = compileExpression(lastVar, expr.exprL, variables);
        lastVar = lhs.lastVar + 1;
        exprCode += lhs.exprCode;
        var rhs = compileExpression(lastVar, expr.exprR, variables);
        lastVar = rhs.lastVar + 1;
        exprCode += rhs.exprCode;
        if (op == "POW") {
          exprCode += `${stmtindent}e${lastVar} = Math.pow(e${lhs.lastVar}, e${rhs.lastVar});`;
        } else {
          var op = {
            'ADD': '+', 'SUB': '-',
            'MUL': '*', 'DIV': '/'
          }[expr.op];
          exprCode += stmtindent + "e" + lastVar +" = (e"+ lhs.lastVar + op + "e" + rhs.lastVar + ");";
        }
        break;
    }
  }

  return {lastVar, exprCode};
}

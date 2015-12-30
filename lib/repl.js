"use strict"

var config = {
  inputId:  "input",
  outputId: "output"
};

var callables = [];
window.onmessage = trapErrors(event => {
  while (callables.length)
    callables.shift()();
});

function delay(callable) {
  callables.push(callable);
  window.postMessage("run-delayed-things", "*");
}

var basicOutput = '';
function basicPrint(value) {
  basicOutput += value;
  var outputElement = document.getElementById(config.outputId);
  outputElement.appendChild(document.createTextNode(value));
}

function basicInput(message, returnType, callback) {
  basicPrint(message || " ");

  var outputElement = document.getElementById(config.outputId);

  var inputElement = document.createElement("input");
  inputElement.className = "input-prompt";

  outputElement.appendChild(inputElement);
  inputElement.focus();

  inputElement.onkeypress = event => {
    if (event.keyCode != event.DOM_VK_RETURN)
      return;

    event.preventDefault();
    inputElement.blur();
    inputElement.onkeypress = null;
    inputElement.setAttribute("readonly", true);

    basicPrint("\n");

    var vals = inputElement.value.split(",");
    for (var i = 0; i < vals.length; i++) {
      if (returnType !== "string") {
        vals[i] = Number(vals[i]);
        if (returnType === "int" && !Number.isSafeInteger(vals[i]))
          vals[i] = NaN;

        if (isNaN(vals[i])) {
          basicInput("?REENTER ", returnType, callback);
          return;
        }
      }
    }
    callback(vals);
  };
}

function trapErrors(fn) {
  return (...args) => {
    try {
      return fn(...args);
    } catch (error) {
      basicPrint(error.toString() + "\n\n\n" + error.stack);
    }
  }
}

var basicEval = trapErrors(text => {
  var stmts = parse(lexer(text));
  stmts = orderProgram(stmts);
  console.log(JSON.stringify(stmts, null, 2));

  var tier = document.getElementById("interpret-or-compile").value;
  if (tier === "interpreter") {
    Debugger.hideControls();
    var compiler = new ByteCompiler(stmts);
    var context = new Context(window, compiler, { schedule: delay });
    context.runSlowly();
  } else if (tier === "debugger") {
    Debugger.showControls();
    var compiler = new ByteCompiler(stmts, { instrument: true });
    var context = new Context(window, compiler,
                              { schedule: delay,
                                debug: trapErrors(Debugger.schedule) });
    context.runSlowly();
  } else {
    Debugger.hideControls();
    var code = startCompilation(stmts);
    console.log(code.split(/\n/g).map((l, i) => i + "   " + l).join("\n"));
    eval(code + "; run();");
  }
});

function processInput() {
  basicOutput = '';
  document.getElementById(config.outputId).innerHTML = '';
  basicEval(document.getElementById(config.inputId).value);
}

document.getElementById("run").addEventListener("click", processInput, false);

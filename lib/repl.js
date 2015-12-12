var config = {
  inputId:  "input",
  outputId: "output"
};

function basicEval(text) {
  try {
    var stmts = parse(lexer(text));
    stmts = orderProgram(stmts);
    console.log(JSON.stringify(stmts, null, 2));

    var tier = document.getElementById("interpret-or-compile").value;
    if (tier === "interpreter") {
      Debugger.hideControls();
      startEvaluation(stmts, step => setTimeout(step, 1));
    } else if (tier === "debugger") {
      Debugger.showControls();
      startEvaluation(stmts, Debugger.schedule);
    } else {
      Debugger.hideControls();
      var code = startCompilation(stmts);
      console.log(code.split(/\n/g).map((l, i) => i + "   " + l).join("\n"));
      eval(code + "; run();");
    }
  } catch (error) {
    basicPrint(error.toString() + "\n\n\n" + error.stack);
  }
}

function processInput() {
  var result = basicEval(document.getElementById(config.inputId).value);
}

var basicOutput = '';
function basicPrint(value) {
  basicOutput += value;
  var outputElement = document.getElementById(config.outputId);
  outputElement.innerHTML = basicOutput;
}

document.getElementById("run").addEventListener("click", processInput, false);

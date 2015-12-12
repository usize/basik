var config = {
  inputId:  "input",
  outputId: "output"
};

function basicEval(text) {
  try {
    var stmts = parse(lexer(text));
    stmts = orderProgram(stmts);
    console.log(JSON.stringify(stmts, null, 2));
    startEvaluation(stmts);
    // Uncomment to run the code with the BASIC compiler.
    // eval(startCompilation(stmts) + "; run();");
  } catch (error) {
    console.log(error.toString() + "\n\n\n" + error.stack);
  }
};

function processInput() {
  var result = basicEval(document.getElementById(config.inputId).value);
};

var basicOutput = ''
function basicPrint(value) {
  basicOutput += value;
  var outputElement = document.getElementById(config.outputId);
  outputElement.innerHTML = basicOutput;
}

document.getElementById("run").addEventListener("click", processInput, false);

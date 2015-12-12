var config = {
  inputId:  "input",
  outputId: "output"
};

function basicEval(text) {
  try {
    var insts = parse(lexer(text));
    return JSON.stringify(insts, null, 2);
  } catch (error) {
    return error.toString() + "\n\n\n" + error.stack;
  }
};

function processInput() {
  var result = basicEval(document.getElementById(config.inputId).value);
  var outputElement = document.getElementById(config.outputId);
  outputElement.innerHTML = result;
};

document.getElementById("run").addEventListener("click", processInput, false);

var config = {
  inputId:  "input",
  outputId: "output"
};

function basicEval(text) {
  var insts = parse(lexer(text));
  return JSON.stringify(insts, null, 2);
};

function processInput() {
  var result = basicEval(document.getElementById(config.inputId).value);
  var outputElement = document.getElementById(config.outputId);
  outputElement.innerHTML = result;
};

document.getElementById("run").addEventListener("click", processInput, false);

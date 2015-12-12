const Debugger = {
  _getControls: function () {
    return document.getElementById("debugger-controls");
  },

  _getInput: function () {
    return document.getElementById("input");
  },

  showControls: function () {
    var controls = this._getControls();
    controls.style.display = "block";
    controls.addEventListener("submit", this._onSubmit, false);
    this._getInput().setAttribute("disabled", true);
  },

  hideControls: function () {
    var controls = this._getControls();
    controls.style.display = "none";
    controls.removeEventListener("submit", this._onSubmit, false);
    this._getInput().setAttribute("disabled", false);
  },

  _getPrompt: function () {
    return document.getElementById("debugger-prompt");
  },

  _getPromptText: function () {
    return this._getPrompt().value.trim();
  },

  _clearPromptText: function () {
    this._getPrompt().value = "";
  },

  _onSubmit: function (e) {
    e.preventDefault();
    var cmd = this._getPromptText();
    this._clearPromptText();
    this.runCmd(cmd);
  },

  STATE: "paused",
  _step: undefined,
  _pc: undefined,
  _vars: undefined,

  continue: function () {
    this.STATE = "running";
    this.schedule(this._step, this._pc, this._vars);
    return "Continuing..."
  },

  step: function () {
    setTimeout(() => this._step(), 1);
    return "Stepping...";
  },

  break: function (pc) {
    return "break is not yet implemented";
  },

  print: function (variable) {
    return variable + " = " + this._vars[variable];
  },

  runCmd: function (cmd) {
    var output;
    try {
      if (cmd === "continue") {
        output = this.continue();
      } else if (cmd === "step") {
        output = this.step();
      } else {
        var bits = cmd.split(/\s+/g);
        if (bits.length !== 2) {
          throw new Error("Bad debugger command: " + cmd);
        }

        if (bits[0] === "break") {
          output = this.break(bits[1]);
        } else if (bits[0] === "print") {
          output = this.print(bits[1]);
        } else {
          throw new Error("Bad debugger command: " + cmd);
        }
      }
    } catch (error) {
      output = error + "\n\n" + error.stack;
    }

    var el = document.getElementById("debugger-output");
    el.innerHTML = "";
    el.appendChild(document.createTextNode(output));
  },

  schedule: function (step, pc, vars) {
    this._step = step;
    this._pc = pc;
    this._vars = vars;

    switch (this.STATE) {
      case "paused":
        return;

      case "running":
        // TODO check for breakpoint on current pc
        setTimeout(step, 1);
        return;

      default:
        throw new Error("Unexpected Debugger.STATE: " + this.STATE);
    }
  }
};

for (let k of Object.keys(Debugger)) {
  if (typeof Debugger[k] === "function") {
    Debugger[k] = Debugger[k].bind(Debugger);
  }
}

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

  continue: function () {
    this.STATE = "running";
    this.schedule(this._step, this._pc);
  },

  step: function () {
    this._step();
  },

  break: function (pc) {
    TODO;
  },

  print: function (variable) {
    TODO;
  },

  runCmd: function (cmd) {
    if (cmd === "continue") {
      this.continue();
    } else if (cmd === "step") {
      this.step();
    } else {
      var bits = cmd.split(/\s+/g);
      if (bits.length !== 2) {
        throw new Error("Bad debugger command: " + cmd);
      }

      if (bits[0] === "break") {
        this.break(bits[1]);
      } else if (bits[0] === "print") {
        this.print(bits[1]);
      } else {
        throw new Error("Bad debugger command: " + cmd);
      }
    }
  },

  schedule: function (step, pc) {
    this._step = step;
    this._pc = pc;

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

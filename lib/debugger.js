const Debugger = {
  _getControls: function () {
    return document.getElementById("debugger-controls");
  },

  _getInput: function () {
    return document.getElementById("input");
  },

  _getGutter: function () {
    return document.getElementById("debugger-gutter");
  },

  showControls: function () {
    var controls = this._getControls();
    controls.style.display = "block";
    controls.addEventListener("submit", this._onSubmit, false);
    this._getInput().setAttribute("disabled", true);
    this._getGutter().style.display = "block";
  },

  hideControls: function () {
    var controls = this._getControls();
    controls.style.display = "none";
    controls.removeEventListener("submit", this._onSubmit, false);
    this._getInput().removeAttribute("disabled");
    this._getGutter().style.display = "none";
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

  _state: "paused",
  _step: undefined,
  _pc: undefined,
  _vars: undefined,
  _lineNumber: undefined,
  _breakpoints: {},

  continue: function () {
    this._state = "running";
    this.schedule(this._step, this._pc, this._vars, this._lineNumber);
    return "Continuing..."
  },

  step: function () {
    setTimeout(() => this._step(), 1);
    return "Stepping...";
  },

  break: function (pc) {
    this._breakpoints[pc] = true;
    return "Breakpoint set at " + pc;
  },

  print: function (variable) {
    return variable + " = " + this._vars[variable];
  },

  set: function (variable, value) {
    var parsed;
    if (value.match(/^\d+(\.\d+)?$/)) {
      parsed = Number(value);
    } else if (value.match(/^".*"$/)) {
      parsed = value.slice(1, -1);
    } else {
      throw new Error("Value must be either a number or string");
    }
    this._vars[variable] = parsed;
    return "Set " + variable + " to " + value;
  },

  _getDebuggerOutput: function () {
    return document.getElementById("debugger-output");
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
        if (bits.length === 3) {
          if (bits[0] === "set") {
            output = this.set(bits[1], bits[2]);
          } else {
            throw new Error("Bad debugger command: " + cmd);
          }
        } else if (bits.length === 2) {
          if (bits[0] === "break") {
            output = this.break(bits[1]);
          } else if (bits[0] === "print") {
            output = this.print(bits[1]);
          } else {
            throw new Error("Bad debugger command: " + cmd);
          }
        } else {
          throw new Error("Bad debugger command: " + cmd);
        }
      }
    } catch (error) {
      output = error + "\n\n" + error.stack;
    }

    this._getDebuggerOutput().textContent = output;
  },

  schedule: function (step, pc, vars, lineNumber) {
    if (lineNumber == null) {
      this.hideControls();
      this._step = undefined;
      this._pc = undefined;
      this._vars = undefined;
      this._lineNumber = undefined;
      this._breakpoints = {};
      return;
    }

    this._step = step;
    this._pc = pc;
    this._vars = vars;
    this._lineNumber = lineNumber;

    switch (this._state) {
      case "running":
        if (this._breakpoints[pc]) {
          this._state = "paused";
          this._getDebuggerOutput().textContent = "Hit breakpoint at " + pc;
          // Fall through...
        } else {
          this._getGutter().textContent = "";
          setTimeout(step, 1);
          return;
        }

      case "paused":
        this._getGutter().textContent = "\n".repeat(lineNumber) + "==>";
        return;

      default:
        throw new Error("Unexpected Debugger._state: " + this._state);
    }
  }
};

for (var k of Object.keys(Debugger)) {
  if (typeof Debugger[k] === "function") {
    Debugger[k] = Debugger[k].bind(Debugger);
  }
}

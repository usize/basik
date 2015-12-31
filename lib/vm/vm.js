"use strict";

const DEFAULT_TIME_SLICE = 1024;
const DEBUG = false;

function Context(repl, program, options = {}) {
  this.pc = 0;

  this.repl = repl;
  this.text = program.text;
  this.program = program;

  this.strings = [];
  this.ints = new Int16Array(program.ints.size);
  this.reals = new Float64Array(program.reals.size);
  this.arrays = [];
  this.data = []; // a.k.a DATA
  this.dataIndex = 0;

  this.callStack = [];
  this.forStack = [];
  this.stack = [];

  if (options.debug) {
    this.variables = Object.create(null);

    var forward = (prop, target, idx) => {
      Object.defineProperty(variables, prop, {
        enumerable: true,
        get() { return target[idx] },
        set(val) { target[idx] = val; },
      });
    }

    for (var data of program.strings.values())
      forward(data.name + "$", this.strings, data.index);

    for (var data of program.ints.values())
      forward(data.name + "%", this.ints, data.index);

    for (var data of program.reals.values())
      forward(data.name, this.reals, data.index);

    for (var data of program.arrays.values())
      forward(data.name, this.arrays, data.index);
  }

  this.paused = false;
  this.complete = false;

  this.schedule = options.schedule || (step => step());
  this.debug = options.debug;

  this.completed = new Promise((resolve, reject) => {
    this._completed = { resolve, reject };
  });

  this.runSlowly = this.runSlowly.bind(this);
}

Context.prototype = {
  runSlowly() {
    if (this.run())
      this.schedule(this.runSlowly);
    else if (this.complete)
      this._completed.resolve();
  },

  run(steps = DEFAULT_TIME_SLICE) {
    while (steps-- > 0) {
      if (this.paused || this.complete)
        return false;

      // Increment the PC *before* executing the instruction, since some
      // ops will change it.
      const pc = this.pc++;
      const instr = this.text[pc];

      if (DEBUG)
        console.log('Line ' + this.program.pcLine[pc],
                    'Statement ' + this.program.pcStatement[pc],
                    `PC=0x${pc.toString(16)}`,
                    instr);
      OPS[instr.opcode](this, instr.argument);
    }

    return true;
  },

  // Pauses execution and returns the PC for the instruction which would
  // have been executed next had we not paused.
  pause() {
    this.paused = true;
    return this.pc;
  },

  resume(pc = null) {
    if (pc !== null)
      this.pc = pc;

    this.paused = false;
    this.schedule(this.runSlowly);
  },
};

function Namespace() {
  this.map = new Map();
}

Namespace.prototype = {
  get size() { return this.map.size; },

  get(varName) {
    var key = varName.slice(0, 2).toUpperCase();

    var data = this.map.get(key);
    if (data) {
      if (data.name != varName) {
        basicPrint(`You are attempting to use the variable '${varName}',\n` +
                   `which is an alias for the existing variable '${data.name}'.\n` +
                   `This will go very badly for you.\nYou have been warned.\n\n`);
      }
    } else {
      data = { index: this.size, name: varName };
      this.map.set(key, data);
    }

    return data.index;
  },

  getName(index) {
    for (var data of this.map.values()) {
      if (data.index == index)
        return data.name;
    }
  },
};


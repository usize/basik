"use strict";

const OPS = {
  sourceline(ctx, lineNumber) {
    var pc = ctx.pause();
    ctx.debug(() => { ctx.resume(pc); },
              pc, ctx.variables, lineNumber);
  },

  // Immediates

  int16(ctx, val) {
    ctx.stack.push(val);
  },

  string(ctx, val) {
    ctx.stack.push(val);
  },

  // Variables

  loaddata(ctx) {
    var nargs = ctx.stack.pop();
    for (var i = 0; i < nargs; i++)
      ctx.stack.push(ctx.data[(ctx.data.length - 1) - ctx.dataIndex++]);
  },

  storedata(ctx) {
    var nargs = ctx.stack.pop();
    for (var i = 0; i < nargs; i++)
      ctx.data.push(ctx.stack.pop());
  },

  restoredata(ctx) {
    ctx.dataIndex = 0;
  },

  loadstr(ctx, addr) {
    ctx.stack.push(ctx.strings[addr]);
  },

  storestr(ctx, addr) {
    ctx.strings[addr] = ctx.stack.pop();
  },

  loadint(ctx, addr) {
    ctx.stack.push(ctx.ints[addr]);
  },

  storeint(ctx, addr) {
    ctx.ints[addr] = ctx.stack.pop();
  },

  loadreal(ctx, addr) {
    ctx.stack.push(ctx.reals[addr]);
  },

  storereal(ctx, addr) {
    ctx.reals[addr] = ctx.stack.pop();
  },

  loadarray(ctx, addr) {
    var arrayDepth = ctx.stack.pop() || 0;
    var result = ctx.arrays[addr][ctx.stack.pop()];
    for (var i = 1; i < arrayDepth; i++)
        result = result[ctx.stack.pop()];
    ctx.stack.push(result);
  },

  storearray(ctx, addr) {
    var arrayDepth = ctx.stack.pop() || 0;
    var reference = ctx.arrays[addr];
    for (var i = 0; i < arrayDepth - 1; i++)
        reference = reference[ctx.stack.pop()];
    reference[ctx.stack.pop()] = ctx.stack.pop();
  },

  createarraystr(ctx, addr) {
    var arrayDepth = ctx.stack.pop() || 0;
    var arrays = [];
    for (var i = 0; i < arrayDepth; i++) {
      arrays[i] = new Array(ctx.stack.pop() + 1);
    }
    // nest the arrays like russian dolls
    for (var j = arrays.length - 1; j >= 1; j--) {
      for (var k = 0; k < arrays[j - 1].length; k++)
          arrays[j - 1][k] = arrays[j].slice(0);
    }
    ctx.arrays[addr] = arrays[0];
  },

  createarrayint(ctx, addr) {
    var arrayDepth = ctx.stack.pop() || 0;
    var arrays = [];
    for (var i = 0; i < arrayDepth - 1; i++) {
      arrays[i] = new Array(ctx.stack.pop() + 1);
    }
    // only the last array can be typed
    // (non numeric entries are converted to NaNs)
    arrays[arrayDepth - 1] = new Int16Array(ctx.stack.pop() + 1);
    for (var j = arrays.length - 1; j >= 1; j--) {
      for (var k = 0; k < arrays[j - 1].length; k++)
          arrays[j - 1][k] = arrays[j].slice(0);
    }
    ctx.arrays[addr] = arrays[0];
  },

  createarrayreal(ctx, addr) {
    var arrayDepth = ctx.stack.pop() || 0;
    var arrays = [];
    for (var i = 0; i < arrayDepth - 1; i++) {
      arrays[i] = new Array(ctx.stack.pop() + 1);
    }
    arrays[arrayDepth - 1] = new Float64Array(ctx.stack.pop() + 1);
    for (var j = arrays.length - 1; j >= 1; j--) {
      for (var k = 0; k < arrays[j - 1].length; k++)
          arrays[j - 1][k] = arrays[j].slice(0);
    }
    ctx.arrays[addr] = arrays[0];
  },

  swap(ctx) {
    const { stack } = ctx;
    const [a, b] = stack.splice(-2);
    stack.push(b, a);
  },

  // Flow control

  jump(ctx) {
    ctx.pc = ctx.stack.pop();
  },

  jumpif(ctx) {
    const newPC = ctx.stack.pop();
    const pred = ctx.stack.pop();

    if (pred)
      ctx.pc = newPC;
  },

  stmtif(ctx) {
    const pred = ctx.stack.pop();
    const stmtCodes = ctx.stack.pop();
    if (!pred)
      ctx.pc += stmtCodes;
  },

  call(ctx) {
    ctx.callStack.push(ctx.pc);
    ctx.pc = ctx.stack.pop();
  },

  return(ctx) {
    ctx.pc = ctx.callStack.pop();
  },

  callbuiltin(ctx, name) {
    const arg = ctx.stack.pop();

    ctx.stack.push(builtinFunctions[name](arg));
  },

  for(ctx, addr) {
    const step = ctx.stack.pop();
    const target = ctx.stack.pop();
    const value = ctx.stack.pop();

    ctx.forStack.push({
      addr,
      step,
      target,
      pc: ctx.pc,
      oldValue: ctx.reals[addr],
    });

    ctx.reals[addr] = value;
  },

  next(ctx, addr) {
    var { forStack } = ctx;

    function pop() {
      var frame = forStack.pop();
      ctx.reals[frame.addr] = frame.oldValue;
    }

    var frame;
    do {
      if (frame)
        pop();

      frame = forStack[forStack.length - 1];
    } while (frame && frame.addr != addr);

    if (!frame)
      throw Error(`Invalid NEXT argument: ${ctx.program.reals.getName(addr)}: No matching FOR loop.`);

    if (ctx.reals[addr] == frame.target)
      pop();
    else {
      ctx.reals[addr] += frame.step;
      ctx.pc = frame.pc;
    }
  },

  end(ctx) {
    ctx.complete = true;
    ctx.repl.basicPrint('\n\nfin.');
  },

  // I/O

  print(ctx) {
    ctx.repl.basicPrint(ctx.stack.pop());
  },

  println(ctx) {
    ctx.repl.basicPrint('\n');
  },

  input(ctx, dataType) {
    var pc = ctx.pause();

    ctx.repl.basicInput(ctx.stack.pop(), dataType, vals => {
      for (var i = 0; i < vals.length; i++)
          ctx.stack.push(vals[i]);
      ctx.resume(pc);
    });
  },

  // Binary ops

  // TODO: Applesoft BASIC automatically converts ints to reals
  // sometimes. Should we truncate, or convert to double, on overflow?

  add(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(a + b);
  },

  sub(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(a - b);
  },

  mul(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(a * b);
  },

  div(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(a / b);
  },

  mod(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(a % b);
  },

  pow(ctx) {
    const { stack } = ctx;
    const b = stack.pop();
    const a = stack.pop();
    stack.push(Math.pow(a, b));
  },

  and(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();
    stack.push(exprL && exprR);
  },

  or(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();
    stack.push(exprL || exprR);
  },

  lte(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();
    stack.push(exprL <= exprR);
  },

  gte(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();
    stack.push(exprL >= exprR);
  },

  lt(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();
    stack.push(exprL < exprR);
  },

  gt(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();
    stack.push(exprL > exprR);
  },

  noteq(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();
    stack.push(exprL != exprR);
  },

  eq(ctx) {
    const { stack } = ctx;
    const exprR = stack.pop();
    const exprL = stack.pop();
    stack.push(exprL == exprR);
  },

  // Unary ops

  neg(ctx) {
    const { stack } = ctx;
    const a = stack.pop();
    stack.push(-a);
  },

  pos(ctx) {
    const { stack } = ctx;
    const a = stack.pop();
    stack.push(+a);
  },

  not(ctx) {
    const { stack } = ctx;
    const a = stack.pop();
    stack.push(!a);
  },
};


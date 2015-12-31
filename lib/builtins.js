"use strict";

var builtinFunctions = {
  TAB: n => Array(Math.floor(n + 1)).join(" "),
  INT: n => Math.floor(n),
  ABS: n => Math.abs(n),
  LEN: n => n.length,
  SIN: n => Math.sin(n),
  _lastRandom: 0.001,
  _xorShiftRand: n => {
    n ^= n >> 12; // a
    n ^= n << 25; // b
    n ^= n >> 27; // c
    return (n%1000/1000);
  },
  RND: n => {
    /*from the Apple ][ BASIC manual:
      if x>0, random number between 0 and 1
      if x=0, repeats last random number
      if x<0, begins new repeatable sequence*/
    if (n >= 1)
       builtinFunctions._lastRandom = builtinFunctions._xorShiftRand(builtinFunctions._lastRandom * 1000);
    if (n < 0)
      builtinFunctions._lastRandom = builtinFunctions._xorShiftRand(builtinFunctions._lastRandom * 1000);
    return builtinFunctions._lastRandom;
  },
};

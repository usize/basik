"use strict";

var builtinFunctions = {
  TAB: n => Array(Math.floor(n + 1)).join(" "),
  INT: n => Math.floor(n),
  ABS: n => Math.abs(n),
  LEN: n => n.length,
};

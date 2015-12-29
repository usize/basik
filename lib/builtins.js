"use strict";

var unaryOps = {
  'NOT': exprR => !exprR,
  'NEG': exprR => -exprR,
  'POS': exprR => +exprR,
};

var binaryOps = {
  'ADD': (exprL, exprR) => (exprL + exprR),
  'SUB': (exprL, exprR) => (exprL - exprR),
  'MUL': (exprL, exprR) => (exprL * exprR),
  'DIV': (exprL, exprR) => (exprL / exprR),
  'MOD': (exprL, exprR) => (exprL % exprR) | 0,
  'POW': Math.pow,
  'AND': (exprL, exprR) => exprL && exprR,
  'OR': (exprL, exprR) => exprL || exprR,
  'LTE': (exprL, exprR) => exprL <= exprR,
  'GTE': (exprL, exprR) => exprL >= exprR,
  'LT': (exprL, exprR) => exprL < exprR,
  'GT': (exprL, exprR) => exprL > exprR,
  'NOTEQ': (exprL, exprR) => exprL != exprR,
  'EQ': (exprL, exprR) => exprL == exprR,
};

var functionTable = {
  TAB: n => Array(Math.floor(n + 1)).join(" "),
  INT: n => Math.floor(n),
  ABS: n => Math.abs(n),
};

"use strict";

var KEYWORDS = [
  'GOTO',
  'GOSUB',
  'IF',
  'THEN',
  'LET',
  'END',
  'STOP',
  'PRINT',
  'DEF',
  'REM',
  'INPUT',
  'RETURN',
  'FOR',
  'NEXT',
  'TO',
  'STEP',
  'DIM',
  'AND',
  'OR',
  'NOT',
  'DATA',
  'READ',
];

var KEYWORD_EXP = RegExp('(' + KEYWORDS.join('|') + ')', 'y');

// Token types that are valid on the LHS of a binary op.
var BINOP_LHS = [
  'VARIABLE',
  'STRING',
  'INT',
  'FLOAT',
  'R_PAR',
];

var OPERATORS = {
  'AND': 'AND',
  'OR': 'OR',
  '<>': 'NOTEQ',
  '><': 'NOTEQ',
  '<=': 'LTE',
  '=<': 'LTE',
  '>=': 'GTE',
  '=>': 'GTE',
  '<':  'LT',
  '>':  'GT',
  '=':  'EQ',
  '+':  'ADD',
  '-':  'SUB',
  '*':  'MUL',
  '/':  'DIV',
  '^':  'POW'
};

var UNARY_OPS = {
  '-': 'NEG',
  '+': 'POS',
  'NOT': 'NOT',
};

var MISC = {
  '(': 'L_PAR',
  ')': 'R_PAR',
  '[': 'L_BRACKET',
  ']': 'R_BRACKET',
  '{': 'L_BRACE',
  '}': 'R_BRACE',
  ':': 'COLON',
  ';': 'SEMICOLON',
  ',': 'COMMA',
};

function Token(name, value, lineNumber) {
  this.name = name;
  this.value = value;
  this.lineNumber = lineNumber;
}

function match(exp, chr, startIndex = null) {
  if (chr === undefined) {
    return false;
  }
  if (startIndex !== null) {
    if (!exp.sticky) {
      throw new ValueError('startIndex may only be used with sticky expressions');
    }
    exp.lastIndex = startIndex;
  }
  return exp.test(chr);
}

function lexer(text) {
  var tokens = [];
  var lineno = 1;

  for (var line of text.split('\n')) {
    var cursor = 0;

    while(cursor < line.length) {
      var substr = "";
      /* Skip Whitespace */
      while (/\s/.test(line[cursor])) {
        cursor++;
      }

      /* Comments */
      if (line[cursor] == "'") {
        cursor = line.length;
        continue;
      }

      /* KEYWORDS & IDENTIFIERS */
      if (match(/[a-zA-Z]/, line[cursor])) {
        KEYWORD_EXP.lastIndex = cursor;
        var kw = KEYWORD_EXP.exec(line);
        if (kw) {
          substr = kw[0];
          if (substr == 'REM') {
            tokens.push(new Token('REM', substr + line.slice(cursor), lineno));
            cursor = line.length;
            continue;
          } else if (substr in UNARY_OPS) {
            tokens.push(new Token('UNOP', UNARY_OPS[substr], lineno));
          } else if (substr in OPERATORS) {
            tokens.push(new Token('BINOP', OPERATORS[substr], lineno));
          } else if (KEYWORDS.includes(substr)) {
            tokens.push(new Token(substr, '', lineno));
          }
          cursor += substr.length
          continue;
        }

        do {
          substr += line[cursor];
          cursor++;
        } while (match(/[a-zA-Z0-9]/, line[cursor]) && !match(KEYWORD_EXP, line, cursor));

        if (/[%$]/.test(line[cursor])) {
          substr += line[cursor];
          cursor++;
        }

        tokens.push(new Token('VARIABLE', substr, lineno));
        continue;
      }

      /* STRINGS */
      if (/\"/.test(line[cursor])) {
        cursor++;
        while(match(/[^\"]/, line[cursor])) {
          substr += line[cursor];
          cursor++;
        }
        cursor++;
        tokens.push(new Token('STRING', substr, lineno));
        continue;
      }

      /* Binary Ops and Misc */
      var lastTok = tokens[tokens.length - 1];

      var op = line.slice(cursor, cursor + 2);
      if (!(op in OPERATORS)) {
        op = line[cursor];
      }
      if (op in OPERATORS && lastTok && BINOP_LHS.includes(lastTok.name)) {
        tokens.push(new Token('BINOP', OPERATORS[op], lineno));
        cursor += op.length;
        continue;
      }

      if (op in MISC) {
        tokens.push(new Token(MISC[op], op, lineno));
        cursor += op.length;
        continue;
      }

      if (op in UNARY_OPS) {
        tokens.push(new Token('UNOP', UNARY_OPS[op], lineno));
        cursor += op.length;
        continue;
      }

      /* INTEGERS AND FLOATS*/
      if (match(/[+-\.]?[0-9]/y, line, cursor)) {
        var intType = (cursor == 0) ? 'STMTNO' : 'INT';
        do {
          substr += line[cursor];
          cursor++;
        } while (/[0-9]/.test(line[cursor]));
        // float with no beginning zero
        if (substr[0] == '.') {
          tokens.push(new Token('FLOAT', substr, lineno));
          continue;
        }

        if (line[cursor] == '.' && match(/[0-9]/, line[cursor + 1])) {
          do {
            substr += line[cursor];
            cursor++;
          } while (/[0-9]/.test(line[cursor]));
          tokens.push(new Token('FLOAT', substr, lineno));
          continue;
        }

        tokens.push(new Token(intType, substr, lineno));
        continue;
      }

      tokens.push(new Token('SYNTAX_ERROR', line[cursor], lineno));
      cursor++;
    }
    lineno++;
  }

  return tokens;
}

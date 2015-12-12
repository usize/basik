var KEYWORDS = [
  'GOTO',
  'GOSUB',
  'IF',
  'THEN',
  'LET',
  'END',
  'PRINT',
  'DEF'
];

var OPERATORS = {
  '<>': 'NOTEQ',
  '==': 'EQ',
  '<=': 'LTE',
  '>=': 'GTE',
  '=': 'ASSIGN',
  '+=': 'INCASSIGN',
  '-=': 'DECASSIGN',
  '+': 'ADD',
  '-': 'SUB',
  '*': 'MUL',
  '/': 'DIV',
  '%': 'MOD',
  '^': 'XOR',
  '&': 'AND',
};

var MISC = {
  '(': 'L_PAR',
  ')': 'R_PAR',
  '[': 'L_BRACKET',
  ']': 'R_BRACKET',
  '{': 'L_BRACE',
  '}': 'R_BRACE',
  '!': 'NOT'

};

function Token(name, value, lineNumber) {
  this.name = name;
  this.value = value;
  this.lineNumber = lineNumber;
};

function match(exp, chr) {
  if (chr === undefined) {
    return false;
  }
  return exp.test(chr);
};

function lexer(text) {
  var tokens = [];
  var lineno = 0;
  var cursor = 0;

  for (var line of text.split('\n')) {

    while(cursor < line.length) {
      substr = "";
      /* Skip Whitespace */
      while (/\s/.test(line[cursor])) {
        cursor++;
      }

      /* KEYWORDS & IDENTIFIERS */
      if (/[a-zA-Z]/.test(line[cursor])) {
        while(match(/[a-zA-Z]/, line[cursor])) {
         substr += line[cursor];
         cursor++;
        };
        if (KEYWORDS.indexOf(substr) >= 0) {
          tokens.push(new Token(substr, '', lineno));
        } else {
          tokens.push(new Token('VARIABLE', substr, lineno));
        }
        continue;
      }

      /* INTEGERS */
      if (/[0-9]/.test(line[cursor])) {
        var intType = (cursor == 0) ? 'STMTNO' : 'INT';
        while (/[0-9]/.test(line[cursor])) {
          substr += line[cursor];
          cursor++;
        }
        tokens.push(new Token(intType, substr, lineno));
        continue;
      }

     /* STRINGS */
     if (/\"/.test(line[cursor])) {
        cursor++;
        while(match(/[^\"]/, line[cursor])) {
        substr += line[cursor];
        cursor++;
       };
       cursor++;
       tokens.push(new Token('STRING', substr, lineno));
       continue;
     }

      /* Binary Ops and Misc */
      var op = line.substring(cursor, 2);
      if (!(op in OPERATORS)) {
        op = line[cursor];
      }
      if (op in OPERATORS) {
        tokens.push(new Token('BINOP', OPERATORS[op], lineno));
        cursor += op.length;
        continue;
      }
      if (op in MISC) {
        tokens.push(new Token(MISC[op], op, lineno));
        cursor += op.length;
        continue;
      }
      cursor++;
    }
    lineno++;
  };

  console.log(tokens);
  return tokens;
};

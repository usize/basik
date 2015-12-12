/* Given an AST, run it through a set of transforms. */

var transforms = [];

// compress to a gap-free list of statements, with goto's rewritten
// appropriately
var orderProgram = (program) => {
  program.sort((a, b) => (a.stmtNumber - b.stmtNumber));

  let lineToIndex = {};
  program.foreach((stmt, i) => { lineToIndex[stmt.stmtNumber] = i });

  program.forEach((stmt, i) => {
    if (stmt instanceof Goto) {
      stmt.targetIndex = lineToIndex[stmt.targetNumber];
    } else if (stmt instanceof If) {
      stmt.targetIndex = lineToIndex[stmt.targetNumber];
    }
  }

  return program;
};

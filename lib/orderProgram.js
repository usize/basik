/* Given an AST, run it through a set of transforms. */

var transforms = [];

// compress to a gap-free list of statements, with goto's rewritten
// appropriately
var orderProgram = (program) => {
  program.sort((a, b) => (a.stmtNumber - b.stmtNumber));

  var lineToIndex = {};
  program.forEach((stmt, i) => { lineToIndex[stmt.stmtNumber] = i });

  program.forEach((stmt, i) => {
    var command = stmt.command;
    if (command.type == "Goto") {
      command.targetIndex = lineToIndex[command.stmtNumber];
      if (command.targetIndex === undefined) {
        throw new Error("Invalid GOTO target");
      }
    } else if (command.type == "If") {
      command.targetIndex = lineToIndex[command.stmtNumber];
      if (command.targetIndex === undefined) {
        throw new Error("Invalid IF/THEN target");
      }
    }
  });

  return program;
};

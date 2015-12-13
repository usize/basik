/* Given an AST, run it through a set of transforms. */

var transforms = [];

// compress to a gap-free list of statements, with goto's rewritten
// appropriately
var orderProgram = (program) => {
  program.statements.sort((a, b) => (a.stmtNumber - b.stmtNumber));

  var lineToIndex = {};
  program.statements.forEach((stmt, i) => {
    program.stmtNumberToIndex[stmt.stmtNumber] = i;
    program.indexToStmtNumber[i] = stmt.stmtNumber;
  });

  program.statements.forEach((stmt, i) => {
    for (var command of stmt.commands) {
      if (command.type == "Goto" || command.type == "GoSub") {
        command.targetIndex = program.stmtNumberToIndex[command.stmtNumber];
        if (command.targetIndex === undefined) {
          throw new Error("Invalid GOTO target");
        }
      } else if (command.type == "If") {
        command.targetIndex = program.stmtNumberToIndex[command.stmtNumber];
        if (command.targetIndex === undefined) {
          throw new Error("Invalid IF/THEN target");
        }
      }
    }
  });

  return program;
};

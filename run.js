#!/usr/bin/env node

// What is this?
// a git-patch-like workflow for the Things.app

// Constants (you'll need to replace this)..
// See authorization in: https://culturedcode.com/things/support/articles/2803573/
const authToken = "R6H-tAuKSY2nAKMldcCecw";

// default to batching; however, do allow going one by one
const ROWS = process.stdout.rows;
const COLS = process.stdout.columns;

const MAX_TITLE = 30;
const MAX_DESCR = 15;

let batchSize = ROWS * 2;
if (process.argv[process.argv.length - 1] === "single") {
  batchSize = 1;
}

const os = require("os");
const db = require("better-sqlite3")(
  `${os.homedir()}/Library/Group Containers/JLMPQHK86H.com.culturedcode.ThingsMac/Things Database.thingsdatabase/main.sqlite`,
  {}
);

const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const keys = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "l",
  "m",
  "n",
  "o",
  "p",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];

const inboxNotes = db
  .prepare(
    "select * from TMTask where project is null and status=0 and actionGroup is null and type=0 order by [index]"
  )
  .all();
const projectsByMostPopular = db
  .prepare(
    "select TMTask2.title,TMTask.project,count(TMTask.project),TMTask2.* from TMTask join TMTask as TMTask2 on TMTask.project = TMTask2.uuid where TMTask.status=0 and TMTask2.trashed=0 group by TMTask.project order by count(TMTask.project) desc"
  )
  .all();
const allNotes = db.prepare("select * from TMTask where status=0").all();

const projectIdToCount = projectsByMostPopular.reduce((acc, cur) => {
  acc[cur.uuid] = cur["count(TMTask.project)"];
  return acc;
}, {});
const projectIdToInfo = allNotes.reduce((acc, item) => {
  if (item.uuid in projectIdToCount) {
    acc[item.uuid] = { name: item.title, count: projectIdToCount[item.uuid] };
  }
  return acc;
}, {});

db.close();
//console.log(projectIdToInfo);

const topProjects = [...Object.entries(projectIdToInfo)].sort(
  ([akey, avalue], [bkey, bvalue]) => bvalue.count - avalue.count
);

//console.log(topProjects);

const topProjectsText =
  "q: cancel\n" +
  topProjects
    .map(([akey, avalue], i) => {
      return `${keys[i]}: ${avalue.name}`;
    })
    .slice(0, keys.length)
    .join("\n") +
  "\n";

let i = 0;

const complete = (id) => {
  const now = new Date().toISOString();
  const exec = require("child_process").exec;
  exec(
    `open 'things:///update?auth-token=${authToken}&id=${id}&completed=true&completion-date=${now}'`,
    (error, stdout, stderr) => {
      if (error !== null) {
        console.log(`exec error: ${error}`);
      }
    }
  );
};

const moveProject = (id, projectKeyUser) => {
  const projectIndex = keys.findIndex((a) => a === projectKeyUser);
  if (projectIndex === -1) {
    console.log("Not able to find that project");
    return;
  }
  const [projectKey, projectValue] = topProjects[projectIndex];

  const now = new Date().toISOString();

  const exec = require("child_process").exec;
  exec(
    `open 'things:///update?auth-token=${authToken}&id=${id}&list-id=${projectKey}'`,
    (error, stdout, stderr) => {
      if (error !== null) {
        console.log(`exec error: ${error}`);
      }
    }
  );
};

Reset = "\x1b[0m";
Bright = "\x1b[1m";
Dim = "\x1b[2m";
Underscore = "\x1b[4m";
Blink = "\x1b[5m";
Reverse = "\x1b[7m";
Hidden = "\x1b[8m";

FgBlack = "\x1b[30m";
FgRed = "\x1b[31m";
FgGreen = "\x1b[32m";
FgYellow = "\x1b[33m";
FgBlue = "\x1b[34m";
FgMagenta = "\x1b[35m";
FgCyan = "\x1b[36m";
FgWhite = "\x1b[37m";

BgBlack = "\x1b[40m";
BgRed = "\x1b[41m";
BgGreen = "\x1b[42m";
BgYellow = "\x1b[43m";
BgBlue = "\x1b[44m";
BgMagenta = "\x1b[45m";
BgCyan = "\x1b[46m";
BgWhite = "\x1b[47m";

const outputInColumns = (linesStr) => {
  const lines = linesStr.split("\n");
  const linesWithoutFormatting = [...lines];
  for (let i = 0; i < linesWithoutFormatting.length; ++i) {
    linesWithoutFormatting[i] = linesWithoutFormatting[i].replace(
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ""
    );
  }
  // get max width
  let maxWidth = 0;
  for (let line of linesWithoutFormatting) {
    maxWidth = line.length > maxWidth ? line.length : maxWidth;
  }
  let numColumns = Math.max(1, Math.floor(COLS / maxWidth));
  //console.log("numColumns");
  //console.log(numColumns);
  let numRows = Math.ceil(lines.length / numColumns);
  let outputLines = "";
  for (let i = 0; i < numRows; ++i) {
    let outputLine = "";
    for (let j = 0; j < numColumns; ++j) {
      if (i + j * numRows > lines.length) {
        continue;
      }
      //console.log(i + j * (numRows - 1));
      const line = lines[i + j * numRows];
      if (!line) {
        continue;
      }
      const lineWithoutFormatting = linesWithoutFormatting[i + j * numRows];
      const lineLength = lineWithoutFormatting.length;
      outputLine += line;
      if (maxWidth - lineLength > 0) {
        outputLine += " ".repeat(Math.max(0, maxWidth - lineLength));
      }
      if (numColumns > 1 && j < numColumns - 1) {
        outputLine += " ";
      }
    }
    outputLines += outputLine + "\n";
  }
  return outputLines;
};

const getDetails = (
  number,
  item,
  maxDigits,
  maxTitle = MAX_TITLE,
  maxDescr = MAX_DESCR,
  newLineNotesDelimiter = "|"
) => {
  if (!item) {
    return "";
  }
  const title = item.title.substr(0, maxTitle);
  const notes = (item.notes || "")
    .split(/\n/)
    .join(newLineNotesDelimiter)
    .substr(0, maxTitle - title.length + maxDescr);
  let paddedNumber;
  if (number === "#") {
    paddedNumber = "#".repeat(maxDigits);
  } else {
    paddedNumber = String(number).padStart(maxDigits, "0");
  }
  let detailsLine = `${paddedNumber}. ${FgYellow}${title}${Reset}`;
  if (notes != "") {
    detailsLine += `: ${FgBlue}${notes}${Reset}`;
  }
  return detailsLine;
};

const removedNumbersThisRound = new Set();

const regexpMatchInput = /^(\d*)(\D*)$/;

const numDigits = (x) => {
  return Math.max(Math.floor(Math.log10(Math.abs(x))), 0) + 1;
};

const recursiveAsyncReadLine = function () {
  const getThisIterationOutput = () => {
    let lineDetails = "";
    const maxDigitsNumberInIteration = numDigits(i + batchSize);
    for (let j = i; j < i + batchSize; ++j) {
      lineDetails += getDetails(
        removedNumbersThisRound.has(j) ? "#" : j,
        inboxNotes[j],
        maxDigitsNumberInIteration
      );
      if (j < i + batchSize - 1) {
        lineDetails += "\n";
      }
    }

    let mainQuestion = `${lineDetails}\n`;
    if (batchSize === 1) {
      mainQuestion += `${FgGreen}action: c/n/p/m/<number>/j/q/h?${Reset}\n`;
    } else {
      mainQuestion += `${FgGreen}action: [#]c/n/p/[#]m/j/[#]g/[#]i/q/h?${Reset}\n`;
    }
    return outputInColumns(mainQuestion);
  };
  const handleThisIteration = (line) => {
    let numberAndCommands = line.split("/");
    let outputFull = false;
    for (let numberAndCommand of numberAndCommands) {
      const match = numberAndCommand.match(regexpMatchInput);
      const [, number, command] = match;

      const iprev = i;
      if (number.length > 0) {
        i = parseInt(number);
      }
      // don't allow going to a number in batch mode becauase it's a bit confusing
      // and easy to accidentally do
      if (batchSize >= 1 && command === "") {
        i = iprev;
        outputFull = true;
        continue;
      }
      switch (command) {
        case "c":
          complete(inboxNotes[i].uuid);
          if (batchSize === 1) {
            i += 1; // just move forward
          } else {
            complete(inboxNotes[i].uuid);
            removedNumbersThisRound.add(i);
            i = iprev;
          }
          outputFull = true;
          break;
        case "g":
          // i already set, just go
          outputFull = true;
          break;
        case "n":
          i += batchSize;
          outputFull = true;
          break;
        case "p":
          i -= batchSize;
          outputFull = true;
          break;
        case "m":
          rl.question(outputInColumns(topProjectsText), (line) => {
            if (line === "q") {
              recursiveAsyncReadLine(); //Calling this function again to ask new question
              return;
            }
            moveProject(inboxNotes[i].uuid, line);
            if (batchSize === 1) {
              i += 1;
            } else {
              removedNumbersThisRound.add(i);
              i = iprev;
            }
            doThisIteration();
          });

          outputFull = true;
          break;
        case "j":
          rl.question("jump to title (q to quit): ", (line) => {
            if (line === "q") {
              recursiveAsyncReadLine(); //Calling this function again to ask new question
              return;
            }
            let foundMatch = false;
            for (let newI = i; newI < inboxNotes.length; ++newI) {
              if (
                (inboxNotes[newI].title || "empty string").indexOf(line) != -1
              ) {
                i = newI;
                foundMatch = true;
                break;
              }
            }
            if (!foundMatch) {
              console.log(
                `Not able to find title match for this string: "${line}"`
              );
            }
            recursiveAsyncReadLine(); //Calling this function again to ask new question
          });

          outputFull = true;
          break;
        case "q":
          return rl.close();
        case "h":
          console.log(
            "c: complete, n: next/skip, p: previous, m: move to project, [number]: jump to number in inbox, j: jump to title, i: info, +: increase batch size, -: decrease batch size, q: quit, h: help"
          );
          break;
        case "+":
          batchSize += 5;
          outputFull = true;
          break;
        case "-":
          batchSize -= 5;
          outputFull = true;
          break;
        case "i":
          console.log("Full information:\n");
          console.log(getDetails(i, inboxNotes[i], 0, 1000, 1000, "\n"));
          console.log("\n");
          break;
        default:
          console.log("No such option. Please enter another: ");
      }
    }
    doThisIteration(outputFull);
  };

  const doThisIteration = (outputLinesThisIteration = true) => {
    rl.question(
      outputLinesThisIteration ? getThisIterationOutput() : "",
      (line) => {
        handleThisIteration(line);
      }
    );
  };
  doThisIteration();
};

recursiveAsyncReadLine();

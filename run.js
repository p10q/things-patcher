#!/usr/bin/env node

// What is this?
// a git-patch-like workflow for the Things.app

// Constants (you'll need to replace this)..
// See authorization in: https://culturedcode.com/things/support/articles/2803573/
const authToken = "<YOUR AUTH TOKEN GOES HERE>";

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
];

const inboxNotes = db
  .prepare(
    "select * from TMTask where project is null and status=0 and actionGroup is null and type=0 order by [index] limit 200"
  )
  .all();
const projectsByMostPopular = db
  .prepare(
    "select *,count(*) from TMTask where status=0 group by project order by count(*) desc"
  )
  .all();
const allNotes = db.prepare("select * from TMTask where status=0").all();

const projectIdToCount = projectsByMostPopular.reduce((acc, cur) => {
  acc[cur.project] = cur["count(*)"];
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

const topProjects = [...Object.entries(projectIdToInfo)]
  .sort(([akey, avalue], [bkey, bvalue]) => bvalue.count - avalue.count)
  .slice(0, keys.length);

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

const recursiveAsyncReadLine = function () {
  const notes = (inboxNotes[i].notes || "")
    .split("\n")
    .map((a) => `${a}`)
    .join("\n");
  const notesArea =
    notes === ""
      ? "\n"
      : `${FgYellow}${i}. notes${Reset}: ${
          notes.indexOf("\n") != -1 ? "\n" : ""
        }${notes}\n`;
  const mainQuestion = `${FgBlue}\n${i}. title${Reset}: ${inboxNotes[i].title}\n${notesArea}${FgGreen}action: c/n/p/m/<number>/j/q/h?${Reset}\n`;
  rl.question(mainQuestion, (line) => {
    if (/^\d+$/.test(line)) {
      i = parseInt(line);
    } else {
      switch (line) {
        case "c":
          complete(inboxNotes[i].uuid);
          i += 1;
          break;
        case "n":
          i += 1;
          break;
        case "p":
          i -= 1;
          break;
        case "m":
          rl.question(topProjectsText, (line) => {
            if (line === "q") {
              recursiveAsyncReadLine(); //Calling this function again to ask new question
              return;
            }
            moveProject(inboxNotes[i].uuid, line);
            i += 1;
            recursiveAsyncReadLine(); //Calling this function again to ask new question
          });

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

          break;
        case "q":
          return rl.close();
        case "h":
          console.log(
            "c: complete, n: next/skip, p: previous, m: move to project, [number]: jump to number in inbox, j: jump to title, q: quit, h: help"
          );
          break;
        default:
          console.log("No such option. Please enter another: ");
      }
    }
    recursiveAsyncReadLine(); //Calling this function again to ask new question
  });
};

recursiveAsyncReadLine();

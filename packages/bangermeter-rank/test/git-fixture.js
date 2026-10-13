"use strict";
// Throwaway git repos with fixed committer dates, standing in for
// xai-org/x-algorithm so the history walk can be tested to the second.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

// commits: [{ date: ISO, files: { "relative/path": text | null } }] — null deletes.
function makeRepo(commits) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bmr-upstream-"));
  const git = (args, env) => execFileSync("git", args, {
    cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    env: Object.assign({}, process.env, env)
  });
  git(["init", "-q", "-b", "main"]);
  for (const [k, v] of [["user.email", "test@example.com"], ["user.name", "test"], ["commit.gpgsign", "false"], ["core.autocrlf", "false"]]) {
    git(["config", k, v]);
  }
  for (const c of commits) {
    for (const [rel, text] of Object.entries(c.files || {})) {
      const p = path.join(dir, rel);
      if (text === null) { fs.rmSync(p, { force: true }); continue; }
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, text);
    }
    git(["add", "-A"]);
    git(["commit", "-q", "--allow-empty", "-m", "Open-source X Recommendation Algorithm"],
      { GIT_AUTHOR_DATE: c.date, GIT_COMMITTER_DATE: c.date });
  }
  return {
    dir,
    sha: rev => git(["rev-parse", rev]).trim(),
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true })
  };
}

const fixture = name => fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8").replace(/\r\n/g, "\n");
const setStamp = (text, stamp) => text.replace(/last sync \S+Z/, "last sync " + stamp);
const setValue = (text, param, value) =>
  text.replace(new RegExp('("' + param + '",\\s*)(-?[\\d_.]+)'), "$1" + value);

module.exports = { makeRepo, fixture, setStamp, setValue };

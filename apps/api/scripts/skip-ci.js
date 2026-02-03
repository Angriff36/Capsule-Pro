const { execSync } = require("node:child_process");

let commitMessage = "";

try {
  commitMessage = execSync("git log -1 --pretty=%B").toString().trim();
} catch (error) {
  // Vercel builds often do not include .git, so just continue the build.
  console.warn("Skipping commit message check because git is unavailable.");
  process.exit(1);
}

if (commitMessage.includes("[skip ci]")) {
  console.log("Skipping build due to [skip ci] in commit message.");
  process.exit(0); // this causes Vercel to skip the build
}

process.exit(1); // continue with build

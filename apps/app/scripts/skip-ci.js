const { execSync } = require("node:child_process");

const appSlug = "app";
const relevantPrefixes = [`apps/${appSlug}/`, "packages/", "libs/"];
const relevantFiles = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
  "vercel.json",
  ".npmrc",
  ".nvmrc",
  ".vercelignore",
  "tsconfig.json",
  "tsconfig.build.json",
]);

function getCommitMessage() {
  try {
    return execSync("git log -1 --pretty=%B").toString().trim();
  } catch (_error) {
    console.warn("Skipping commit message check because git is unavailable.");
    return "";
  }
}

function getChangedFiles() {
  const commands = [
    "git diff --name-only HEAD~1 HEAD",
    "git diff --name-only HEAD^ HEAD",
    "git diff-tree --no-commit-id --name-only -r HEAD",
  ];

  for (const command of commands) {
    try {
      const output = execSync(command).toString().trim();
      if (!output) {
        continue;
      }
      return output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    } catch (_error) {
      // Try the next command.
    }
  }

  return null;
}

const commitMessage = getCommitMessage();
if (commitMessage.includes("[skip ci]")) {
  console.log("Skipping build due to [skip ci] in commit message.");
  process.exit(0);
}

const changedFiles = getChangedFiles();
if (!changedFiles) {
  console.warn("Could not determine changed files. Continuing build.");
  process.exit(1);
}

const shouldBuild = changedFiles.some((file) => {
  if (relevantFiles.has(file)) {
    return true;
  }
  return relevantPrefixes.some((prefix) => file.startsWith(prefix));
});

if (!shouldBuild) {
  console.log("No relevant changes detected for app. Skipping build.");
  process.exit(0);
}

process.exit(1);

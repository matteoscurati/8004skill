#!/usr/bin/env node

// 8004skill CLI — vanilla ESM JavaScript (no TS, no external deps)
// Works via `npx 8004skill <command>` or `node bin/cli.mjs <command>`

import { createInterface } from "node:readline";
import { execSync, execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readlinkSync,
  lstatSync,
  symlinkSync,
  unlinkSync,
  rmSync,
  cpSync,
  readdirSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, platform } from "node:os";

// ── Constants ──────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PKG_ROOT = resolve(__dirname, "..");
const SKILL_NAME = "8004skill";
const HOME = homedir();
const CLAUDE_SKILLS_DIR = join(HOME, ".claude", "skills");
const OPENCLAW_SKILLS_DIR = join(HOME, ".openclaw", "skills");
const USER_DATA_DIR = join(HOME, ".8004skill");
const SKILL_INSTALL_DIR = join(USER_DATA_DIR, "skill");

const AGENT_TARGETS = [
  ["Claude Code", CLAUDE_SKILLS_DIR],
  ["OpenClaw", OPENCLAW_SKILLS_DIR],
];

// Files and directories that form the skill (copied in npx mode)
const SKILL_FILES = [
  "SKILL.md",
  "CLAUDE.md",
  ".claude-skill.json",
  "tsconfig.json",
  "package.json",
  "package-lock.json",
];
const SKILL_DIRS = ["scripts", "reference", "bin"];

// ── Formatting ─────────────────────────────────────────────────────────
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const NC = "\x1b[0m";

const ok = (msg) => console.log(`${GREEN}\u2713${NC} ${msg}`);
const info = (msg) => console.log(`${CYAN}\u2192${NC} ${msg}`);
const warn = (msg) => console.log(`${YELLOW}\u26a0${NC} ${msg}`);
const err = (msg) => console.log(`${RED}\u2717${NC} ${msg}`);
const hdr = (msg) => console.log(`\n${BOLD}${msg}${NC}`);

function banner(subtitle) {
  console.log(`\n${BOLD}${SKILL_NAME}${NC} ${DIM}\u2014 ${subtitle}${NC}`);
  console.log(`${DIM}ERC-8004 on-chain agent economy skill${NC}`);
}

// ── Helpers ────────────────────────────────────────────────────────────
function ask(question, defaultValue = "") {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function confirmYes(question, defaultYes = true) {
  const hint = defaultYes ? "Y/n" : "y/N";
  const defaultValue = defaultYes ? "Y" : "N";
  const ans = await ask(`${question} [${hint}]`, defaultValue);
  return /^[Yy]/i.test(ans);
}

function commandExists(cmd) {
  try {
    execFileSync("which", [cmd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function getNodeMajor() {
  return parseInt(process.version.slice(1).split(".")[0], 10);
}

function getNpmVersion() {
  try {
    return execSync("npm -v", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function isGitClone() {
  return existsSync(join(PKG_ROOT, ".git"));
}

function execSilent(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: PKG_ROOT, encoding: "utf8", ...opts }).trim();
  } catch {
    return null;
  }
}

/**
 * Determine the source directory (where SKILL.md + scripts/ live).
 * - Git clone mode: PKG_ROOT itself
 * - npx mode after install: SKILL_INSTALL_DIR
 */
function resolveSourceDir() {
  if (isGitClone()) return PKG_ROOT;
  if (existsSync(join(SKILL_INSTALL_DIR, "SKILL.md"))) return SKILL_INSTALL_DIR;
  return PKG_ROOT;
}

// ── Prerequisite checks ───────────────────────────────────────────────
function checkPrerequisites() {
  hdr("Prerequisites");

  const os = platform();
  if (os !== "darwin" && os !== "linux") {
    err(`Unsupported platform: ${os} (macOS and Linux only)`);
    process.exit(1);
  }
  ok(`Platform: ${os === "darwin" ? "macOS" : "Linux"}`);

  const nodeMajor = getNodeMajor();
  if (nodeMajor < 22) {
    err(`Node.js ${process.version} found \u2014 >= 22.0.0 required.`);
    process.exit(1);
  }
  ok(`Node.js ${process.version}`);

  const npmV = getNpmVersion();
  if (!npmV) {
    err("npm not found. Required to install dependencies.");
    process.exit(1);
  }
  ok(`npm ${npmV}`);
}

// ── Symlink management ────────────────────────────────────────────────
async function linkSkill(label, skillsDir, sourceDir) {
  const target = join(skillsDir, SKILL_NAME);

  if (existsSync(target)) {
    const stat = lstatSync(target);
    if (stat.isSymbolicLink()) {
      const existing = readlinkSync(target);
      if (existing === sourceDir) {
        ok(`${label}: already linked`);
        return;
      }
      warn(`${label}: symlink exists \u2192 ${existing}`);
      if (!(await confirmYes("  Replace?"))) {
        info("Skipped");
        return;
      }
      unlinkSync(target);
    } else {
      warn(`${label}: ${target} already exists (not a symlink)`);
      if (!(await confirmYes("  Replace with symlink?"))) {
        info("Skipped");
        return;
      }
      rmSync(target, { recursive: true, force: true });
    }
  }

  mkdirSync(skillsDir, { recursive: true });
  symlinkSync(sourceDir, target);
  ok(`${label}: ${target} \u2192 ${sourceDir}`);
}

function removeSymlink(label, skillsDir, sourceDir) {
  const target = join(skillsDir, SKILL_NAME);
  if (!existsSync(target)) return false;

  const stat = lstatSync(target);
  if (stat.isSymbolicLink()) {
    const existing = readlinkSync(target);
    if (existing === sourceDir || existing === PKG_ROOT || existing === SKILL_INSTALL_DIR) {
      unlinkSync(target);
      ok(`${label}: removed symlink ${target}`);
      return true;
    }
    info(`${label}: symlink points elsewhere (\u2192 ${existing}), skipping`);
    return false;
  }
  info(`${label}: ${target} exists but is not a symlink, skipping`);
  return false;
}

/**
 * Verify and optionally repair symlinks for all agent targets.
 * @param {string} sourceDir - Expected symlink destination
 * @param {boolean} fixMissing - Whether to offer fixing missing symlinks
 */
async function verifySymlinks(sourceDir, fixMissing = true) {
  hdr("Verify symlinks");
  for (const [label, dir] of AGENT_TARGETS) {
    const target = join(dir, SKILL_NAME);
    if (existsSync(target) && lstatSync(target).isSymbolicLink()) {
      const existing = readlinkSync(target);
      if (existing === sourceDir) {
        ok(`${label}: linked`);
        continue;
      }
      warn(`${label}: symlink points to ${existing} (expected ${sourceDir})`);
    } else if (existsSync(target)) {
      warn(`${label}: ${target} exists but is not a symlink`);
    } else {
      warn(`${label}: not installed`);
      if (!fixMissing) continue;
    }
    if (await confirmYes(`  Fix ${label} symlink?`)) {
      rmSync(target, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      symlinkSync(sourceDir, target);
      ok(`${label}: ${target} \u2192 ${sourceDir}`);
    } else {
      info("Skipped");
    }
  }
}

// ── Copy skill files (npx mode) ───────────────────────────────────────
function copySkillFiles() {
  info("Copying skill files to ~/.8004skill/skill/ ...");
  mkdirSync(SKILL_INSTALL_DIR, { recursive: true });

  for (const file of SKILL_FILES) {
    const src = join(PKG_ROOT, file);
    if (existsSync(src)) {
      cpSync(src, join(SKILL_INSTALL_DIR, file), { force: true });
    }
  }

  for (const dir of SKILL_DIRS) {
    const src = join(PKG_ROOT, dir);
    if (existsSync(src)) {
      cpSync(src, join(SKILL_INSTALL_DIR, dir), { recursive: true, force: true });
    }
  }

  ok("Skill files copied");
}

// ── Install dependencies ──────────────────────────────────────────────
function installDeps(dir, { prodOnly = false, skipIfPresent = false } = {}) {
  if (skipIfPresent && existsSync(join(dir, "node_modules"))) {
    ok("node_modules present");
    return;
  }
  info("Running npm install ...");
  const flags = prodOnly ? " --omit=dev" : "";
  try {
    execSync(`npm install${flags}`, { cwd: dir, stdio: "inherit" });
    ok("Dependencies installed");
  } catch {
    err("npm install failed");
    process.exit(1);
  }
}

// ── Commands ──────────────────────────────────────────────────────────

async function cmdInstall() {
  banner("installation wizard");

  checkPrerequisites();

  const haveClaude = commandExists("claude");
  const haveOpenclaw = commandExists("openclaw");

  // Choose targets
  hdr("Select agents");
  console.log("Where should the skill be installed?\n");
  console.log("  1) Claude Code       ~/.claude/skills/");
  console.log("  2) OpenClaw          ~/.openclaw/skills/");
  console.log("  3) Both              (recommended)");
  console.log("");

  const choice = await ask("Choice", "3");
  const doClaude = choice === "1" || choice === "3";
  const doOpenclaw = choice === "2" || choice === "3";

  if (!doClaude && !doOpenclaw) {
    err("Invalid choice");
    process.exit(1);
  }

  // Determine mode: git clone vs npx
  const gitClone = isGitClone();
  let sourceDir;

  hdr("Dependencies");

  if (gitClone) {
    info("Detected git clone \u2014 using repository directly");
    sourceDir = PKG_ROOT;
    installDeps(sourceDir);
  } else {
    info("Detected npx execution \u2014 copying to ~/.8004skill/skill/");
    copySkillFiles();
    sourceDir = SKILL_INSTALL_DIR;
    installDeps(sourceDir, { prodOnly: true, skipIfPresent: true });
  }

  // Create symlinks
  hdr("Linking skill");

  if (doClaude) await linkSkill("Claude Code", CLAUDE_SKILLS_DIR, sourceDir);
  if (doOpenclaw) await linkSkill("OpenClaw", OPENCLAW_SKILLS_DIR, sourceDir);

  // Summary
  hdr("Done");
  console.log("");
  console.log("  Open your agent in any directory and try:");
  console.log("");
  console.log(`    ${BOLD}/8004skill${NC}`);
  console.log("");
  console.log("  or just ask:");
  console.log("");
  console.log(`    ${DIM}"Register my agent on-chain"${NC}`);
  console.log(`    ${DIM}"Search for agents that do summarization"${NC}`);
  console.log(`    ${DIM}"Configure 8004 for Sepolia"${NC}`);
  console.log("");

  if (doClaude && !haveClaude) {
    warn(
      "Claude Code CLI not detected \u2014 install from https://docs.anthropic.com/en/docs/claude-code"
    );
  }
  if (doOpenclaw && !haveOpenclaw) {
    warn("OpenClaw CLI not detected \u2014 install from https://openclaw.org");
  }
}

async function cmdUninstall() {
  banner("uninstall wizard");

  const sourceDir = resolveSourceDir();

  hdr("Detecting installation");

  const found = [];

  // Check symlinks
  for (const [label, dir] of AGENT_TARGETS) {
    const target = join(dir, SKILL_NAME);
    if (existsSync(target) && lstatSync(target).isSymbolicLink()) {
      const existing = readlinkSync(target);
      if (existing === sourceDir || existing === PKG_ROOT || existing === SKILL_INSTALL_DIR) {
        ok(`${label} symlink: ${target}`);
        found.push({ type: "symlink", label, path: target });
      } else {
        info(`${label} symlink exists but points elsewhere \u2192 ${existing}`);
      }
    }
  }

  // Check skill install dir (npx mode)
  if (existsSync(SKILL_INSTALL_DIR) && !isGitClone()) {
    ok(`Installed skill files: ${SKILL_INSTALL_DIR}`);
    found.push({ type: "skill-files", label: "Installed skill files", path: SKILL_INSTALL_DIR });
  }

  // Check user data
  if (existsSync(USER_DATA_DIR)) {
    ok(`User data: ${USER_DATA_DIR}`);
    found.push({ type: "user-data", label: "User data", path: USER_DATA_DIR });
  }

  // Build artifacts (git clone only)
  if (isGitClone()) {
    for (const artifact of ["node_modules", "dist"]) {
      const p = join(PKG_ROOT, artifact);
      if (existsSync(p)) {
        ok(`Build artifact: ${artifact}/`);
        found.push({ type: "artifact", label: `Build artifact (${artifact})`, path: p });
      }
    }
  }

  if (found.length === 0) {
    console.log("");
    info("Nothing to uninstall.");
    console.log("");
    return;
  }

  // Show plan
  hdr("Uninstall plan");
  for (const item of found) {
    console.log(`    \u2022 ${item.label}`);
  }
  console.log("");

  // Group items by type and process each group
  const groups = [
    {
      type: "symlink",
      header: "Remove symlinks",
      question: "Remove skill symlinks?",
      defaultYes: true,
      remove(items) {
        for (const s of items) {
          unlinkSync(s.path);
          ok(`Removed ${s.path}`);
        }
      },
      skipMsg: "Skipped symlink removal",
    },
    {
      type: "skill-files",
      header: "Remove installed skill files",
      question: "Remove skill files from ~/.8004skill/skill/?",
      defaultYes: true,
      remove() {
        rmSync(SKILL_INSTALL_DIR, { recursive: true, force: true });
        ok(`Removed ${SKILL_INSTALL_DIR}`);
      },
      skipMsg: "Kept skill files",
    },
    {
      type: "user-data",
      header: "Remove user data",
      question: "Remove user data?",
      defaultYes: false,
      preWarn: `This will delete your config and registration records in ${USER_DATA_DIR}`,
      remove() {
        rmSync(USER_DATA_DIR, { recursive: true, force: true });
        ok(`Removed ${USER_DATA_DIR}`);
      },
      skipMsg: "Kept user data",
    },
    {
      type: "artifact",
      header: "Clean build artifacts",
      question: "Remove build artifacts?",
      defaultYes: false,
      remove(items) {
        for (const a of items) {
          rmSync(a.path, { recursive: true, force: true });
          ok(`Removed ${a.path.split("/").pop()}/`);
        }
      },
      skipMsg: "Kept build artifacts",
    },
  ];

  for (const group of groups) {
    const items = found.filter((f) => f.type === group.type);
    if (items.length === 0) continue;

    hdr(group.header);
    if (group.preWarn) warn(group.preWarn);

    if (await confirmYes(group.question, group.defaultYes)) {
      group.remove(items);
    } else {
      info(group.skipMsg);
    }
  }

  // Summary
  hdr("Done");
  console.log("");
  console.log(`  ${DIM}Source code is untouched.${NC}`);
  console.log(`  ${DIM}To reinstall, run: npx 8004skill install${NC}`);
  console.log("");
}

async function cmdUpdate() {
  banner("update wizard");

  checkPrerequisites();

  const gitClone = isGitClone();
  let sourceDir;

  hdr("Source update");

  if (gitClone) {
    sourceDir = PKG_ROOT;
    const { pulled, commitBefore } = await gitPull();

    hdr("Dependencies");
    installDeps(sourceDir);

    await verifySymlinks(sourceDir);

    // Summary
    hdr("Done");
    console.log("");
    const commitAfter = execSilent("git rev-parse --short HEAD") || "unknown";
    if (pulled) {
      console.log(`  Updated: ${commitBefore} \u2192 ${commitAfter}`);
    } else {
      console.log(`  Commit: ${commitAfter}`);
    }
    ok("Dependencies up to date");
    console.log("");
    console.log(`  ${DIM}Skill is ready to use.${NC}`);
    console.log("");
  } else {
    info("Re-installing skill from npm package ...");
    copySkillFiles();
    sourceDir = SKILL_INSTALL_DIR;

    hdr("Dependencies");
    const nm = join(sourceDir, "node_modules");
    if (existsSync(nm)) {
      rmSync(nm, { recursive: true, force: true });
    }
    installDeps(sourceDir, { prodOnly: true });

    await verifySymlinks(sourceDir, false);

    hdr("Done");
    console.log("");
    ok("Skill updated and ready to use.");
    console.log("");
  }
}

/**
 * Attempt git pull with user confirmation and fallback strategies.
 * Returns { pulled, commitBefore } so the caller can show a before/after summary.
 */
async function gitPull() {
  const branch = execSilent("git rev-parse --abbrev-ref HEAD") || "unknown";
  const commitBefore = execSilent("git rev-parse --short HEAD") || "unknown";
  const result = { pulled: false, commitBefore };

  info(`Branch: ${branch} @ ${commitBefore}`);

  const hasRemote = execSilent("git remote get-url origin", { stdio: "ignore" }) !== null;
  if (!hasRemote) {
    info("No git remote configured \u2014 skipping pull");
    return result;
  }

  const status = execSilent("git status --porcelain") || "";
  const dirty = status.length > 0;

  let doPull;
  if (dirty) {
    warn("Working tree has uncommitted changes");
    doPull = await confirmYes("Pull anyway?", false);
  } else {
    doPull = await confirmYes("Pull latest changes?");
  }

  if (!doPull) {
    info("Skipped git pull");
    return result;
  }

  // Try fast-forward first
  try {
    execSync("git pull --ff-only", { cwd: PKG_ROOT, stdio: "inherit" });
    ok("Fast-forward pull succeeded");
    return { pulled: true, commitBefore };
  } catch {
    // Fall through to merge attempt
  }

  warn("Fast-forward failed (diverged history)");
  if (await confirmYes("Try merge pull instead?", false)) {
    try {
      execSync("git pull", { cwd: PKG_ROOT, stdio: "inherit" });
      ok("Merge pull succeeded");
      return { pulled: true, commitBefore };
    } catch {
      err("Merge pull failed \u2014 resolve conflicts manually");
    }
  } else {
    info("Skipped pull");
  }

  return result;
}

function cmdDoctor() {
  banner("environment check");

  checkPrerequisites();

  const sourceDir = resolveSourceDir();

  hdr("Skill installation");

  // Check symlinks
  for (const [label, dir] of AGENT_TARGETS) {
    const target = join(dir, SKILL_NAME);
    if (existsSync(target) && lstatSync(target).isSymbolicLink()) {
      const existing = readlinkSync(target);
      ok(`${label}: ${target} \u2192 ${existing}`);
    } else if (existsSync(target)) {
      warn(`${label}: ${target} exists but is not a symlink`);
    } else {
      info(`${label}: not installed`);
    }
  }

  // Check SKILL.md
  if (existsSync(join(sourceDir, "SKILL.md"))) {
    ok(`SKILL.md found at ${sourceDir}`);
  } else {
    err("SKILL.md not found");
  }

  // Check node_modules
  if (existsSync(join(sourceDir, "node_modules"))) {
    ok("node_modules present");
  } else {
    warn("node_modules missing \u2014 run install to fix");
  }

  // Check scripts
  hdr("Scripts");
  const scriptsDir = join(sourceDir, "scripts");
  if (existsSync(scriptsDir)) {
    const scripts = readdirSync(scriptsDir).filter((f) => f.endsWith(".ts"));
    ok(`${scripts.length} TypeScript scripts found`);
  } else {
    err("scripts/ directory not found");
  }

  // Check check-env.ts
  const checkEnvScript = join(sourceDir, "scripts", "check-env.ts");
  if (existsSync(checkEnvScript)) {
    hdr("Environment (check-env.ts)");
    try {
      execSync(`npx tsx "${checkEnvScript}"`, {
        cwd: sourceDir,
        stdio: "inherit",
        timeout: 30000,
      });
    } catch {
      warn("check-env.ts exited with errors (see above)");
    }
  }

  // Config
  hdr("Configuration");
  const configPath = join(USER_DATA_DIR, "config.json");
  if (existsSync(configPath)) {
    ok(`Config: ${configPath}`);
  } else {
    info("No config \u2014 run Configure in your agent to set up");
  }

  const wcStorage = join(USER_DATA_DIR, "wc-storage.json");
  if (existsSync(wcStorage)) {
    ok("WalletConnect session file present");
  } else {
    info("No WalletConnect session");
  }

  console.log("");
}

function showHelp() {
  console.log(`
${BOLD}${SKILL_NAME}${NC} \u2014 ERC-8004 on-chain agent economy skill

${BOLD}Usage:${NC}
  npx ${SKILL_NAME} <command>

${BOLD}Commands:${NC}
  install     Install the skill (Claude Code and/or OpenClaw)
  uninstall   Remove symlinks, installed files, and optionally user data
  update      Pull latest changes and refresh dependencies
  doctor      Check installation and environment status

${BOLD}Examples:${NC}
  npx ${SKILL_NAME} install        # Install via npm
  node bin/cli.mjs install       # Install from git clone
  npx ${SKILL_NAME} doctor         # Check environment

${BOLD}More info:${NC}
  https://github.com/matteoscurati/8004skill
`);
}

// ── Main ──────────────────────────────────────────────────────────────
const COMMANDS = {
  install: cmdInstall,
  uninstall: cmdUninstall,
  update: cmdUpdate,
  doctor: cmdDoctor,
  help: showHelp,
  "--help": showHelp,
  "-h": showHelp,
};

const command = process.argv[2];
const handler = COMMANDS[command];

if (handler) {
  const result = handler();
  if (result && typeof result.catch === "function") {
    result.catch((e) => {
      err(e.message);
      process.exit(1);
    });
  }
} else {
  if (command) {
    err(`Unknown command: ${command}`);
    console.log("");
  }
  showHelp();
  if (command) process.exit(1);
}

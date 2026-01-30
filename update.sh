#!/usr/bin/env bash
set -euo pipefail

# ── Formatting ────────────────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

ok()   { printf "${GREEN}✓${NC} %s\n" "$1"; }
info() { printf "${CYAN}→${NC} %s\n" "$1"; }
warn() { printf "${YELLOW}⚠${NC} %s\n" "$1"; }
err()  { printf "${RED}✗${NC} %s\n" "$1"; }
hdr()  { printf "\n${BOLD}%s${NC}\n" "$1"; }

# ── Project root = directory containing this script ───────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_NAME="8004skill"

# Agent skill directories
CLAUDE_SKILLS_DIR="$HOME/.claude/skills"
OPENCLAW_SKILLS_DIR="$HOME/.openclaw/skills"

# ── Header ────────────────────────────────────────────────────────────
printf "\n${BOLD}8004skill${NC} ${DIM}— update wizard${NC}\n"
printf "${DIM}ERC-8004 on-chain agent economy skill${NC}\n"

# ── 1. Prerequisites ─────────────────────────────────────────────────
hdr "Prerequisites"

case "$(uname -s)" in
  Darwin|Linux) ok "Platform: $(uname -s)" ;;
  *) err "Unsupported platform: $(uname -s) (macOS and Linux only)"; exit 1 ;;
esac

if ! command -v node &>/dev/null; then
  err "Node.js not found. Version >= 22.0.0 required."
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 22 ]; then
  err "Node.js $(node -v) found — >= 22.0.0 required."
  exit 1
fi
ok "Node.js $(node -v)"

if ! command -v npm &>/dev/null; then
  err "npm not found. Required to install dependencies."
  exit 1
fi
ok "npm $(npm -v)"

# ── 2. Git pull ──────────────────────────────────────────────────────
hdr "Source update"

DID_PULL=false
COMMIT_BEFORE="unknown"

try_pull() {
  if git -C "$SCRIPT_DIR" pull --ff-only 2>/dev/null; then
    ok "Fast-forward pull succeeded"
    DID_PULL=true
    return
  fi

  warn "Fast-forward failed (diverged history)"
  read -rp "Try merge pull instead? [y/N]: " ans
  if [[ ! "${ans:-N}" =~ ^[Yy] ]]; then
    info "Skipped pull"
    return
  fi

  if git -C "$SCRIPT_DIR" pull 2>/dev/null; then
    ok "Merge pull succeeded"
    DID_PULL=true
  else
    err "Merge pull failed — resolve conflicts manually"
  fi
}

if [ -d "$SCRIPT_DIR/.git" ]; then
  BRANCH="$(git -C "$SCRIPT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"
  COMMIT_BEFORE="$(git -C "$SCRIPT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")"

  if [ -n "$BRANCH" ]; then
    info "Branch: $BRANCH @ $COMMIT_BEFORE"
  fi

  if ! git -C "$SCRIPT_DIR" remote get-url origin &>/dev/null; then
    info "No git remote configured — skipping pull"
  elif [ -n "$(git -C "$SCRIPT_DIR" status --porcelain 2>/dev/null)" ]; then
    warn "Working tree has uncommitted changes"
    read -rp "Pull anyway? [y/N]: " ans
    if [[ "${ans:-N}" =~ ^[Yy] ]]; then
      try_pull
    else
      info "Skipped git pull"
    fi
  else
    read -rp "Pull latest changes? [Y/n]: " ans
    if [[ "${ans:-Y}" =~ ^[Yy] ]]; then
      try_pull
    else
      info "Skipped git pull"
    fi
  fi
else
  info "Not a git repository — skipping source update"
fi

# ── 3. npm install ───────────────────────────────────────────────────
hdr "Dependencies"

info "Running npm install …"
npm install --prefix "$SCRIPT_DIR" --silent
ok "Dependencies installed"

# ── 4. Verify symlinks ──────────────────────────────────────────────
hdr "Verify symlinks"

verify_link() {
  local label="$1"  # e.g. "Claude Code"
  local dir="$2"    # e.g. ~/.claude/skills
  local target="$dir/$SKILL_NAME"

  # Already correctly linked — nothing to do
  if [ -L "$target" ]; then
    local existing
    existing="$(readlink "$target")"
    if [ "$existing" = "$SCRIPT_DIR" ]; then
      ok "$label: linked"
      return
    fi
    warn "$label: symlink points to $existing (expected $SCRIPT_DIR)"
  elif [ -e "$target" ]; then
    warn "$label: $target exists but is not a symlink"
  else
    warn "$label: not installed"
  fi

  # Offer to fix / install
  read -rp "  Fix $label symlink? [Y/n]: " ans
  if [[ ! "${ans:-Y}" =~ ^[Yy] ]]; then
    info "Skipped"
    return
  fi

  rm -rf "$target"
  mkdir -p "$dir"
  ln -s "$SCRIPT_DIR" "$target"
  ok "$label: $target → $SCRIPT_DIR"
}

verify_link "Claude Code" "$CLAUDE_SKILLS_DIR"
verify_link "OpenClaw"    "$OPENCLAW_SKILLS_DIR"

# ── 5. Summary ──────────────────────────────────────────────────────
hdr "Done"
echo ""

COMMIT_AFTER="$(git -C "$SCRIPT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")"
if $DID_PULL; then
  echo "  Updated: $COMMIT_BEFORE → $COMMIT_AFTER"
else
  echo "  Commit: $COMMIT_AFTER"
fi
ok "Dependencies up to date"

echo ""
printf "  ${DIM}Skill is ready to use.${NC}\n"
echo ""

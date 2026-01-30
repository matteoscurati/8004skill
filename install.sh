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

# Agent skill directories (personal / managed scope)
CLAUDE_SKILLS_DIR="$HOME/.claude/skills"
OPENCLAW_SKILLS_DIR="$HOME/.openclaw/skills"

# ── Header ────────────────────────────────────────────────────────────
printf "\n${BOLD}8004skill${NC} ${DIM}— installation wizard${NC}\n"
printf "${DIM}ERC-8004 on-chain agent economy skill${NC}\n"

# ── 1. Platform check ────────────────────────────────────────────────
hdr "Prerequisites"

case "$(uname -s)" in
  Darwin|Linux) ok "Platform: $(uname -s)" ;;
  *) err "Unsupported platform: $(uname -s) (macOS and Linux only)"; exit 1 ;;
esac

# ── 2. Node.js >= 22 ─────────────────────────────────────────────────
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

# ── 3. npm ────────────────────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  err "npm not found. Required to install dependencies."
  exit 1
fi
ok "npm $(npm -v)"

# ── 4. Detect installed agents ───────────────────────────────────────
HAVE_CLAUDE=false
HAVE_OPENCLAW=false
command -v claude   &>/dev/null && HAVE_CLAUDE=true
command -v openclaw &>/dev/null && HAVE_OPENCLAW=true

# ── 5. Choose target agents ──────────────────────────────────────────
hdr "Select agents"
echo "Where should the skill be installed?"
echo ""
echo "  1) Claude Code       ~/.claude/skills/"
echo "  2) OpenClaw          ~/.openclaw/skills/"
echo "  3) Both              (recommended)"
echo ""
read -rp "Choice [3]: " CHOICE
CHOICE="${CHOICE:-3}"

DO_CLAUDE=false
DO_OPENCLAW=false

case "$CHOICE" in
  1)    DO_CLAUDE=true ;;
  2)    DO_OPENCLAW=true ;;
  3) DO_CLAUDE=true; DO_OPENCLAW=true ;;
  *)    err "Invalid choice"; exit 1 ;;
esac

# ── 6. npm install ────────────────────────────────────────────────────
hdr "Dependencies"

if [ -d "$SCRIPT_DIR/node_modules" ]; then
  ok "node_modules present"
else
  info "Running npm install …"
  npm install --prefix "$SCRIPT_DIR" --silent
  ok "Dependencies installed"
fi

# ── 7. Link skill into agent directories ──────────────────────────────
hdr "Linking skill"

link_skill() {
  local label="$1"  # e.g. "Claude Code"
  local dir="$2"    # e.g. ~/.claude/skills
  local target="$dir/$SKILL_NAME"

  # Already a correct symlink
  if [ -L "$target" ]; then
    local existing
    existing="$(readlink "$target")"
    if [ "$existing" = "$SCRIPT_DIR" ]; then
      ok "$label: already linked"
      return
    fi
    warn "$label: symlink exists → $existing"
    read -rp "  Replace? [Y/n]: " ans
    if [[ "${ans:-Y}" =~ ^[Yy] ]]; then
      rm "$target"
    else
      info "Skipped"; return
    fi
  elif [ -e "$target" ]; then
    warn "$label: $target already exists (not a symlink)"
    read -rp "  Replace with symlink? [Y/n]: " ans
    if [[ "${ans:-Y}" =~ ^[Yy] ]]; then
      rm -rf "$target"
    else
      info "Skipped"; return
    fi
  fi

  mkdir -p "$dir"
  ln -s "$SCRIPT_DIR" "$target"
  ok "$label: $target → $SCRIPT_DIR"
}

if $DO_CLAUDE; then
  link_skill "Claude Code" "$CLAUDE_SKILLS_DIR"
fi
if $DO_OPENCLAW; then
  link_skill "OpenClaw" "$OPENCLAW_SKILLS_DIR"
fi

# ── 8. Summary ────────────────────────────────────────────────────────
hdr "Done"
echo ""
echo "  Open your agent in any directory and try:"
echo ""
printf "    ${BOLD}/8004skill${NC}\n"
echo ""
echo "  or just ask:"
echo ""
printf "    ${DIM}\"Register my agent on-chain\"${NC}\n"
printf "    ${DIM}\"Search for agents that do summarization\"${NC}\n"
printf "    ${DIM}\"Configure 8004 for Sepolia\"${NC}\n"
echo ""

# Helpful warnings for missing CLIs
if $DO_CLAUDE && ! $HAVE_CLAUDE; then
  warn "Claude Code CLI not detected — install from https://docs.anthropic.com/en/docs/claude-code"
fi
if $DO_OPENCLAW && ! $HAVE_OPENCLAW; then
  warn "OpenClaw CLI not detected — install from https://openclaw.org"
fi

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
USER_DATA_DIR="$HOME/.8004skill"

# ── Header ────────────────────────────────────────────────────────────
printf "\n${BOLD}8004skill${NC} ${DIM}— uninstall wizard${NC}\n"
printf "${DIM}ERC-8004 on-chain agent economy skill${NC}\n"

# ── 1. Detect installations ──────────────────────────────────────────
hdr "Detecting installation"

FOUND=()    # items detected
REMOVED=()  # items actually removed

detect_link() {
  local label="$1"
  local target="$2"

  if [ -L "$target" ]; then
    local existing
    existing="$(readlink "$target")"
    if [ "$existing" = "$SCRIPT_DIR" ]; then
      ok "$label symlink: $target"
      FOUND+=("$label symlink|$target")
      return
    fi
    info "$label symlink exists but points elsewhere → $existing"
  elif [ -e "$target" ]; then
    info "$label path exists but is not a symlink: $target"
  fi
}

detect_link "Claude Code" "$CLAUDE_SKILLS_DIR/$SKILL_NAME"
detect_link "OpenClaw"    "$OPENCLAW_SKILLS_DIR/$SKILL_NAME"

if [ -d "$USER_DATA_DIR" ]; then
  ok "User data: $USER_DATA_DIR"
  FOUND+=("User data|$USER_DATA_DIR")
fi

for artifact in node_modules dist; do
  if [ -d "$SCRIPT_DIR/$artifact" ]; then
    ok "Build artifact: $artifact/"
    FOUND+=("Build artifact ($artifact)|$SCRIPT_DIR/$artifact")
  fi
done

# ── 2. Early exit if nothing found ───────────────────────────────────
if [ ${#FOUND[@]} -eq 0 ]; then
  echo ""
  info "Nothing to uninstall."
  echo ""
  exit 0
fi

# ── 3. Show uninstall plan ───────────────────────────────────────────
hdr "Uninstall plan"

for item in "${FOUND[@]}"; do
  echo "    • ${item%%|*}"
done
echo ""

# ── 4. Remove symlinks ──────────────────────────────────────────────
remove_links() {
  local has_links=false
  for item in "${FOUND[@]}"; do
    [[ "$item" == *symlink* ]] && has_links=true
  done
  $has_links || return 0

  hdr "Remove symlinks"
  read -rp "Remove skill symlinks? [Y/n]: " ans
  if [[ ! "${ans:-Y}" =~ ^[Yy] ]]; then
    info "Skipped symlink removal"
    return
  fi

  for item in "${FOUND[@]}"; do
    if [[ "$item" == *symlink* ]]; then
      local path="${item#*|}"
      rm "$path"
      ok "Removed $path"
      REMOVED+=("${item%%|*}")
    fi
  done
}
remove_links

# ── 5. Remove user data ─────────────────────────────────────────────
for item in "${FOUND[@]}"; do
  if [[ "$item" == "User data"* ]]; then
    hdr "Remove user data"
    warn "This will delete your config and registration records in $USER_DATA_DIR"
    read -rp "Remove user data? [y/N]: " ans
    if [[ "${ans:-N}" =~ ^[Yy] ]]; then
      rm -rf "$USER_DATA_DIR"
      ok "Removed $USER_DATA_DIR"
      REMOVED+=("User data")
    else
      info "Kept user data"
    fi
    break
  fi
done

# ── 6. Clean build artifacts ────────────────────────────────────────
remove_artifacts() {
  local has_artifacts=false
  for item in "${FOUND[@]}"; do
    [[ "$item" == "Build artifact"* ]] && has_artifacts=true
  done
  $has_artifacts || return 0

  hdr "Clean build artifacts"
  read -rp "Remove build artifacts? [y/N]: " ans
  if [[ ! "${ans:-N}" =~ ^[Yy] ]]; then
    info "Kept build artifacts"
    return
  fi

  for item in "${FOUND[@]}"; do
    if [[ "$item" == "Build artifact"* ]]; then
      local path="${item#*|}"
      local name="${path##*/}"
      rm -rf "$path"
      ok "Removed $name/"
      REMOVED+=("${item%%|*}")
    fi
  done
}
remove_artifacts

# ── 7. Summary ──────────────────────────────────────────────────────
hdr "Done"
echo ""

if [ ${#REMOVED[@]} -gt 0 ]; then
  echo "  Removed:"
  for label in "${REMOVED[@]}"; do
    echo "    • $label"
  done
else
  info "Nothing was removed."
fi

echo ""
printf "  ${DIM}Source code is untouched.${NC}\n"
printf "  ${DIM}To reinstall, run: ./install.sh${NC}\n"
echo ""

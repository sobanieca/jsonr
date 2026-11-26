#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO="sobanieca/jsonr"
BINARY_NAME="jsonr"
SCRIPT_URL="adam.sobaniec.com/jsonr/install.sh"

usage() {
  cat <<USAGE
Install jsonr for Linux or macOS (x64, arm64).

Usage:
  curl -fsSL ${SCRIPT_URL} | bash

jsonr is installed to ~/.jsonr/bin, with no sudo needed. If that folder is not on
your PATH, the script asks to add it in your shell's startup file (~/.bashrc,
~/.zshrc, fish's conf.d or ~/.profile). Run as root, it installs to
/usr/local/bin instead.

To install to another folder, set INSTALL_DIR:
  curl -fsSL ${SCRIPT_URL} | INSTALL_DIR=~/.local/bin bash

To leave your shell's startup file unchanged, set JSONR_NO_MODIFY_PATH=1.
USAGE
}

case "${1:-}" in
  -h|--help)
    usage
    exit 0
    ;;
  "")
    ;;
  *)
    echo -e "${RED}Error: Unknown argument: $1${NC}"
    echo ""
    usage
    exit 1
    ;;
esac

# A path with the home folder shown as ~
shown() {
  case "$1" in
    "$HOME"/*) echo "~${1#"$HOME"}" ;;
    *) echo "$1" ;;
  esac
}

if [ -n "${INSTALL_DIR:-}" ]; then
  case "${INSTALL_DIR}" in
    "~"/*) INSTALL_DIR="$HOME${INSTALL_DIR#"~"}" ;;
  esac
elif [ "$(id -u)" = 0 ]; then
  INSTALL_DIR="/usr/local/bin"
elif [ -z "${HOME:-}" ]; then
  echo -e "${RED}Error: HOME is not set${NC}"
  echo "Set INSTALL_DIR to a folder on your PATH, e.g.:"
  echo "  curl -fsSL ${SCRIPT_URL} | INSTALL_DIR=/usr/local/bin bash"
  exit 1
else
  INSTALL_DIR="$HOME/.jsonr/bin"
fi

install_failed() {
  echo -e "${RED}Error: Could not install jsonr to ${INSTALL_DIR}${NC}"
  echo "Set INSTALL_DIR to a folder you can write to, e.g.:"
  echo "  curl -fsSL ${SCRIPT_URL} | INSTALL_DIR=~/.local/bin bash"
  exit 1
}

echo "Installing jsonr..."
echo ""

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Linux*)
    OS_TYPE="linux"
    ;;
  Darwin*)
    OS_TYPE="macos"
    ;;
  *)
    echo -e "${RED}Error: Unsupported operating system: $OS${NC}"
    echo "Supported: Linux, macOS"
    exit 1
    ;;
esac

# Detect Architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64)
    ARCH_TYPE="x64"
    ;;
  aarch64|arm64)
    ARCH_TYPE="arm64"
    ;;
  *)
    echo -e "${RED}Error: Unsupported architecture: $ARCH${NC}"
    echo "Supported: x86_64, arm64"
    exit 1
    ;;
esac

# Check the install directory before downloading anything
mkdir -p "${INSTALL_DIR}" 2> /dev/null || install_failed
[ -w "${INSTALL_DIR}" ] || install_failed

# Construct binary name
BINARY_FILE="jsonr-${OS_TYPE}-${ARCH_TYPE}"
DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${BINARY_FILE}"

echo "Detected system: ${OS_TYPE}-${ARCH_TYPE}"
echo "Download URL: ${DOWNLOAD_URL}"
echo ""

# Create temporary directory
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

# Download binary
echo "Downloading jsonr..."
if command -v curl &> /dev/null; then
  curl -fsSL -o "${TMP_DIR}/${BINARY_NAME}" "${DOWNLOAD_URL}"
elif command -v wget &> /dev/null; then
  wget -q -O "${TMP_DIR}/${BINARY_NAME}" "${DOWNLOAD_URL}"
else
  echo -e "${RED}Error: Neither curl nor wget is available${NC}"
  echo "Please install curl or wget and try again"
  exit 1
fi

# Make binary executable
chmod +x "${TMP_DIR}/${BINARY_NAME}"

# Install binary
echo "Installing to ${INSTALL_DIR}/${BINARY_NAME}..."
mv -f "${TMP_DIR}/${BINARY_NAME}" "${INSTALL_DIR}/${BINARY_NAME}" || install_failed

echo ""
echo -e "${GREEN}✓ jsonr has been installed successfully!${NC}"
VERSION=$("${INSTALL_DIR}/${BINARY_NAME}" --version 2>&1 || echo "unknown")
echo "Installed version: ${VERSION}"
echo ""

# The folder as it goes into a startup file: $HOME stays a variable there.
case "${INSTALL_DIR}" in
  "$HOME"/*) PATH_DIR="\$HOME${INSTALL_DIR#"$HOME"}" ;;
  *) PATH_DIR="${INSTALL_DIR}" ;;
esac

# The startup file of the user's shell and the line that puts the folder on PATH.
case "$(basename "${SHELL:-sh}")" in
  zsh)
    PROFILE="${ZDOTDIR:-$HOME}/.zshrc"
    PATH_LINE="export PATH=\"${PATH_DIR}:\$PATH\""
    ;;
  bash)
    if [ "${OS_TYPE}" = macos ]; then
      PROFILE="$HOME/.bash_profile"
    else
      PROFILE="$HOME/.bashrc"
    fi
    PATH_LINE="export PATH=\"${PATH_DIR}:\$PATH\""
    ;;
  fish)
    PROFILE="${XDG_CONFIG_HOME:-$HOME/.config}/fish/conf.d/jsonr.fish"
    PATH_LINE="contains \"${PATH_DIR}\" \$PATH; or set -gx PATH \"${PATH_DIR}\" \$PATH"
    ;;
  *)
    PROFILE="$HOME/.profile"
    PATH_LINE="export PATH=\"${PATH_DIR}:\$PATH\""
    ;;
esac
PROFILE_SHOWN="$(shown "${PROFILE}")"

# Whether a question can be asked: with `curl | bash` the script itself is on stdin,
# so the answer is read from the terminal.
can_ask() {
  (exec < /dev/tty) 2> /dev/null
}

add_to_path() {
  mkdir -p "$(dirname "${PROFILE}")" &&
    printf '\n# jsonr\n%s\n' "${PATH_LINE}" >> "${PROFILE}"
}

case ":${PATH}:" in
  *":${INSTALL_DIR}:"*)
    echo "Run 'jsonr --help' to get started"
    ;;
  *)
    if [ -f "${PROFILE}" ] && grep -qF "${PATH_LINE}" "${PROFILE}"; then
      # Added by an earlier install, the current shell started before that.
      ADDED=1
    elif [ "${JSONR_NO_MODIFY_PATH:-}" = 1 ] || ! can_ask; then
      ADDED=""
    else
      printf "Add %s to PATH in %s? [Y/n] " "$(shown "${INSTALL_DIR}")" "${PROFILE_SHOWN}"
      read -r ANSWER < /dev/tty || ANSWER=n
      case "${ANSWER}" in
        ""|y|Y|yes|Yes|YES)
          if add_to_path; then
            echo -e "${GREEN}✓ Added to ${PROFILE_SHOWN}${NC}"
            ADDED=1
          else
            echo -e "${YELLOW}Warning: Could not write to ${PROFILE_SHOWN}${NC}"
            ADDED=""
          fi
          ;;
        *)
          ADDED=""
          ;;
      esac
      echo ""
    fi

    if [ -n "${ADDED}" ]; then
      echo "Open a new terminal, or run this to use jsonr in this one:"
      echo "  export PATH=\"${INSTALL_DIR}:\$PATH\""
    else
      echo -e "${YELLOW}$(shown "${INSTALL_DIR}") is not on your PATH${NC}"
      echo "To use jsonr, add this line to ${PROFILE_SHOWN}:"
      echo "  ${PATH_LINE}"
    fi
    echo ""
    echo "Then run 'jsonr --help' to get started"
    ;;
esac

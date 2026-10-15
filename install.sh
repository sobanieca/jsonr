#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO="sobanieca/jsonr"
DEFAULT_INSTALL_DIR="/usr/local/bin"
BINARY_NAME="jsonr"
SCRIPT_URL="sobanieca.github.io/jsonr/install.sh"

usage() {
  cat <<USAGE
Install jsonr for Linux or macOS (x64, arm64).

Usage:
  curl -fsSL ${SCRIPT_URL} | bash

By default jsonr is installed to ${DEFAULT_INSTALL_DIR}, for all users. If you
can't write to it, run the script with sudo:
  curl -fsSL ${SCRIPT_URL} | sudo bash

To install to a custom location, set INSTALL_DIR to a directory that is
on your PATH:
  curl -fsSL ${SCRIPT_URL} | INSTALL_DIR=~/.local/bin bash
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

if [ -n "${INSTALL_DIR:-}" ]; then
  CUSTOM_INSTALL_DIR=1
else
  CUSTOM_INSTALL_DIR=""
  INSTALL_DIR="${DEFAULT_INSTALL_DIR}"
fi

install_failed() {
  echo -e "${RED}Error: Could not install jsonr to ${INSTALL_DIR}${NC}"
  if [ -n "${CUSTOM_INSTALL_DIR}" ]; then
    echo "INSTALL_DIR must be a writable directory that is on your PATH, e.g.:"
    echo "  curl -fsSL ${SCRIPT_URL} | INSTALL_DIR=~/.local/bin bash"
  else
    echo "Most likely you need to run the script with sudo:"
    echo "  curl -fsSL ${SCRIPT_URL} | sudo bash"
    echo "or set INSTALL_DIR to a directory that is on your PATH, e.g.:"
    echo "  curl -fsSL ${SCRIPT_URL} | INSTALL_DIR=~/.local/bin bash"
  fi
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
echo ""
echo "Run 'jsonr --help' to get started"
echo ""

# Verify installation
case ":${PATH}:" in
  *":${INSTALL_DIR}:"*)
    VERSION=$("${INSTALL_DIR}/${BINARY_NAME}" --version 2>&1 || echo "unknown")
    echo "Installed version: ${VERSION}"
    ;;
  *)
    echo -e "${YELLOW}Warning: ${INSTALL_DIR} is not on your PATH${NC}"
    echo "Add it to your PATH, or set INSTALL_DIR to a directory that is on your PATH"
    ;;
esac

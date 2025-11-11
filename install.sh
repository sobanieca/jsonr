#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO="sobanieca/jsonr"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
BINARY_NAME="jsonr"

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

# Construct binary name
BINARY_FILE="jsonr-${OS_TYPE}-${ARCH_TYPE}"
DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${BINARY_FILE}"

echo "Detected system: ${OS_TYPE}-${ARCH_TYPE}"
echo "Download URL: ${DOWNLOAD_URL}"
echo ""

# Create temporary directory
TMP_DIR="$(mktemp -d)"
trap "rm -rf ${TMP_DIR}" EXIT

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

# Check if we need sudo for installation
if [ -w "$INSTALL_DIR" ]; then
  SUDO=""
else
  SUDO="sudo"
  echo -e "${YELLOW}Note: sudo is required to install to ${INSTALL_DIR}${NC}"
fi

# Install binary
echo "Installing to ${INSTALL_DIR}/${BINARY_NAME}..."
$SUDO mv "${TMP_DIR}/${BINARY_NAME}" "${INSTALL_DIR}/${BINARY_NAME}"

echo ""
echo -e "${GREEN}✓ jsonr has been installed successfully!${NC}"
echo ""
echo "Run 'jsonr --help' to get started"
echo ""

# Verify installation
if command -v jsonr &> /dev/null; then
  VERSION=$(jsonr --version 2>&1 || echo "unknown")
  echo "Installed version: ${VERSION}"
else
  echo -e "${YELLOW}Warning: ${INSTALL_DIR} may not be in your PATH${NC}"
  echo "Add it to your PATH or move the binary to a directory in your PATH"
fi

#!/bin/bash
# =============================================================================
# Execute Command Script
# =============================================================================
# Executes a command in the Hytale server by writing to stdin.
# Used by the Server Manager's ConsoleAdapter for remote command execution.
#
# Usage: /opt/scripts/cmd/exec.sh <command>
# Example: /opt/scripts/cmd/exec.sh "say Hello World"
# =============================================================================

set -e

# Get the command from arguments
COMMAND="$*"

if [[ -z "$COMMAND" ]]; then
    echo "Usage: $0 <command>" >&2
    exit 1
fi

# Find the server process
SERVER_PID=$(pgrep -f "HytaleServer.jar" || true)

if [[ -z "$SERVER_PID" ]]; then
    echo "Error: Hytale server process not found" >&2
    exit 1
fi

# Write command to server stdin
# The server reads commands from stdin when running interactively
echo "$COMMAND" > /proc/"$SERVER_PID"/fd/0

echo "Command sent: $COMMAND"

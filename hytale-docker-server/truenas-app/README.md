# Hytale Server TrueNAS App

This is the TrueNAS community app definition for the Hytale dedicated game server.

## Features

- Hytale dedicated game server with OAuth authentication
- Optional HyOS Manager web UI for server management
- Auto-update support with configurable schedules
- Mod support with automatic validation
- REST API for external integrations
- Periodic world backups

## Containers

1. **hytale-server** - The main Hytale game server
2. **hytale-manager** (optional) - Web UI for server management

## Requirements

- TrueNAS SCALE 24.10.2.2 or later
- Minimum 8GB RAM (12GB+ recommended)
- 4+ CPU cores recommended

## Authentication

The server uses OAuth device code flow for authentication. On first start:

1. Check the container logs for an authentication URL and code
2. Visit the URL and enter the code
3. The server will automatically continue once authenticated

If using the HyOS Manager, the authentication status is shown in the web UI.

## Documentation

For full documentation, see:
- [GitHub Repository](https://github.com/reisscashmore/hyos)
- [Hytale Official](https://hytale.com)

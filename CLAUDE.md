# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

hyOS is a Hytale server management ecosystem consisting of:
- **hytale-docker-server/**: Docker configurations for running Hytale dedicated servers (config-minimal, config-developer, config-enterprise, config-truenas)
- **server-manager/**: Next.js web UI for managing Hytale servers (uses Dockerode for container control)
- **reference-implementations/**: Third-party implementations for research/reference

## Development Commands

### Server Manager (Next.js + React 19)
```bash
cd server-manager/hyos-server-manager/next
pnpm install
pnpm dev           # Development server (default port 3000)
pnpm build         # Production build
pnpm lint          # Biome linting
pnpm format        # Biome formatting
```

### Hytale Docker Server (config-developer)
```bash
cd hytale-docker-server/config-developer
bun install
bun run dev        # Development with watch mode
bun run build      # Build to dist/
docker build -t hytale-server-dev .
```

### TrueNAS Configuration
See `hytale-docker-server/config-truenas/SETUP.md` for comprehensive deployment guide.

## Architecture

### Docker Server Configurations
- **config-minimal**: Lightweight server for testing
- **config-developer**: Full-featured with TypeScript/Bun runtime, mod support, verbose logging
- **config-enterprise**: Production-grade (planned)
- **config-truenas**: TrueNAS SCALE Custom Apps integration with state file API

### Server Manager Stack
- Next.js 16 with App Router
- React 19 with TypeScript
- Tailwind CSS 4
- Biome for linting/formatting (not ESLint)
- Dockerode for Docker API integration

### State File API (TrueNAS config)
Docker containers expose state via JSON files in `/data/.state/`:
- `server.json` - Server status (starting/running/stopped/crashed)
- `version.json` - Current version and update availability
- `auth.json` - OAuth authentication status
- `config.json` - Sanitized server configuration
- `health.json` - Health check results

## Key Patterns

### Environment Variables (Docker configs)
All Hytale server CLI options available via `HYTALE_*` environment variables. JVM settings via `JAVA_XMS`, `JAVA_XMX`. See SETUP.md for complete reference.

### Best Practices Reference
The `.claude/reference/` directory contains detailed guides:
- `react-frontend-best-practices.md` - For React/Vite patterns
- `deployment-best-practices.md` - For Docker and deployment
- `testing-and-logging.md` - For structlog and testing strategies

### Custom Claude Commands
Available in `.claude/commands/`:
- `create-prd.md` - Create product requirements documents
- `init-project.md` - Initialize new projects
- `commit.md` - Git commit workflow

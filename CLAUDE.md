# autotask-mcp Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-17

## Active Technologies
- TypeScript 5.3 targeting Node.js 20+ + @modelcontextprotocol/sdk ^1.18.2, autotask-node ^1.0.0 (REST API client with known limitations), axios ^1.12.2 (for REST workarounds), zod ^3.22.4, winston ^3.11.0 (004-mcp-best-practices-review)

## Known Library Limitations
- `autotask-node` library has broken methods (e.g., Projects endpoint uses GET instead of POST)
- When autotask-node methods fail, use direct axios REST API calls as workaround
- All API interactions are REST/JSON - no SOAP/XML in this codebase

## Project Structure
```
src/
tests/
```

## Commands
npm test && npm run lint

## Code Style
TypeScript 5.3 targeting Node.js 20+: Follow standard conventions

## Recent Changes
- 004-mcp-best-practices-review: Added TypeScript 5.3 targeting Node.js 20+ + @modelcontextprotocol/sdk ^1.18.2, autotask-node ^1.0.0, zod ^3.22.4, winston ^3.11.0

## Release Process

**IMPORTANT:** Releases are intentional and controlled - they happen ONLY when explicitly requested.

**Custom semantic-release configuration:**
- Standard commit types (`feat:`, `fix:`) **DO NOT** trigger releases
- Use `release:` commit type to create releases when needed

**Trigger releases with:**
- `release(major):` → Breaking changes (bumps X.0.0)
- `release(minor):` → New features (bumps 0.X.0)
- `release(patch):` → Bug fixes (bumps 0.0.X)

**Example:**
```bash
git commit --allow-empty -m "release(major): MCP best practices compliance

BREAKING CHANGE: All tools now require 'autotask_' prefix."
git push origin main
```

**Automated workflow:** Test → Release → Docker build → Security scan

**Release locations:**
- GitHub: https://github.com/aybouzaglou/autotask-mcp/releases
- Docker: `ghcr.io/aybouzaglou/autotask-mcp:latest` or `:vX.Y.Z`
- Check: `gh release list` or `gh release view vX.Y.Z`

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

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

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

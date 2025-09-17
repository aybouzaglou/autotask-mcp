# Autotask MCP Source Tree

> Last updated: September 17, 2025

The project is a backend-only MCP server. Use this map to orient new development work.

## Top-Level Layout
- `src/` – TypeScript source for the MCP server (see breakdown below)
- `tests/` – Jest test suites (unit + transport smoke tests)
- `scripts/` – Developer utilities (`test-mapping.js`, pagination helpers)
- `docs/` – Product and architecture documentation (brownfield architecture, PRD, testing instructions)
- `dist/` – Compiled JavaScript output (generated; do not edit)
- `smithery.yaml` – Packaging metadata for Smithery distribution
- `.env`, `.env.example` – Environment configuration samples

## Key Source Modules (`src/`)
- `cli.ts` – CLI entrypoint; loads env config and boots the MCP server
- `index.ts` – Exports `createServer` for Smithery/SDK consumers
- `wrapper.ts` – Stdio wrapper that filters non-JSON output

### `src/mcp`
- `server.ts` – `AutotaskMcpServer` orchestrating transports, handlers, and SDK lifecycle

### `src/services`
- `autotask.service.ts` – Lazy Autotask client instantiation, CRUD helpers, pagination logic, and unsupported-operation guards

### `src/handlers`
- `tool.handler.ts` – Primary tool registry delegating to service methods
- `enhanced.tool.handler.ts` – Wraps tool responses with parsing / metadata
- `resource.handler.ts` – Resource listing and single-item fetch logic

### `src/transport`
- `factory.ts` – Creates transports based on runtime config (`stdio`, `http`, or both)
- `stdio.ts` / `http.ts` – Transport implementations extending `TransportBase`
- `index.ts` / `base.ts` – Shared transport abstractions

### `src/utils`
- `config.ts` – Environment/config schema (Zod) and loader utilities
- `logger.ts` – Winston logger singleton
- `mapping.service.ts` – Helpers for schema mapping validation

### `src/types`
- `autotask.ts` – Shared Autotask-related TypeScript types
- `mcp.ts` – MCP-specific type definitions and interfaces

## Tests
- `tests/setup.ts` – Global Jest setup (mock env, logging)
- `tests/transport.test.ts`, `tests/http-transport.test.ts` – Transport factory coverage
- `tests/mapping.test.ts` – Mapping utilities sanity checks
- `tests/autotask-service.test.ts` – Service layer unit tests (mocked Autotask client)
- `tests/basic-autotask-connection.test.ts` – Live Autotask smoke test requiring credentials (skipped without env vars)

## Supporting Assets
- `Dockerfile`, `docker-compose.yml` – Container build/run definitions
- `.releaserc.json` – Semantic-release configuration
- `jest.config.cjs` – Jest configuration file
- `tsconfig.json` – TypeScript compiler options (strict mode enabled)

Refer back to this document when adding new modules to keep the structure predictable for AI agents and human collaborators.

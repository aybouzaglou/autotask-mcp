# Autotask MCP Brownfield Architecture Document

## Introduction
- Purpose-built Model Context Protocol server exposing the Kaseya Autotask PSA API to AI assistants.
- TypeScript codebase using `autotask-node` (REST API client) with axios fallback for broken library methods, packaged via Smithery, and distributed as a CLI (`autotask-mcp`).
- This document reflects the actual system as of commit time and highlights legacy behaviour, workarounds, and technical debt that agents must respect.
- **Important**: All Autotask API interactions use REST/JSON endpoints. No SOAP/XML code exists in this codebase.

### Quick Reference Documents
- Backend-only technology stack summary: `docs/architecture/tech-stack.md`
- Coding conventions and guardrails: `docs/architecture/coding-standards.md`
- Source tree map for navigation: `docs/architecture/source-tree.md`

## System Snapshot
```
┌────────────┐    env+CLI args        ┌───────────────────────┐
│   CLI      │ ─────────────────────▶ │ AutotaskMcpServer     │
│ (src/cli)  │                        │ (handlers + transports)│
└────┬───────┘                        └────────┬──────────────┘
     │                                         │
     │ configSchema (Smithery)                 │ tool/resource handlers
     ▼                                         ▼
┌────────────┐    lazy init            ┌───────────────────────┐
│   Config   │ ─────────────────────▶ │ AutotaskService       │
│ utils      │                        │ (autotask-node client)│
└────────────┘                        └────────┬──────────────┘
                                               │ REST/WS API
                                               ▼
                                      Kaseya Autotask PSA
```

## Execution Flow & Entry Points
- **CLI boot** loads environment variables, merges MCP overrides, then instantiates the server (`src/cli.ts:10-51`). It requires credentials; missing values abort startup with a clear error (`src/cli.ts:29-32`).
- **Smithery integration** exports a configurable `createServer` factory with a Zod schema (`src/index.ts:13-39`). When Smithery drives the server it only returns the MCP `Server` instance; the calling runtime must wire transports manually.
- **Wrapper script** shunts every stdout write to stderr unless the payload looks like JSON-RPC (`src/wrapper.ts:8-58`). This prevents third-party noise from corrupting MCP messages.

## Core Services

### MCP Orchestration
- `AutotaskMcpServer` owns the SDK `Server`, Autotask service, and per-request handlers (`src/mcp/server.ts:21-66`).
- On `start`, it demands a `TransportConfig`; without one startup fails (`src/mcp/server.ts:146-175`). The default config is captured from construction time and reused for restarts.
- Server instructions are static and enumerate the supported resources/tools regardless of feature readiness (`src/mcp/server.ts:199-218`).

### Autotask Service Layer
- `AutotaskService` lazily creates a single `AutotaskClient` and reuses it across calls (`src/services/autotask.service.ts:112-168`). Multiple concurrent initializations wait on the same promise (`src/services/autotask.service.ts:182-208`).
- Read/search helpers exist for most major Autotask entities. Several methods fall back to pagination loops that retrieve *all* matching rows by default, e.g. `searchTickets` paginates 500 records at a time until exhaustion with a hard safety cap of 100 pages (`src/services/autotask.service.ts:353-478`). Similar patterns exist for companies, contacts, resources, etc.
- Ticket data is aggressively truncated to keep responses small. Searches strip descriptions after 200 characters and annotate instructions to call `autotask_get_ticket_details` for full text (`src/services/autotask.service.ts:490-533`).
- Projects require a direct axios REST API call because `autotask-node`'s projects.list() method is broken (uses GET instead of POST with body). The service crafts its own POST to `/Projects/query`, limits fields, and tolerates 405 responses by returning an empty array (`src/services/autotask.service.ts:875-1004`). This is a REST-to-REST workaround, not SOAP fallback.
- Connection checks simply call `accounts.get(0)`; failures are swallowed and reported as `false` (`src/services/autotask.service.ts:1179-1190`).
- Many “Phase 1” entity helpers are stubs that throw descriptive errors because Autotask does not expose the necessary REST endpoints (e.g. billing codes, departments, expense items).

### MCP Request Handlers
- `AutotaskResourceHandler` exposes only five resource URIs (companies, contacts, tickets, time entries) and fetches at most 100 records when listing (`src/handlers/resource.handler.ts:36-147`). Template URIs like `autotask://companies/{id}` are rejected when used directly (`src/handlers/resource.handler.ts:176-188`).
- `AutotaskToolHandler` declares a very large catalogue covering searches, CRUD, and cache utilities. The `callTool` switch delegates to service methods and returns JSON text payloads (`src/handlers/tool.handler.ts:1060-1579`). Error handling wraps failures into `{error, tool, arguments}` payloads with `isError` set.
- `EnhancedAutotaskToolHandler` wraps every tool response, parses the returned JSON, and injects `_enhanced` company/resource names when possible (`src/handlers/enhanced.tool.handler.ts:17-123`). Failed enrichments log at debug level but do not block the base result.

### Mapping & Caching Infrastructure
- `MappingService` is a singleton cache for company and resource names. The first access triggers a full refresh, fanning out to fetch **all** companies and resources via the service layer (`src/utils/mapping.service.ts:50-103` and `src/utils/mapping.service.ts:236-287`).
- Cache expiry is time-based (30 minutes). On misses the service retries a full dataset download (companies) or individual lookups (resources) before giving up (`src/utils/mapping.service.ts:141-210`).
- Autotask instances that return 405 for resources are detected; mapping then degrades gracefully and returns `null` (`src/utils/mapping.service.ts:269-299`).
- Mapping methods return plain strings, not the richer `{id, name, found}` objects implied by the existing `docs/mapping.md` – consumers must not expect that structure.

## Transport Layer
- `TransportFactory` converts configuration into concrete transports and enforces that HTTP settings exist when required (`src/transport/factory.ts:23-55`).
- **STDIO**: wraps the SDK’s `StdioServerTransport`; it has no explicit disconnect beyond clearing the internal flag (`src/transport/stdio.ts:10-33`).
- **HTTP**: present but incomplete. The server ignores the MCP `Server` instance passed during `connect` and simply returns a canned `{"message": "MCP HTTP transport is running"}` response for any POST (`src/transport/http.ts:30-110`). GET requests receive a 405, so Docker’s health check fails instantly. Authentication requires both username/password when enabled.
- Smithery defaults the transport to HTTP (`src/index.ts:22`), while environment-driven CLI usage defaults to STDIO (`src/utils/config.ts:45-70`), so deployments must reconcile those conflicting defaults explicitly.

## Configuration & Environment
- Mandatory credentials (`AUTOTASK_USERNAME`, `AUTOTASK_SECRET`, `AUTOTASK_INTEGRATION_CODE`) are read from the environment, optionally supplemented by Smithery parameters (`src/utils/config.ts:29-90`).
- Logging defaults to simple text unless overridden; JSON logs are available for production.
- Additional HTTP settings exist even though the HTTP transport is not production-ready. Enabling auth without credentials is rejected by the config schema (`src/index.ts:28-38`).

## External Integration Behaviour
- The service layer relies on `autotask-node` as the primary REST API client wrapper. The `autotask-node` library provides high-level methods for most Autotask entities but has known bugs (e.g., Projects endpoint incorrectly uses GET with query params instead of POST with body). When library methods are broken, direct axios REST API calls are used as documented workarounds.
- Pagination defaults to exhaustive retrieval, which can produce extremely large datasets and long-running queries for tenants with thousands of records. Hard-coded safety caps mitigate infinite loops but still risk heavy load (e.g. 100 pages × 500 tickets = 50 000 items).
- Mapping warms the cache by calling the same exhaustive searches, so the first enhanced tool call frequently loads the entire company list.

## Scripts, Tooling & Build Pipeline
- `npm run build` runs TypeScript compilation and a Smithery build (`package.json:12-18`). `tsconfig.json` emits ESM artifacts and declaration files.
- Jest is configured for ESM with coverage thresholds at 80% (unused in practice) and environment setup that silences console noise (`jest.config.cjs:1-24`, `tests/setup.ts:4-20`).
- The `scripts/` directory contains manual `tsx` runners for mapping, pagination, and other ad hoc experiments; they rely on live Autotask credentials.
- `autotask-mcp-1.0.1.tgz` holds the packaged CLI for local installation.

## Deployment Surfaces
- **CLI / NPM**: `npm start` and the `autotask-mcp` bin both execute `dist/cli.js` (`package.json:7-31`).
- **Docker**: the production stage installs production dependencies and copies `dist`, but it launches `node dist/index.js` (`Dockerfile:65`). That entry point only exports the Smithery factory and never starts transports, leaving the container idle. Additionally, the compose health check performs an HTTP GET that the stub transport rejects with 405 (`docker-compose.yml:25-47`).
- **Smithery runtime**: `smithery.yaml` sets the runtime to TypeScript; the generated bundle expects Smithery to supply configuration that includes a working transport.
- **Generated bundle hygiene**: `@smithery/cli` emits `.smithery/index.cjs` locally and in CI. The repo ignores `.smithery/` so only fresh bundles ship with each deploy. If a prebuilt bundle is committed, Smithery boots two servers and the runtime crashes with `EADDRINUSE` on port 8181.

## Logging & Observability
- Winston powers logging with either JSON or text format, serialising errors defensively (`src/utils/logger.ts:4-53`).
- The wrapper reroutes stdout to avoid protocol corruption, so structured logs always appear on stderr (`src/wrapper.ts:8-58`).

## Testing Reality
- Unit coverage is minimal. `autotask-service` tests mostly assert method presence and expect thrown errors when live APIs are unreachable (`tests/autotask-service.test.ts:36-150`).
- Transport tests cover factory branching and STDIO connection bookkeeping but do not exercise HTTP or integration flows (`tests/transport.test.ts:1-78`).
- “Integration” tests such as `mapping.test.ts` depend on real Autotask credentials and are skipped unless environment variables are set; they exit the process manually on failure.
- No mocks protect against Autotask rate limits, so running the full suite against production credentials is risky.

## Known Technical Debt & Constraints
- HTTP transport is a placeholder and does not relay MCP messages (`src/transport/http.ts:73-80`). Any deployment relying on HTTP must implement proper request routing and handshake support.
- Docker entrypoint does not start the server; compose health checks always fail because the GET probe conflicts with the stub HTTP server (`Dockerfile:65`, `docker-compose.yml:43`).
- Resource handler only surfaces a subset of Autotask entities and truncates lists at 100 rows (`src/handlers/resource.handler.ts:104-147`).
- Tool handler is a monolithic switch spanning hundreds of lines, duplicating cases and making maintenance error-prone (`src/handlers/tool.handler.ts:1060-1579`).
- Exhaustive pagination and cache warm-up can issue tens of thousands of API calls per request, which may violate Autotask throttling in large tenants (`src/services/autotask.service.ts:353-478`, `src/utils/mapping.service.ts:236-287`).
- Pipeline assumes 80% coverage but tests neither enforce nor achieve it; CI expectations should be revisited (`jest.config.cjs:17-24`).
- Existing documentation (e.g. `docs/mapping.md`) describes response shapes that no longer match the implementation; rely on code over docs.

## Operational Considerations
- Always supply valid Autotask credentials before running commands; the server fails fast otherwise.
- Expect long warm-up times on the first mapping-enhanced request as caches populate. Consider preloading via the `preload_mapping_cache` tool if latency matters.
- When deploying, prefer STDIO transport (working path today) or plan HTTP fixes. If Docker usage is required, adjust the CMD to `node dist/cli.js` and replace the health check with a POST probe.
- Monitor API quota usage whenever running bulk searches or cache refreshes, especially in automated workflows.

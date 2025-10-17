# Research Log – Autotask MCP Prompt Catalog

## Decision 1: Configuration Source for Prompt Catalog

- **Decision**: Store prompt definitions in a dedicated YAML file (`config/prompts.yaml`) that is loaded during server initialization and referenced by both runtime code and documentation.
- **Rationale**: A standalone YAML file keeps prompt content versioned with the repo, supports descriptive metadata (arguments, categories, activation flags), and lets maintainers update prompts without recompiling TypeScript. YAML mirrors existing Smithery configuration style and is readable for support leads contributing content.
- **Alternatives considered**:
  - Embed prompt definitions directly in TypeScript modules – rejected because it couples content changes to code releases and increases risk of merge conflicts during content tuning.
  - Fetch prompts dynamically from Autotask custom fields – rejected since it introduces additional Autotask schema dependencies and latency while offering little benefit for a curated starter catalog.

## Decision 2: MCP SDK Prompt Capability Implementation

- **Decision**: Extend `AutotaskMcpServer` to register `ListPromptsRequestSchema` and `GetPromptRequestSchema` handlers from `@modelcontextprotocol/sdk`, delegating logic to a new `PromptCatalogService`.
- **Rationale**: Centralizing logic in a service keeps server setup concise, reuses existing dependency injection patterns (similar to tool/resource handlers), and aligns with SDK best practices for separating transport concerns from business logic.
- **Alternatives considered**:
  - Handle prompts inline in `server.ts` – rejected because it would inflate the server bootstrap file and complicate unit testing.
  - Build a standalone prompts transport – rejected since the SDK already provides typed schemas and the server only needs to advertise prompts capability.

## Decision 3: Autotask Context Retrieval for Prompts

- **Decision**: Fetch Autotask context (e.g., ticket summary, company details) on-demand when a prompt explicitly requires it, using existing `AutotaskService` methods with defensive retries and sanitized fallbacks.
- **Rationale**: On-demand retrieval keeps `prompts/list` lightweight, avoids unnecessary Autotask API usage, and lets `prompts/get` surface richer responses while respecting data minimization.
- **Alternatives considered**:
  - Preload Autotask data at startup – rejected because it increases startup time, risks stale data, and violates minimization goals.
  - Require clients to fetch resources separately – rejected since the prompts should be self-contained guidance once arguments are supplied.

## Decision 4: Observability for Prompt Operations

- **Decision**: Add structured logging for prompt load, list, and get operations via the shared `Logger`, recording prompt id, duration, and error classification without logging prompt bodies or Autotask payloads.
- **Rationale**: Consistent observability aligns with the constitution’s error hygiene requirements and aids operators when clients report prompt issues.
- **Alternatives considered**:
  - Rely on existing tool/resource logs – rejected because prompt-specific issues would be harder to diagnose and lack appropriate metadata.
  - Introduce a separate telemetry service – rejected as unnecessary operational complexity for the current scope.


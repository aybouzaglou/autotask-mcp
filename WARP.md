# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a **backend-only** Model Context Protocol (MCP) server that exposes Kaseya Autotask PSA APIs to AI assistants like Claude. It's built with TypeScript, runs on Node.js 18+, and supports multiple transport modes (stdio, HTTP, both).

**Important:** No frontend code or UI build pipelines exist or should be added to this project.

### Spec-Driven Development (SDD)

This project follows **Spec-Driven Development** methodology using GitHub's [spec-kit](https://github.com/github/spec-kit) toolkit. In SDD:

- **Specifications are the primary artifact**, not code
- Code is generated as the expression of specifications
- AI agents transform natural language requirements into working implementations
- Constitutional governance enforces architectural principles through quality gates

**Key spec-kit concepts:**

1. **`/speckit.*` commands** orchestrate the development workflow within AI agents
2. **`.specify/` directory** contains templates, scripts, and project governance
3. **Constitution** (`memory/constitution.md`) defines architectural principles and quality gates
4. **Feature specs** live in `specs/NNN-feature/` with `spec.md`, `plan.md`, `tasks.md`
5. **Templates** constrain AI behavior to produce consistent, maintainable specifications

**Integration with MCP Development:**

- Use `/speckit.specify` when planning new MCP tools/resources
- Use `/speckit.plan` to design technical implementations following MCP patterns
- Use `/speckit.tasks` to break down feature work into testable units
- Constitution enforces test-first development, simplicity gates, and MCP best practices

## Spec-Kit Workflow

### Available Spec-Kit Commands

These commands are available in Claude and other AI agents after spec-kit initialization:

#### `/speckit.constitution`
Establish project governance principles and architectural constraints.

**Example:**
```
/speckit.constitution Create principles focused on:
- MCP protocol compliance and best practices
- TypeScript strict mode and type safety
- Test-first development (80%+ coverage requirement)
- Minimal dependencies and library-first architecture
- Simplicity gates (max 3 components per feature)
```

#### `/speckit.specify`
Create feature specifications focusing on WHAT and WHY (not HOW).

**Example:**
```
/speckit.specify Add support for Autotask Projects API. Users need to search projects, 
get project details, and create time entries associated with projects. The API should 
follow existing patterns for companies and tickets.
```

**Generates:**
- `specs/NNN-feature/spec.md` with requirements, success criteria, and test scenarios
- `specs/NNN-feature/checklists/requirements.md` for quality validation
- Git branch `NNN-feature`

#### `/speckit.clarify`
Resolve ambiguities in specifications through structured Q&A (optional, before planning).

**Example:**
```
/speckit.clarify
```

#### `/speckit.plan`
Generate technical implementation plans with architecture decisions.

**Example:**
```
/speckit.plan Use TypeScript with @modelcontextprotocol/sdk. Follow existing patterns in 
handlers/ and services/. Add new ProjectService extending AutotaskService patterns. 
Implement pagination using PAGE_SIZE_MEDIUM constants.
```

**Generates:**
- `specs/NNN-feature/plan.md` - Technical design and implementation approach
- `specs/NNN-feature/data-model.md` - Type definitions and interfaces
- `specs/NNN-feature/contracts/` - API contracts and tool schemas
- `specs/NNN-feature/research.md` - Technology research and decisions
- `specs/NNN-feature/quickstart.md` - Setup and testing instructions
- Updates agent context files (CLAUDE.md, etc.) with active technologies

#### `/speckit.analyze`
Validate consistency across spec, plan, and tasks; check constitutional compliance.

**Example:**
```
/speckit.analyze
```

**Checks:**
- Constitutional violations (CRITICAL - blocks implementation)
- Conflicting requirements (HIGH)
- Terminology drift between artifacts (MEDIUM)
- Style improvements (LOW)

#### `/speckit.tasks`
Break down implementation into actionable, testable tasks.

**Example:**
```
/speckit.tasks
```

**Generates:**
- `specs/NNN-feature/tasks.md` with phased task breakdown
- Phase markers for parallel execution (`[P]`)
- Test tasks before implementation (TDD approach)

#### `/speckit.implement`
Execute implementation following task breakdown.

**Example:**
```
/speckit.implement
```

**Executes:**
1. Validates prerequisites (constitution, spec, plan, tasks)
2. Checks quality checklists
3. Executes tasks by phase (Setup → Tests → Core → Integration → Polish)
4. Runs tests after implementation
5. Updates documentation

### Spec-Kit Project Constitution

The constitution for this project should enforce:

**Article I: MCP Protocol Compliance**
- All tools must follow MCP tool schema specifications
- Resources must use URI templates correctly
- Error responses use `isError` flag, not protocol errors

**Article II: TypeScript Strict Mode**
- All code must pass TypeScript strict checks
- No `any` types without explicit justification
- Named exports from `src/types/` for shared types

**Article III: Test-First Development**
- Tests must be written before implementation
- Minimum 80% coverage for all metrics (enforced by Jest)
- Integration tests for Autotask API interactions

**Article IV: Service Layer Patterns**
- All Autotask API calls go through `AutotaskService`
- Lazy initialization for API connections
- Pagination using predefined constants (PAGE_SIZE_*)

**Article V: Handler Patterns**
- Tool handlers extend `AutotaskToolHandler` pattern
- Resource handlers extend `AutotaskResourceHandler` pattern
- Enhanced handlers use `MappingService` for ID resolution

**Article VI: Winston Logging Only**
- Never use `console.log` - always use Winston logger
- Include structured context in log messages
- Never log credentials or secrets

**Article VII: Simplicity Gate**
- Maximum 3 new services per feature
- Avoid premature abstraction
- Follow existing patterns before creating new ones

**Article VIII: No Circular Dependencies**
- Validate module imports don't create cycles
- Use dependency injection where needed

**Article IX: Documentation-First**
- Update WARP.md for architectural changes
- JSDoc comments for public APIs
- README updates for user-facing changes

### Spec-Kit File Structure

When spec-kit is initialized, the project structure includes:

```
autotask-mcp/
├── .specify/
│   ├── memory/
│   │   └── constitution.md          # Project governance principles
│   ├── scripts/
│   │   └── bash/                    # Automation scripts
│   │       ├── create-new-feature.sh
│   │       ├── setup-plan.sh
│   │       ├── check-prerequisites.sh
│   │       ├── update-agent-context.sh
│   │       └── common.sh
│   ├── specs/                       # Generated feature specs
│   │   └── NNN-feature/
│   │       ├── spec.md
│   │       ├── plan.md
│   │       ├── tasks.md
│   │       ├── data-model.md
│   │       ├── research.md
│   │       ├── quickstart.md
│   │       ├── contracts/
│   │       └── checklists/
│   └── templates/
│       ├── spec-template.md
│       ├── plan-template.md
│       ├── tasks-template.md
│       └── agent-file-template.md
├── .claude/                         # Claude Code commands
│   └── commands/
│       ├── speckit.constitution.md
│       ├── speckit.specify.md
│       ├── speckit.plan.md
│       ├── speckit.tasks.md
│       └── speckit.implement.md
├── CLAUDE.md                        # Agent context file (auto-updated)
├── src/                             # Existing MCP server code
└── tests/                           # Existing test suite
```

### Typical Spec-Kit Workflow for New Features

**Example: Adding Autotask Projects Support**

1. **Specify** (WHAT/WHY):
   ```
   /speckit.specify Add Autotask Projects API support with search, get details, 
   and time entry creation. Should follow existing company/ticket patterns.
   ```

2. **Plan** (HOW - Technical Design):
   ```
   /speckit.plan Implement ProjectService extending AutotaskService. Add project 
   tool/resource handlers following existing patterns. Use PAGE_SIZE_STANDARD for 
   pagination. Add project ID-to-name mapping to MappingService.
   ```

3. **Analyze** (Quality Check):
   ```
   /speckit.analyze
   ```

4. **Tasks** (Breakdown):
   ```
   /speckit.tasks
   ```

5. **Implement** (Execute):
   ```
   /speckit.implement
   ```

6. **Verify** (Integration):
   ```bash
   npm run lint
   npm test
   npm run test:coverage
   ```

## Essential Commands

### Build Commands
```bash
npm run build           # Full build: TypeScript + Smithery bundle
npm run build:ts        # Compile TypeScript to dist/
npm run build:smithery  # Create Smithery deployment bundle only
npm run clean           # Remove dist/ directory
```

### Testing
```bash
npm test                            # Run full test suite
npm run test:watch                  # Run tests in watch mode
npm run test:coverage               # Run tests with coverage report

# Run specific test file
npm test -- tests/autotask-service.test.ts

# Specialized test scripts
npm run test:mapping                # Test ID-to-name mapping functionality
npm run test:pagination             # Test pagination behavior
npm run test:mapping-simple         # Simple mapping verification
npm run test:smithery               # Test Smithery HTTP transport
```

**Coverage Requirements:** Minimum 80% for branches, functions, lines, and statements (enforced by Jest).

### Linting
```bash
npm run lint            # Run ESLint on src/
npm run lint:fix        # Auto-fix ESLint issues
```

### Running the Server

#### Local Development (stdio transport - for Claude Desktop)
```bash
npm run dev:cli         # Run via tsx (no build required)
npm start               # Run compiled dist/cli.js
```

#### Smithery Development Playground
```bash
npm run dev             # Launch Smithery interactive playground
```

#### Direct Execution
```bash
node dist/cli.js        # Run after building
```

## High-Level Architecture

### Entry Points

**Two distinct entry points serve different deployment patterns:**

1. **`src/cli.ts`** - Traditional Node.js CLI entry point
   - Used for local development and stdio-based MCP clients (e.g., Claude Desktop)
   - Loads configuration from environment variables via `loadEnvironmentConfig()`
   - Manages process lifecycle (SIGINT/SIGTERM handling)
   - Starts transports based on `AUTOTASK_TRANSPORT` env var

2. **`src/index.ts`** - Smithery factory entry point
   - Exports `configSchema` (Zod schema) and `createServer()` factory
   - Consumed by Smithery CLI to instantiate the MCP server
   - Provides runtime configuration form in Smithery UI
   - Supports stdio-over-HTTP proxying for hosted deployments

### Core Layers

```
src/
├── cli.ts                      # Node CLI entry (env-based config)
├── index.ts                    # Smithery factory entry (Zod config)
├── mcp/
│   └── server.ts              # AutotaskMcpServer - main orchestrator
├── services/
│   └── autotask.service.ts    # AutotaskService - API client wrapper
├── handlers/
│   ├── tool.handler.ts        # MCP tool execution handlers
│   ├── resource.handler.ts    # MCP resource read handlers
│   └── enhanced.tool.handler.ts # ID-to-name enhancement wrapper
├── transport/
│   ├── factory.ts             # Transport creation factory
│   ├── stdio.ts               # Stdio transport (local)
│   └── http.ts                # HTTP transport (deprecated, kept for coverage)
├── utils/
│   ├── config.ts              # Environment configuration loader
│   ├── logger.ts              # Winston logger wrapper
│   └── mapping.service.ts     # Company/resource ID-to-name resolver
└── types/
    ├── autotask.ts            # Autotask API type definitions
    └── mcp.ts                 # MCP config types
```

### Key Responsibilities

**`AutotaskMcpServer` (`src/mcp/server.ts`):**
- Initializes the MCP SDK `Server` instance
- Registers tool/resource handlers
- Coordinates transport lifecycle (start/stop)
- Wires handlers to the underlying `@modelcontextprotocol/sdk`

**`AutotaskService` (`src/services/autotask.service.ts`):**
- Wraps `autotask-node` client and `axios` for REST API calls
- Lazy-initializes Autotask connection on first API call
- Implements pagination, filtering, and CRUD operations
- Handles Autotask-specific error translation

**Handlers (`src/handlers/`):**
- **Tool handlers** execute MCP tool calls (e.g., `search_companies`, `create_ticket`)
- **Resource handlers** serve MCP resources (e.g., `autotask://companies`, `autotask://tickets/{id}`)
- **Enhanced handlers** wrap responses with human-readable names via `MappingService`

**`MappingService` (`src/utils/mapping.service.ts`):**
- Resolves company IDs and resource IDs to names
- Caches mappings for 30 minutes to reduce API load
- Adds `_enhanced` field to API responses with resolved names
- Provides tools: `get_company_name`, `get_resource_name`, cache management

### Transport Modes

**The server supports three transport configurations:**

1. **`stdio` (default for local):** Standard input/output communication
   - Used by Claude Desktop and other local MCP clients
   - No network exposure
   - Process-to-process communication

2. **`http`:** HTTP server with Server-Sent Events
   - Binds to `AUTOTASK_HTTP_HOST:AUTOTASK_HTTP_PORT`
   - Optional basic authentication (`AUTOTASK_HTTP_AUTH=true`)
   - Useful for remote MCP clients or containerized deployments
   - **Note:** HTTP transport in `src/transport/http.ts` is deprecated; Smithery wraps stdio over HTTP automatically

3. **`both`:** Run stdio and HTTP transports simultaneously
   - Enables local development while exposing HTTP for testing

**Transport selection:**
- CLI: Set via `AUTOTASK_TRANSPORT` environment variable
- Smithery: Configured via `configSchema` (defaults to `http` for hosted)

### MCP Capabilities

This server exposes three MCP primitives:

**Resources (read-only, application-controlled):**
- `autotask://companies` - List all companies
- `autotask://companies/{id}` - Get specific company
- `autotask://contacts` - List all contacts
- `autotask://contacts/{id}` - Get specific contact
- `autotask://tickets` - List all tickets
- `autotask://tickets/{id}` - Get specific ticket
- `autotask://time-entries` - List time entries

**Tools (model-controlled, AI-invoked):**
- Company: `search_companies`, `create_company`, `update_company`
- Contact: `search_contacts`, `create_contact`
- Ticket: `search_tickets`, `create_ticket`, `update_ticket`
- Time Entry: `create_time_entry`
- Utility: `test_connection`
- Mapping: `get_company_name`, `get_resource_name`, `get_mapping_cache_stats`, `clear_mapping_cache`, `preload_mapping_cache`

**Prompts (user-controlled):**
- Currently minimal; can be extended for common Autotask workflows

## Configuration

### Required Environment Variables

```bash
AUTOTASK_USERNAME=your-api-user@example.com      # Autotask API username
AUTOTASK_SECRET=your-secret-key                  # Autotask API secret
AUTOTASK_INTEGRATION_CODE=your-integration-code  # Autotask integration code
```

### Optional Environment Variables

```bash
# Autotask API
AUTOTASK_API_URL=https://webservices.autotask.net/atservices/1.6/atws.asmx

# Server metadata
MCP_SERVER_NAME=autotask-mcp
MCP_SERVER_VERSION=1.0.0

# Logging
LOG_LEVEL=info              # error | warn | info | debug
LOG_FORMAT=simple           # simple | json

# Transport configuration
AUTOTASK_TRANSPORT=stdio    # stdio | http | both
AUTOTASK_HTTP_HOST=localhost
AUTOTASK_HTTP_PORT=3000
AUTOTASK_HTTP_AUTH=false    # true to enable HTTP basic auth
AUTOTASK_HTTP_USERNAME=assistant
AUTOTASK_HTTP_PASSWORD=secret

# Node environment
NODE_ENV=production
```

### Local Development Setup

1. Copy `.env.example` to `.env`
2. Fill in required Autotask credentials
3. Run `npm install`
4. Run `npm run build`
5. Run `npm run dev:cli` (stdio) or `npm run dev` (Smithery playground)

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "autotask": {
      "command": "node",
      "args": ["/path/to/autotask-mcp/dist/cli.js"],
      "env": {
        "AUTOTASK_USERNAME": "your-api-user@example.com",
        "AUTOTASK_SECRET": "your-secret-key",
        "AUTOTASK_INTEGRATION_CODE": "your-integration-code"
      }
    }
  }
}
```

## Smithery Deployment

**Smithery is the preferred deployment method** for this MCP server (not Docker).

### Why Smithery?

- Automatically wraps stdio transport over HTTP (no custom HTTP code needed)
- Provides hosted runtime with scaling and HTTPS
- Exposes runtime configuration forms via `configSchema`
- Handles MCP session management (`Mcp-Session-Id` headers)
- Eliminates need for Docker images and health checks

### Key Files

- **`smithery.yaml`** - Smithery runtime configuration (in repo root)
- **`src/index.ts`** - Exports `configSchema` (Zod) and `createServer()` factory
- **`package.json#module`** - Points to `src/index.ts` for Smithery bundling

### Development Workflow

```bash
# 1. Local playground with live reload
npm run dev                 # Starts Smithery dev server

# 2. Build Smithery bundle locally (optional preflight)
npm run build:smithery      # Creates .smithery/ bundle

# 3. Deploy to Smithery cloud
# - Push changes to GitHub
# - Visit https://smithery.ai/new
# - Connect repository
# - Click "Deploy" in Deployments tab
# - Smithery runs `npm ci` + bundles `src/index.ts`
```

### Testing Smithery HTTP Endpoint

```bash
# Authenticate once
npx @smithery/cli@latest login

# Start playground tunnel
SMITHERY_API_KEY=your-key \
  npx @smithery/cli@latest run @aybouzaglou/autotask-mcp \
    --profile medical-termite-hpQdg6 \
    --playground --no-open

# In another shell, test with curl
curl -X POST "https://your-playground-url" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":"tools","method":"tools/list"}'

curl -X POST "https://your-playground-url" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":"test","method":"tools/call","params":{"name":"test_connection"}}'
```

### Important Smithery Notes

- **Do not commit `.smithery/` directory** - it's gitignored and auto-generated
- **Avoid stdio + HTTP dual mode in Smithery** - Smithery proxies stdio automatically
- **HTTP transport in `src/transport/http.ts` is deprecated** - kept only for test coverage
- **Configuration is runtime-provided** via `configSchema` fields in Smithery UI

## Key Development Patterns

### TypeScript Standards

- **Target:** ES2020 modules (`tsconfig.json`)
- **Strict typing enabled:** `noImplicitAny`, `noUnusedLocals`, `exactOptionalPropertyTypes`
- **All new files under `src/`** - do not add files to root
- **Named exports from `src/types/`** when types are reused across modules
- **Avoid circular imports** between modules

### Logging Conventions

- **Always use Winston logger** (`src/utils/logger.ts`) - never `console.log`
- **Log levels:** `error`, `warn`, `info`, `debug`
- **Structured logging:** Include relevant context objects
- **Avoid leaking credentials** in error messages

### Error Handling

- **Wrap Autotask API errors** with contextual information
- **Tool errors use `isError` flag** in result (not MCP protocol-level errors)
- **Throw descriptive errors** for unsupported operations
- **Handle missing credentials** before Autotask initialization

### MCP Handler Contracts

**Tool handlers (`src/handlers/tool.handler.ts`):**
- Return JSON strings parseable as `{ isError?: boolean, data?: any, error?: string }`
- Enhanced wrapper adds `_enhanced` fields with resolved names
- Use `AutotaskToolHandler` class pattern for new tools

**Resource handlers (`src/handlers/resource.handler.ts`):**
- Must enforce pagination caps (prevent unbounded results)
- Refuse template URIs (only serve concrete resource URIs)
- Use `AutotaskResourceHandler` class pattern

### Testing Guidelines

- **Add unit tests under `tests/`** mirroring Jest setup
- **Use `ts-jest`** for TypeScript test files
- **Mark live Autotask tests** with environment guards or skips for CI stability
- **Run `npm run lint` and `npm test` before commits**
- **80%+ coverage required** for all metrics (branches, functions, lines, statements)

### Adding New Features

When extending the codebase, use the Spec-Kit workflow:

#### Spec-Kit Workflow (Preferred)

1. **Create Specification** (`/speckit.specify`)
   - Describe WHAT and WHY in natural language
   - Focus on user needs and success criteria
   - Let AI generate structured spec with test scenarios

2. **Technical Planning** (`/speckit.plan`)
   - Specify tech choices and architectural approach
   - Reference existing patterns (handlers/, services/)
   - Validate against constitution principles
   - AI generates plan.md, data-model.md, contracts/

3. **Task Breakdown** (`/speckit.tasks`)
   - AI generates phased, testable task list
   - TDD approach: tests before implementation

4. **Implementation** (`/speckit.implement`)
   - AI executes tasks following plan
   - Validates against checklists

5. **Verification**
   - Run `npm run lint && npm test`
   - Check 80%+ coverage requirement
   - Manual review for edge cases

#### Manual Development (When Spec-Kit Not Available)

If developing without spec-kit:

1. **Mirror existing patterns** in `src/services/autotask.service.ts`, `src/mcp/server.ts`, `src/handlers/*`
2. **Keep responses lean** - trim payloads and document large-result caveats
3. **Use lazy initialization** for heavy Autotask calls in `AutotaskService`
4. **Write tests first** following TDD (80%+ coverage required)
5. **Update documentation** if architectural changes are significant
6. **Follow constitutional principles** (see Spec-Kit Project Constitution above)

### Pagination Behavior

**All search operations enforce safe default page sizes** to prevent response size issues and ensure predictable behavior.

#### Default Page Sizes

- **Standard entities** (companies, contacts, tickets): Default 50, max 500
- **Medium entities** (resources, configuration items, contracts, invoices): Default 25, max 500
- **API-limited entities** (projects, tasks, quotes, expense reports, notes): Default 25, max 100
- **Large objects** (attachments): Default 10, max 50

#### Pagination Constants

Four reusable pagination schema constants are defined in `src/handlers/tool.handler.ts`:

```typescript
PAGE_SIZE_STANDARD     // default: 50, max: 500, supports -1 for unlimited
PAGE_SIZE_MEDIUM       // default: 25, max: 500, supports -1 for unlimited
PAGE_SIZE_LIMITED      // default: 25, max: 100, -1 gives up to 100
PAGE_SIZE_ATTACHMENTS  // default: 10, max: 50, no unlimited mode
```

**All new search tools MUST use one of these constants** - do not define pageSize parameters inline.

#### Service Layer Implementation

The `AutotaskService` uses `resolvePaginationOptions()` helper method to handle:

- `undefined` or `0` → use default page size
- `-1` → unlimited mode (automatic batching in 500-item chunks)
- Positive value → use value (capped at maximum)
- Warning logs for unlimited requests and cap enforcement

#### Unlimited Pagination

When `pageSize: -1` is specified:

- Service automatically fetches ALL matching records
- Uses 500-item batches to avoid API limits
- Safety limit: 100 pages (50,000 records max)
- **Always logs a warning** to track unlimited request usage
- Only supported for entities without hard API limits

#### Response Size Considerations

- MCP protocol has ~1MB message size limits
- Default page sizes keep typical responses under 100KB
- Large text fields (descriptions, notes) are NOT truncated
- Use filters (searchTerm, companyID, status) to narrow results before increasing pageSize

#### User Guidance in Tool Descriptions

All search tool descriptions MUST:

1. State the default page size clearly
2. Encourage using filters before increasing pageSize
3. Mention unlimited mode if supported (`-1`)
4. Warn about performance implications of large requests

**Example:**
> "Search for tickets in Autotask. Returns 50 optimized tickets by default. Use filters (searchTerm, companyID, status) to narrow results before requesting more data."

#### Migration from Unlimited Defaults

**Version 2.0.0 introduced breaking changes:**

- Previous behavior: Missing pageSize often meant unlimited results
- New behavior: Missing pageSize uses safe default (25 or 50)
- **Migration:** If your workflow requires all records, explicitly set `pageSize: -1`

See `docs/MIGRATION-v2.md` for complete migration guide.

#### Testing Pagination

```bash
npm run test:pagination    # Test pagination behavior
npm test -- tests/pagination-defaults.test.ts    # Unit tests
npm test -- tests/response-size-validation.test.ts    # Size validation
```

#### Documentation References

- **User guide:** `docs/pagination-guide.md`
- **Technical details:** `docs/pagination-improvements.md`
- **Size limits:** `docs/mcp-size-limits.md`
- **README examples:** See "Pagination Behavior" section

## Important Notes

### Runtime & Build

- **Node.js 18+** required (see `package.json` engines)
- **ES2020 module output** - not CommonJS
- **Smithery bundles from `package.json#module`** (`src/index.ts`)
- **Traditional CLI from `package.json#main`** (`dist/cli.js`)

### Test Coverage

- **Minimum 80%** for all metrics (enforced in `jest.config.cjs`)
- **Coverage reports:** `text`, `lcov`, `html`
- **Setup file:** `tests/setup.ts` runs before each test

### Deployment Methods

This project supports three deployment methods:

#### 1. Docker (Self-Hosted)
- **Images actively published to GitHub Container Registry (GHCR)**
- **Image location:** `ghcr.io/aybouzaglou/autotask-mcp`
- **Supported platforms:** linux/amd64, linux/arm64
- **Security:** Images automatically scanned with Trivy during release workflow
- **Use when:** Self-hosting, air-gapped environments, custom infrastructure

```bash
# Pull latest image (public, no auth required)
docker pull ghcr.io/aybouzaglou/autotask-mcp:latest

# Run with environment file
docker run --rm --env-file .env ghcr.io/aybouzaglou/autotask-mcp:latest

# Or use docker-compose
docker-compose up
```

#### 2. Smithery (Managed Hosting)
- **Preferred for production hosted deployments**
- Automatic scaling, HTTPS, session management
- Wraps stdio transport over HTTP automatically
- Runtime configuration via `configSchema`
- **Use when:** You want managed hosting without infrastructure overhead

#### 3. Local npm (Development)
- **Best for local development and Claude Desktop integration**
- Run directly via `npm start` or `npm run dev:cli`
- Hot reload support with Smithery dev mode
- **Use when:** Developing features, debugging, local testing

### HTTP Transport Note

**HTTP transport in `src/transport/http.ts` is maintained but not recommended** for production:
  - Smithery wraps stdio automatically for hosted deployments
  - Kept in codebase for test coverage and edge cases
  - Logs runtime warning when used
  - Docker deployments should use stdio (default) or HTTP with explicit configuration

### File Organization

- **Source code:** `src/` (TypeScript)
- **Compiled output:** `dist/` (JavaScript, gitignored)
- **Tests:** `tests/` (TypeScript)
- **Scripts:** `scripts/` (integration/testing scripts)
- **Documentation:** `docs/` (architecture, guides, stories)
- **Smithery bundle:** `.smithery/` (gitignored, auto-generated)

### Known Limitations

- **autotask-node library limitations:** Some entity methods in the autotask-node library are broken (e.g., Projects), requiring direct REST API calls via axios as workaround
- **Pagination required:** Large result sets must be paginated to prevent memory issues
- **Session management:** MCP sessions are stateless; no persistent state between calls
- **ID resolution caching:** 30-minute TTL on company/resource name lookups

### Additional Documentation

- **Architecture overview:** `docs/brownfield-architecture.md`
- **Coding standards:** `docs/architecture/coding-standards.md`
- **Technology stack:** `docs/architecture/tech-stack.md`
- **Source tree map:** `docs/architecture/source-tree.md`
- **ID-to-name mapping:** `docs/mapping.md`
- **Transport performance:** `docs/transport-performance.md`

## Release Process

### Intentional Releases Only

This project uses **semantic-release** with a **custom configuration** that ensures releases are **intentional and controlled**.

**Key principle:** Releases happen only when explicitly requested, not automatically on every feature or fix.

#### Why Custom Configuration?

- **Prevents accidental releases** - Standard `feat:` and `fix:` commits do NOT trigger releases
- **Requires explicit intent** - You must use `release:` commit type to create a release
- **Full control** - Choose when to release based on project needs, not commit types

#### Release Configuration

The `.releaserc.json` configuration **disables** standard semantic-release commit types and uses a custom `release:` type:

**Triggering Releases:**
- `release(major):` → Major version bump (breaking changes)
- `release(minor):` → Minor version bump (new features)
- `release(patch):` → Patch version bump (bug fixes)
- `release:` → Patch version bump (default)

**Standard types DO NOT trigger releases:**
- `feat:`, `fix:`, `perf:`, `refactor:` → No release
- `docs:`, `test:`, `build:`, `ci:`, `chore:` → No release

#### Creating a Release

**For breaking changes (major release):**
```bash
git commit --allow-empty -m "release(major): description of breaking changes

BREAKING CHANGE: Detailed explanation of what breaks and how to migrate."

git push origin main
```

**For new features (minor release):**
```bash
git commit --allow-empty -m "release(minor): add new feature description"
git push origin main
```

**For bug fixes (patch release):**
```bash
git commit --allow-empty -m "release(patch): fix specific issue"
git push origin main
```

#### Release Workflow

When you push a `release:` commit to `main`, the GitHub Actions workflow automatically:

1. **Test** - Runs linter, build, and test suite on Node.js 20.x and 22.x
2. **Release** - semantic-release analyzes commits and:
   - Bumps version in `package.json`
   - Updates `CHANGELOG.md`
   - Creates GitHub release with notes
   - Commits version changes back to main
3. **Docker** - Builds and pushes multi-platform images to GHCR:
   - `ghcr.io/aybouzaglou/autotask-mcp:latest`
   - `ghcr.io/aybouzaglou/autotask-mcp:vX.Y.Z`
4. **Security** - Runs Trivy vulnerability scan and uploads to GitHub Security

#### Where Releases Are Published

When a release is created, artifacts are published to multiple locations:

1. **GitHub Releases** - https://github.com/aybouzaglou/autotask-mcp/releases
   - Release notes and CHANGELOG
   - Git tags (e.g., `v3.0.0`)
   
2. **Docker Images (GHCR)** - https://github.com/aybouzaglou/autotask-mcp/pkgs/container/autotask-mcp
   - `ghcr.io/aybouzaglou/autotask-mcp:latest`
   - `ghcr.io/aybouzaglou/autotask-mcp:vX.Y.Z`
   
3. **Git Tags** - Automatically created and pushed to repository

#### Checking Release Status

```bash
# View recent workflow runs
gh run list --branch main --limit 5

# View workflow details
gh run view <run-id> --log

# List recent releases
gh release list --limit 5

# View specific release
gh release view vX.Y.Z

# Check Docker images
gh api /users/aybouzaglou/packages/container/autotask-mcp/versions --jq '.[].metadata.container.tags[]' | head -5
```

#### Manual Release (Emergency)

If automated release fails, you can create a release manually:

```bash
# Bump version
npm version major|minor|patch -m "chore(release): %s [skip ci]"

# Push with tags
git push --follow-tags

# Create GitHub release
gh release create vX.Y.Z --title "vX.Y.Z" --notes "Release notes here"
```

#### Release Branches

The release workflow supports multiple branches:
- `main` → Production releases
- `next` → Pre-release builds
- `next-major` → Major version pre-releases
- `beta` → Beta pre-releases
- `alpha` → Alpha pre-releases

## Quick Reference

### Spec-Kit Workflow Commands

These commands are available within your AI agent (Claude, etc.):

```
/speckit.constitution             # Define project principles
/speckit.specify                  # Create feature specification
/speckit.clarify                  # Resolve ambiguities (optional)
/speckit.plan                     # Generate technical plan
/speckit.analyze                  # Validate consistency
/speckit.tasks                    # Break down into tasks
/speckit.implement                # Execute implementation
```

### Most Common Development Commands

```bash
# Start developing
npm install && npm run build
npm run dev:cli                  # Local stdio server
npm run dev                       # Smithery playground

# Test your changes
npm test                          # Run tests
npm run test:coverage             # Check coverage
npm run lint                      # Check code quality

# Build for deployment
npm run build                     # Full build
npm run build:smithery            # Smithery bundle only

# Test specific functionality
npm run test:mapping              # ID-to-name mapping
npm run test:pagination           # Pagination behavior
```

### Environment Setup Checklist

- [ ] Node.js 18+ installed
- [ ] `.env` file created from `.env.example`
- [ ] `AUTOTASK_USERNAME` set
- [ ] `AUTOTASK_SECRET` set
- [ ] `AUTOTASK_INTEGRATION_CODE` set
- [ ] `npm install` completed
- [ ] `npm run build` successful
- [ ] `npm test` passes

### When Things Go Wrong

**Build errors:**
- Run `npm run clean && npm run build` to clear stale artifacts
- Check TypeScript version matches `package.json`

**Test failures:**
- Ensure `.env` has valid Autotask credentials for integration tests
- Run `npm run test:watch` to debug specific tests
- Check if Autotask API is accessible from your network

**Lint errors:**
- Run `npm run lint:fix` to auto-fix formatting issues
- Address remaining errors manually

**Smithery deployment issues:**
- Ensure `.smithery/` is gitignored (don't commit it)
- Verify `smithery.yaml` is at repo root
- Check `package.json#module` points to `src/index.ts`

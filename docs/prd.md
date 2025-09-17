# Autotask MCP Brownfield Enhancement PRD

## Intro Project Analysis and Context

### Existing Project Overview

**Analysis Source**: IDE-based fresh analysis

**Current Project State**:
- **Project**: Autotask MCP Server v1.0.1
- **Purpose**: MCP server for Kaseya Autotask PSA integration
- **Current MCP SDK**: v1.18.0 (matches latest available as of 2025-09-16)
- **Transport Support**: Local stdio (fully functional); hosted deployments run behind Smithery’s managed Streamable HTTP gateway
- **Architecture**: TypeScript-based MCP server with Autotask API integration, transport factory pattern, enhanced entity coverage (notes, attachments, expenses, quotes, tasks)

### Current Implementation Snapshot (2025-09-16)

- ✅ MCP SDK upgraded to v1.18.0 and build pipeline updated
- ✅ Transport abstraction/factory in place; env configuration supports `stdio`, `http`, and `both`
- ✅ Autotask service extended with notes, attachments, expense, quotes, and task helpers (error surfacing for unsupported APIs)
- ⚠️ Custom HTTP transport in repo is a placeholder; Smithery already exposes the server via compliant Streamable HTTP, so focus shifts to compatibility testing rather than building our own listener
- ⚠️ Automated test suite: unit tests pass except `tests/basic-autotask-connection.test.ts`, which requires real Autotask credentials

### Available Documentation Analysis

**Available Documentation**:
- ✅ Tech Stack Documentation
- ✅ Source Tree/Architecture
- ✅ Developer Guide
- ✅ Testing Instructions
- ✅ Release Setup
- ⚠️ HTTP transport documented in README.md, but SSE usage and security hardening notes still pending

### Enhancement Scope Definition

**Enhancement Type**:
- ✅ Technology Stack Upgrade (Primary) — SDK and tooling now on MCP SDK v1.18.0
- ✅ Hosted Transport Validation — ensure compatibility with Smithery Streamable HTTP gateway (authentication, logging, optional SSE events)
- ✅ Moderate to Significant Impact (SDK upgrade + transport refactor + expanded Autotask coverage)

**Enhancement Description**:
Upgrade from MCP SDK v1.12.1 to v1.18.0, introduce a transport abstraction layer, and validate remote deployments via Smithery’s managed Streamable HTTP endpoint. Rather than owning a bespoke HTTP listener, we ensure the server behaves correctly when proxied by Smithery (authentication headers, session IDs, optional SSE streams) while keeping stdio for local workflows. Autotask coverage was expanded to include notes, attachments, expenses, quotes, and tasks, exposing clear errors where Autotask APIs are unavailable.

**Impact Assessment**:
- ✅ Significant Impact (substantial existing code changes)

### Goals and Background Context

**Goals (Updated)**:
- ✅ Stay current on MCP SDK releases (now on v1.18.0)
- ✅ Maintain stdio compatibility while verifying hosted deployments through Smithery’s Streamable HTTP gateway
- 🚧 Validate SSE/event behaviour and authentication expectations when proxied by Smithery (no requirement to run our own HTTP server)
- ✅ Broaden Autotask coverage (notes, attachments, expenses, quotes, tasks) while surfacing clean errors for unsupported APIs
- ⚠️ Achieve reliable cross-transport test coverage and documentation updates (Smithery deployment notes, credential requirements)

**Background Context**:
Prior to this work the server was stdio-only and trailing the MCP SDK by six releases. The recent upgrade introduced the HTTP transport abstraction and expanded Autotask entity operations, but the HTTP path currently returns a placeholder response instead of fully proxying MCP traffic. Additional follow-up is required before the HTTP transport can be considered production ready.

### Change Log

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|---------|
| Initial PRD | 2025-09-15 | v1.0 | Created brownfield enhancement PRD for MCP SDK upgrade and HTTP transport | John (PM) |
| Documentation refresh | 2025-09-16 | v1.1 | Updated PRD to reflect SDK upgrade completion, HTTP transport MVP state, expanded Autotask coverage, and outstanding gaps | Codex |

## Requirements

### Functional

**FR1 (Status: ✅ Completed 2025-09-15)**: Maintain stdio backward compatibility for local development (transport factory tests cover stdio path).

**FR2 (Status: ⚠️ Partial)**: Server runs on MCP SDK v1.18.0, but `_meta` fields and newer session APIs are not yet exposed in tool definitions.

**FR3 (Status: ✅ Completed 2025-09-15)**: Deployment configuration exposes transport selection (`AUTOTASK_TRANSPORT`) while defaulting to stdio locally; Smithery wraps the server in Streamable HTTP automatically.

**FR4 (Status: ⚠️ Pending Validation)**: Validate behaviour over Smithery Streamable HTTP (authentication headers, progress streams, optional SSE). No requirement to ship a custom HTTP listener.

**FR5 (Status: ⚠️ In Progress)**: Document hosted transport expectations and ensure environment variables/config schemas align with Smithery session prompts.

**FR6 (Status: ⚠️ Pending Validation)**: Confirm tool/resource parity via Smithery-hosted smoke tests; update test plan accordingly.

### Non Functional

**NFR1 (Status: ⚠️ Pending Validation)**: Performance impact unmeasured; run lightweight smoke tests against Smithery endpoint before claiming readiness.

**NFR2 (Status: ✅ Verified via regression tests)**: Existing API contracts intact; stdio integrations unaffected in smoke tests.

**NFR3 (Status: ⚠️ Needs Measurement)**: Startup remains fast in stdio mode; Smithery-hosted cold start/latency not yet measured.

**NFR4 (Status: ⚠️ Pending Validation)**: Ensure we can consume optional SSE/event streams emitted via Smithery (no server-side implementation required, but clients must handle events gracefully).

### Compatibility Requirements

**CR1**: Existing stdio-based integrations must continue to work without modification

**CR2**: Current environment variable configuration patterns must remain valid

**CR3**: Existing logging and error handling patterns must be preserved across both transports

**CR4**: Build and deployment processes must support both transport configurations

## Technical Constraints and Integration Requirements

### Existing Technology Stack

**Languages**: TypeScript (v5.3.0)
**Frameworks**: Node.js (>=18.0.0), MCP SDK v1.18.0
**Database**: None (API integration only)
**Infrastructure**: Node.js process, environment-based configuration
**External Dependencies**:
- Autotask Node.js API library (v1.0.0)
- Winston logging (v3.11.0)
- Zod validation (v3.22.4)

### Integration Approach

**Database Integration Strategy**: N/A - Maintains existing API-only pattern

**API Integration Strategy**:
- Preserve existing Autotask API wrapper patterns
- Ensure transport-agnostic API handling
- Maintain current authentication flow with Autotask PSA

**Frontend Integration Strategy**:
- Extend current CLI interface for transport selection
- Maintain HTTP endpoint documentation (README updated; SSE usage section still needed)
- Maintain backward compatibility with existing integration scripts

**Testing Integration Strategy**:
- Extend existing Jest test suite for dual transport testing (transport factory covered; hosted HTTP smoke tests outstanding)
- Add Smithery-hosted integration checks (invoke live endpoint, verify tool responses, observe optional SSE streams)
- Maintain current test coverage requirements (existing `test:coverage` script)

### Code Organization and Standards

**File Structure Approach**:
- Add transport-specific modules under `src/transport/`
- Extend existing `src/mcp/server.ts` for dual transport support
- Maintain current directory structure (`src/mcp/`, `src/utils/`)

**Naming Conventions**:
- Follow existing camelCase TypeScript patterns
- HTTP transport classes: `HttpTransport`, `TransportConfig`
- Maintain current interface naming (`I*Config` pattern)

**Coding Standards**:
- Preserve existing ESLint configuration (TypeScript ESLint v6.13.0)
- Maintain current TypeScript strict mode settings
- Follow established error handling patterns with winston logging

**Documentation Standards**:
- Update existing README.md with Smithery deployment guidance and hosted transport notes (DONE for basic transport modes; needs hosted specifics)
- Extend DEVELOPER_GUIDE_MCP_AUTOTASK.md with Smithery session configuration and local stdio guidelines (OUTSTANDING)
- Maintain current JSDoc commenting patterns

### Deployment and Operations

**Build Process Integration**:
- Maintain existing TypeScript compilation (tsc)
- Preserve current npm script structure
- Ensure single build supports both transports

**Deployment Strategy**:
- Environment variable driven transport selection (stdio locally, Streamable HTTP via Smithery)
- Existing Docker/container deployment compatibility for self-hosting
- Backward compatible process management
- Hosted Smithery deployments rely on managed Streamable HTTP gateway; ensure documentation reflects hosted vs. self-managed differences

**Monitoring and Logging**:
- Extend existing winston logging for transport-specific events
- Document Smithery-provided metrics/observability (hosted gateway handles HTTP health checks)
- Preserve current log level configuration

**Configuration Management**:
- Extend existing environment variable pattern
- Add documentation/validation for Smithery-managed auth/session headers (vs. self-hosted basic auth)
- Maintain current config loading mechanism (`loadEnvironmentConfig`)

### Risk Assessment and Mitigation

**Technical Risks**:
- Breaking changes in MCP SDK v1.12.1 → v1.18.0
- Misalignment between Smithery-hosted Streamable HTTP expectations and local implementation (auth headers, SSE, session IDs)
- Dual transport configuration complexity

**Integration Risks**:
- Existing stdio integrations affected by refactoring
- Performance impact of Smithery-hosted deployments vs. local stdio
- Configuration conflicts between transport types / hosted environment expectations

**Deployment Risks**:
- Environment variable misconfiguration
- Divergent expectations between local env (stdio) and hosted Smithery (managed HTTP)
- Authentication setup complexity (Smithery-managed vs. self-hosted)

**Mitigation Strategies**:
- Gradual SDK upgrade with comprehensive testing
- Feature flags for transport selection during development
- Hosted compatibility testing through Smithery deployments (progress, SSE, auth headers)
- Clear documentation and configuration examples

### Outstanding Follow-Up Items (as of 2025-09-17)

- Smithery smoke test blocked: CLI run requires a Smithery API key. Command `npx @smithery/cli@latest run @aybouzaglou/autotask-mcp --profile medical-termite-hpQdg6 --playground --no-open` prompts for the key and halts without one. Need hosted credentials to capture `tools/list`, representative `tools/call`, and `resources/list` outputs.
- Placeholder HTTP transport retained for self-hosted experiments only; revisit after hosted validation to decide on removal.
- Extend automated testing to cover Smithery-hosted request/response flows; fix `tests/basic-autotask-connection.test.ts` or mark it to require credentialed environments.
- Documentation refresh underway (README + developer guide updated with Smithery workflow); ensure release notes and testing instructions inherit the same guidance.

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision**: Single Epic with sequential story implementation to minimize risk to existing stdio functionality while methodically adding HTTP capabilities.

## Epic 1: MCP SDK Upgrade and HTTP Transport Integration

**Epic Goal**: Upgrade Autotask MCP server from SDK v1.12.1 to v1.18.0 and ensure the server works seamlessly both locally (stdio) and when hosted via Smithery’s Streamable HTTP gateway, maintaining backward compatibility for existing integrations.

**Integration Requirements**:
- Zero breaking changes to existing stdio-based client integrations
- Transport-agnostic core server logic
- Environment-driven transport configuration (with Smithery session prompts supported)
- Comprehensive testing across local stdio and hosted Streamable HTTP

### Story 1.1 MCP SDK Upgrade Foundation

**Status:** Completed (tracked in `docs/stories/story-1.1-mcp-sdk-upgrade.md`).

As a developer maintaining the Autotask MCP server,
I want to upgrade from MCP SDK v1.12.1 to v1.18.0,
so that the server uses the latest SDK features and security improvements.

#### Acceptance Criteria

1. Package.json updated to MCP SDK v1.18.0
2. All existing functionality works with new SDK version
3. New SDK features (like "_meta" field support) are available
4. Build process completes without errors
5. All existing tests pass with new SDK

#### Integration Verification

- **IV1**: Existing stdio transport continues to work without changes
- **IV2**: Autotask API integration functions identically to current version
- **IV3**: Server startup and shutdown processes remain unchanged

### Story 1.2 Transport Abstraction Layer

**Status:** Completed (transport factory + stdio abstraction merged 2025-09-15).

As a developer preparing for dual transport support,
I want to refactor server initialization to use transport abstraction,
so that the core server logic is transport-agnostic.

#### Acceptance Criteria

1. Core server logic separated from transport-specific code
2. Transport interface defined for both stdio and future HTTP
3. Current stdio transport wrapped in new abstraction
4. Configuration system prepared for transport selection
5. No behavioral changes to existing functionality

#### Integration Verification

- **IV1**: Existing stdio clients experience no changes
- **IV2**: Server performance and memory usage unchanged
- **IV3**: All existing environment variables continue to work

### Story 1.3 Streamable HTTP Compatibility

**Status:** In Progress — Smithery provides Streamable HTTP; need to validate hosted behaviour and reconcile/remove placeholder transport code.

As a developer enabling remote MCP connections,
I want to validate Streamable HTTP compatibility via Smithery,
so that hosted deployments work without custom infrastructure.

#### Acceptance Criteria

1. Server successfully deploys to Smithery and responds to tool/resource calls over Streamable HTTP
2. Hosted endpoint handles Smithery-provided authentication/session headers as expected
3. Optional SSE/event streams (if emitted) can be consumed without code changes
4. Environment variables/config schemas documented for Smithery session prompts
5. Placeholder local HTTP transport either removed or clearly marked non-production

#### Integration Verification

- **IV1**: Stdio transport remains completely unaffected
- **IV2**: Smithery-hosted Streamable HTTP smoke tests confirm parity with stdio
- **IV3**: Optional SSE/events (if any) are handled without regressions

### Story 1.4 Dual Transport Configuration System

**Status:** In Progress — Env loader and transport factory complete; need alignment between local stdio defaults and Smithery session-driven configuration.

As a system administrator deploying the MCP server,
I want to configure transport types via environment variables,
so that I can choose stdio, HTTP, or both transports at deployment time.

#### Acceptance Criteria

1. `AUTOTASK_TRANSPORT` environment variable controls local transport selection
2. Smithery session configuration prompts documented (what values users must provide)
3. Default behavior maintains stdio-only operation for local development
4. Clear error messages for invalid configurations
5. Configuration validation on server startup (including hosted vs. local expectations)

#### Integration Verification

- **IV1**: Default configuration preserves existing stdio behavior
- **IV2**: Invalid configurations fail fast with clear error messages
- **IV3**: Configuration changes don't affect running server instances

### Story 1.5 Comprehensive Testing and Documentation

**Status:** In Progress — README updated; Smithery-hosted testing/benchmarking outstanding; `basic-autotask-connection` still failing without credentials.

As a developer ensuring system reliability,
I want comprehensive tests covering both transport types,
so that regressions are caught and deployment confidence is high.

#### Acceptance Criteria

1. Unit tests updated for SDK v1.18.0 compatibility
2. Integration tests for HTTP transport functionality
3. Cross-transport test suite ensuring feature parity
4. README.md updated with HTTP transport setup instructions
5. Environment variable documentation updated
6. Performance benchmarks for both transport types

#### Integration Verification

- **IV1**: Full test suite passes for both stdio and HTTP modes
- **IV2**: Existing integration scripts work without modification
- **IV3**: Documentation accurately reflects actual implementation behavior

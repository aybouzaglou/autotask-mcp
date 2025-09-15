# Autotask MCP Brownfield Enhancement PRD

## Intro Project Analysis and Context

### Existing Project Overview

**Analysis Source**: IDE-based fresh analysis

**Current Project State**:
- **Project**: Autotask MCP Server v1.0.1
- **Purpose**: MCP server for Kaseya Autotask PSA integration
- **Current MCP SDK**: v1.12.1
- **Latest Available**: v1.18.0 (6 versions behind)
- **Current Transport**: stdio-based only
- **Architecture**: TypeScript-based MCP server with Autotask API integration

### Available Documentation Analysis

**Available Documentation**:
- ✅ Tech Stack Documentation
- ✅ Source Tree/Architecture
- ✅ Developer Guide
- ✅ Testing Instructions
- ✅ Release Setup
- ⚠️ No HTTP transport documentation currently

### Enhancement Scope Definition

**Enhancement Type**:
- ✅ Technology Stack Upgrade (Primary)
- ✅ New Feature Addition (HTTP transport)
- ✅ Moderate to Significant Impact (SDK upgrade + new transport layer)

**Enhancement Description**:
Upgrade from MCP SDK v1.12.1 to v1.18.0 and implement HTTP-based connections alongside existing stdio transport, ensuring backward compatibility while enabling web-based integrations.

**Impact Assessment**:
- ✅ Significant Impact (substantial existing code changes)

### Goals and Background Context

**Goals**:
- Update to latest MCP SDK (v1.18.0) for latest features and security fixes
- Enable HTTP-based connections for web integration scenarios
- Maintain existing stdio functionality and backward compatibility
- Leverage new SDK features like "_meta" field support and improved logging

**Background Context**:
The current Autotask MCP server only supports stdio transport, limiting its use to direct CLI integrations. Adding HTTP transport will enable web-based clients, dashboard integrations, and cloud deployments while staying current with the rapidly evolving MCP SDK ecosystem. The 6-version gap (v1.12.1 → v1.18.0) represents significant improvements that should be incorporated.

### Change Log

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|---------|
| Initial PRD | 2025-09-15 | v1.0 | Created brownfield enhancement PRD for MCP SDK upgrade and HTTP transport | John (PM) |

## Requirements

### Functional

**FR1**: The existing Autotask MCP server shall maintain full backward compatibility with stdio transport while adding HTTP transport support

**FR2**: The server shall support MCP SDK v1.18.0 features including "_meta" field in tool definitions and improved session management

**FR3**: HTTP transport shall support standard authentication methods for secure remote access

**FR4**: The server shall support Server-Sent Events (SSE) for real-time streaming when using HTTP transport

**FR5**: Transport type selection shall be configurable via environment variables or command-line arguments

**FR6**: All existing Autotask PSA integration functionality (tickets, companies, contacts, etc.) shall work identically across both transport types

### Non Functional

**NFR1**: HTTP transport performance shall not degrade stdio transport performance or memory usage

**NFR2**: SDK upgrade shall not break existing API contracts or configuration patterns

**NFR3**: Server startup time shall remain under 5 seconds regardless of transport type

**NFR4**: HTTP transport shall support concurrent connections with proper resource management

### Compatibility Requirements

**CR1**: Existing stdio-based integrations must continue to work without modification

**CR2**: Current environment variable configuration patterns must remain valid

**CR3**: Existing logging and error handling patterns must be preserved across both transports

**CR4**: Build and deployment processes must support both transport configurations

## Technical Constraints and Integration Requirements

### Existing Technology Stack

**Languages**: TypeScript (v5.3.0)
**Frameworks**: Node.js (>=18.0.0), MCP SDK (currently v1.12.1 → upgrading to v1.18.0)
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
- Add HTTP endpoint documentation
- Maintain backward compatibility with existing integration scripts

**Testing Integration Strategy**:
- Extend existing Jest test suite for dual transport testing
- Add HTTP-specific integration tests
- Maintain current test coverage requirements (existing test:coverage script)

### Code Organization and Standards

**File Structure Approach**:
- Add transport-specific modules under `src/transport/`
- Extend existing `src/mcp/server.ts` for dual transport support
- Maintain current directory structure (`src/mcp/`, `src/utils/`)

**Naming Conventions**:
- Follow existing camelCase TypeScript patterns
- HTTP transport classes: `HttpServerTransport`, `HttpConfig`
- Maintain current interface naming (`I*Config` pattern)

**Coding Standards**:
- Preserve existing ESLint configuration (TypeScript ESLint v6.13.0)
- Maintain current TypeScript strict mode settings
- Follow established error handling patterns with winston logging

**Documentation Standards**:
- Update existing README.md with HTTP transport setup
- Extend DEVELOPER_GUIDE_MCP_AUTOTASK.md with transport selection
- Maintain current JSDoc commenting patterns

### Deployment and Operations

**Build Process Integration**:
- Maintain existing TypeScript compilation (tsc)
- Preserve current npm script structure
- Ensure single build supports both transports

**Deployment Strategy**:
- Environment variable driven transport selection
- Existing Docker/container deployment compatibility
- Backward compatible process management

**Monitoring and Logging**:
- Extend existing winston logging for transport-specific events
- HTTP connection metrics and health checks
- Preserve current log level configuration

**Configuration Management**:
- Extend existing environment variable pattern
- Add HTTP-specific config validation
- Maintain current config loading mechanism (`loadEnvironmentConfig`)

### Risk Assessment and Mitigation

**Technical Risks**:
- Breaking changes in MCP SDK v1.12.1 → v1.18.0
- HTTP transport implementation complexity
- Dual transport configuration complexity

**Integration Risks**:
- Existing stdio integrations affected by refactoring
- Performance impact of supporting both transports
- Configuration conflicts between transport types

**Deployment Risks**:
- Environment variable misconfiguration
- Port conflicts in HTTP mode
- Authentication setup complexity

**Mitigation Strategies**:
- Gradual SDK upgrade with comprehensive testing
- Feature flags for transport selection during development
- Extensive integration testing with both transport types
- Clear documentation and configuration examples

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision**: Single Epic with sequential story implementation to minimize risk to existing stdio functionality while methodically adding HTTP capabilities.

## Epic 1: MCP SDK Upgrade and HTTP Transport Integration

**Epic Goal**: Upgrade Autotask MCP server from SDK v1.12.1 to v1.18.0 and add HTTP transport support alongside existing stdio transport, maintaining full backward compatibility for existing integrations.

**Integration Requirements**:
- Zero breaking changes to existing stdio-based client integrations
- Transport-agnostic core server logic
- Environment-driven transport configuration
- Comprehensive testing across both transport types

### Story 1.1 MCP SDK Upgrade Foundation

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

### Story 1.3 HTTP Transport Implementation

As a developer enabling remote MCP connections,
I want to implement HTTP transport alongside stdio,
so that clients can connect remotely via HTTP POST and SSE.

#### Acceptance Criteria

1. HTTP transport class implemented following MCP specification
2. HTTP POST endpoint for client-to-server messages
3. Server-Sent Events (SSE) support for server-to-client streaming
4. Port and host configuration via environment variables
5. Basic HTTP authentication support
6. Graceful startup/shutdown for HTTP server

#### Integration Verification

- **IV1**: Stdio transport remains completely unaffected
- **IV2**: HTTP and stdio can run simultaneously without conflicts
- **IV3**: Server resource usage scales appropriately with transport load

### Story 1.4 Dual Transport Configuration System

As a system administrator deploying the MCP server,
I want to configure transport types via environment variables,
so that I can choose stdio, HTTP, or both transports at deployment time.

#### Acceptance Criteria

1. `AUTOTASK_TRANSPORT` environment variable controls transport selection
2. HTTP-specific configuration (port, host, auth) via environment variables
3. Default behavior maintains existing stdio-only operation
4. Clear error messages for invalid configurations
5. Configuration validation on server startup

#### Integration Verification

- **IV1**: Default configuration preserves existing stdio behavior
- **IV2**: Invalid configurations fail fast with clear error messages
- **IV3**: Configuration changes don't affect running server instances

### Story 1.5 Comprehensive Testing and Documentation

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
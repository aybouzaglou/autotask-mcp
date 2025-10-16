<!--
Sync Impact Report:
  Version: 0.0.0 → 1.0.1 (Initial Constitution - Fact-Checked)
  Change Type: PATCH (Clarification of MCP method requirements)

  Principles Established:
    - I. MCP Protocol Compliance
    - II. Test-Driven Quality
    - III. API Integration Reliability
    - IV. Observability & Debugging
    - V. Security & Credentials Management

  Templates Requiring Updates:
    ✅ plan-template.md - Constitution Check section already references constitution
    ✅ spec-template.md - Requirements structure aligns with MCP principles
    ✅ tasks-template.md - Test-first workflow aligns with Principle II

  Follow-up TODOs: None

  Notes:
    - Initial constitution ratification for autotask-mcp project
    - Principles derived from README.md technical requirements
    - Aligned with existing test coverage standards (80%+)
    - Governance process established for future amendments
    - v1.0.1: Clarified that only initialize/initialized are universally required;
      other methods are capability-based per MCP spec 2025-06-18
-->

# Autotask MCP Server Constitution

## Core Principles

### I. MCP Protocol Compliance

**The server MUST maintain full compliance with the Model Context Protocol specification.**

All features and tools must:
- Implement required MCP lifecycle methods (`initialize` request/response, `initialized` notification)
- Implement capability-based methods for declared features (`tools/list`, `tools/call`, `resources/list`, `resources/read`)
- Return properly formatted JSON-RPC 2.0 responses
- Handle errors according to MCP error codes and conventions
- Support both stdio and HTTP transports as specified in smithery.yaml
- Include proper resource URI schemes (e.g., `autotask://companies/{id}`)
- Validate all inputs against tool schemas before processing

**Rationale**: MCP compliance ensures interoperability with Claude Desktop and other MCP clients. Breaking protocol compliance renders the server unusable with standard MCP tooling.

### II. Test-Driven Quality

**All features MUST achieve minimum 80% test coverage across all metrics (statements, branches, functions, lines).**

Testing requirements:
- Unit tests for service layer and utility functions (tests/unit/)
- Integration tests for MCP protocol compliance (tests/integration/)
- Contract tests for Autotask API integration (tests/contract/)
- Tests MUST be written before implementation (Red-Green-Refactor cycle)
- Critical paths (authentication, data transformation, error handling) require 100% coverage
- All tests must pass before code review or merge

**Rationale**: The server mediates between AI assistants and production Autotask data. Bugs can result in data corruption, security incidents, or service outages. High test coverage is non-negotiable for production reliability.

### III. API Integration Reliability

**All Autotask API interactions MUST be resilient, cached appropriately, and handle errors gracefully.**

Integration requirements:
- Implement smart caching with appropriate TTLs (e.g., 30min for ID-to-name mappings)
- Handle API rate limits and implement exponential backoff
- Validate all API responses before returning to MCP clients
- Log all API errors with sufficient context for debugging
- Provide fallback behavior for API failures (e.g., "Unknown Company (123)")
- Never expose raw Autotask API errors to end users

**Rationale**: Autotask API is external and can be slow, rate-limited, or temporarily unavailable. Proper resilience patterns prevent cascading failures and provide better user experience.

### IV. Observability & Debugging

**All operations MUST be observable through structured logging and meaningful error messages.**

Observability requirements:
- Use structured logging (JSON format option for production)
- Include request IDs in all log entries for request tracing
- Log all state transitions (connection established, tool invoked, API call made, error occurred)
- Provide configurable log levels (error, warn, info, debug)
- Error messages must be actionable and include context (what failed, why, how to fix)
- Never log sensitive data (API secrets, passwords, PII)

**Rationale**: The server runs in diverse environments (local, Docker, Smithery cloud). Clear logs and error messages are essential for diagnosing issues in production without direct debugging access.

### V. Security & Credentials Management

**All credentials and sensitive data MUST be handled securely and never exposed in logs, errors, or responses.**

Security requirements:
- Load credentials from environment variables only (never hardcode)
- Support HTTP basic auth for remote deployments when enabled
- Validate all user inputs to prevent injection attacks
- Use HTTPS for all external API calls
- Sanitize error messages to avoid leaking credentials or internal state
- Document minimum required API permissions in README
- Audit all code paths that handle credentials or PII

**Rationale**: The server handles API credentials that provide access to production PSA data. A security breach could expose customer data, violate compliance requirements, or compromise entire Autotask tenants.

## Development Workflow

### Feature Development Process

All new features must follow this workflow:

1. **Specification Phase** (`/speckit.specify`)
   - Create feature specification with user stories and acceptance criteria
   - Validate against constitution principles
   - Identify edge cases and error scenarios

2. **Planning Phase** (`/speckit.plan`)
   - Design implementation approach and data models
   - Pass Constitution Check before proceeding
   - Document any complexity justifications

3. **Task Generation** (`/speckit.tasks`)
   - Break down implementation into dependency-ordered tasks
   - Separate test tasks from implementation tasks
   - Ensure tests are written first

4. **Implementation** (`/speckit.implement`)
   - Follow Red-Green-Refactor cycle strictly
   - Verify each checkpoint before proceeding
   - Run full test suite after each task group

5. **Quality Assurance** (`/speckit.analyze`)
   - Cross-artifact consistency validation
   - Coverage verification (80%+ required)
   - Security audit for credential handling

### Code Review Requirements

Pull requests must include:
- All tests passing (unit, integration, contract)
- Coverage report showing 80%+ on all metrics
- Updated documentation for API changes
- Changelog entry following conventional commits
- Constitution compliance verification in PR description

### Deployment Standards

Deployments must:
- Pass all CI checks (tests, linting, type checking)
- Be tagged with semantic version (MAJOR.MINOR.PATCH)
- Include Smithery deployment validation
- Document any breaking changes with migration guide

## Governance

### Amendment Process

Constitution amendments require:
1. **Proposal**: Document proposed change with rationale and impact analysis
2. **Review**: Team review and discussion of implications
3. **Version Bump**: Semantic versioning of constitution
   - MAJOR: Breaking changes to governance or principle removal
   - MINOR: New principles or material expansions
   - PATCH: Clarifications or non-semantic refinements
4. **Template Sync**: Update all dependent templates to reflect changes
5. **Documentation**: Record amendment in Sync Impact Report

### Compliance Verification

All pull requests and feature implementations must:
- Pass Constitution Check in plan.md (gates Phase 0 research)
- Re-verify after Phase 1 design
- Document any violations with justification in Complexity Tracking table
- Obtain explicit approval for violations before proceeding

### Complexity Justification

Any deviation from principles requires:
- Clear documentation of why the principle cannot be followed
- Explanation of simpler alternatives considered and rejected
- Review and approval from project maintainers
- Time-bound plan to refactor toward compliance

**Version**: 1.0.1 | **Ratified**: 2025-10-16 | **Last Amended**: 2025-10-16

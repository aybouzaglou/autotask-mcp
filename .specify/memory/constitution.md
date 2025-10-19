<!--
Sync Impact Report - Amendment 1.1.1
Version change: 1.1.0 → 1.1.1
Amendment type: PATCH (clarification)
Modified principles: Autotask Data Stewardship, Operational Constraints & Stack
Added sections: Explicit autotask-node library usage guidance and dependency list
Removed sections: None
Templates requiring updates: None (clarification only)
Follow-up TODOs:
- ✅ Update WARP.md with autotask-node library limitation documentation
- ✅ Update docs/brownfield-architecture.md with REST-only clarification
- ✅ Update docs/architecture/tech-stack.md with library limitation details
- ✅ Update CLAUDE.md with known library limitations
- ✅ Update README.md architecture section with REST API clarification
Discovery Context: Corrected incorrect "SOAP fallback" claim in Known Limitations; clarified autotask-node is REST-only with axios for broken library methods
Proposal: Document that all Autotask API interactions use REST (via autotask-node or axios), never SOAP. Clarify Projects endpoint uses axios due to autotask-node bug.
-->

<!--
Previous Amendment - 1.1.0
Version change: 1.0.0 → 1.1.0
Modified principles: (new) Domain Validation Architecture
Added sections: None
Removed sections: None
Templates requiring updates:
- ⏳ .specify/templates/spec-template.md - Add validation architecture section
- ⏳ .specify/templates/plan-template.md - Add validation approach checklist
- ⏳ .specify/templates/tasks-template.md - Add validation task patterns
Follow-up TODOs:
- Review existing update operations for two-layer validation compliance
- Document metadata caching patterns in architecture/
- Update WARP.md with validation architecture guidance
Discovery Context: Identified during spec 004 clarification when analyzing existing TicketUpdateValidator
-->

# Autotask MCP Server Constitution

## Core Principles

### Backend-Only MCP Charter
- MUST keep all deliverables within the TypeScript MCP server hosted under `src/`; introducing frontend stacks, alternate services, or UI tooling is prohibited.
- MUST extend existing patterns in `src/services`, `src/mcp`, and `src/handlers` to maintain protocol fidelity and predictable AI behaviour.
- Rationale: Scope discipline preserves the server’s focus and keeps the MCP contract dependable for downstream assistants.

### Autotask Data Stewardship
- MUST interact with the Autotask platform only through sanctioned SDKs or documented REST endpoints, preserving official schemas and permissions.
- MUST use the `autotask-node` library as the primary Autotask REST API client; when library methods are broken or unavailable, MUST use direct axios REST API calls as documented workarounds (never SOAP).
- MUST treat Autotask data as sensitive: minimise payloads, redact confidential fields, and prevent accidental export outside approved transports.
- Rationale: Responsible integration protects customer data and sustains trust with Autotask administrators. The autotask-node library simplifies REST API access but has known limitations (e.g., Projects endpoint) requiring direct REST workarounds.

### Quality Gates & Test Discipline
- MUST preserve ≥80% overall test coverage and 100% coverage on authentication, data mapping, and transport negotiation paths before merging.
- MUST execute `npm run lint` and `npm test` (or equivalent CI automation) with passing results on every change set.
- Rationale: Enforced quality gates keep the MCP server reliable despite rapid iteration with AI assistance.

### Structured Observability & Error Hygiene
- MUST route all logging through the shared `winston` logger with structured context and avoid leaking secrets in log messages.
- MUST wrap Autotask API failures with actionable diagnostics while propagating sanitized error objects to clients.
- Rationale: Consistent observability accelerates debugging and safeguards operational transparency.

### Secure Configuration & Operational Readiness
- MUST store credentials exclusively in environment variables or approved secret stores; committing secrets or sample keys to the repository is forbidden.
- MUST document configuration, transport toggles, and deployment implications in `README.md`, `docs/`, or Smithery metadata whenever behaviour changes.
- Rationale: Operational hygiene keeps deployments reproducible and compliant with enterprise security expectations.

### Domain Validation Architecture
- MUST implement two-layer validation for all operations that interact with Autotask API state or metadata:
  - **Layer 1 (Structural)**: Zod schemas validate types, formats, and required fields (fail fast on malformed input)
  - **Layer 2 (Business Logic)**: Domain validators check runtime constraints against Autotask metadata (valid status/priority IDs for the instance, active resource assignments, business rule compliance)
- MUST separate concerns: structural validation handles universal constraints; business validators handle instance-specific and stateful rules
- MUST cache Autotask metadata (statuses, priorities, resources) with appropriate TTL (default 15 minutes) to minimize API load while ensuring validation accuracy
- MUST provide contextual error messages that include valid options from the user's Autotask instance (e.g., "Invalid status ID: 99. Valid statuses: 1 (New), 2 (In Progress), 5 (Complete)")
- Business validators SHOULD sanitize content (normalize line endings, trim whitespace) before Autotask API submission
- Rationale: Autotask instances have dynamic, customer-specific configurations (custom statuses, priorities, workflows). Structural validation alone cannot prevent invalid API calls that waste roundtrips and confuse users. Two-layer validation provides actionable feedback, prevents rejected payloads, and maintains data quality.

## Operational Constraints & Stack
- Language: TypeScript 5.3 targeting Node.js 18+; all source files live under `src/` with compiled output in `dist/`.
- Dependencies: follow `package.json` and `docs/architecture/tech-stack.md`; introducing new runtime stacks requires explicit governance approval.
  - Primary Autotask REST API client: `autotask-node@^1.0.0` (with axios for workarounds where library methods are broken)
  - MCP protocol: `@modelcontextprotocol/sdk@^1.18.2`
  - HTTP client for direct REST calls: `axios@^1.12.2`
  - Schema validation: `zod@^3.22.4`
  - Logging: `winston@^3.11.0`
- Transport boundaries: support stdio and optional HTTP as defined by the MCP SDK, with configuration flowing through `AutotaskMcpServer.start`.
- Documentation: update `docs/architecture/coding-standards.md` and Smithery artifacts when altering architectural conventions or packaging.

## Development Workflow & Quality Gates
- Planning artefacts (`specs/*/spec.md`, `plan.md`, `tasks.md`) MUST reflect independently deliverable user stories and cite any constitution gate risks up front.
- Tests, linting, and coverage MUST be enumerated in every plan’s Constitution Check before implementation starts.
- Feature work MUST preserve backend-only scope, reference the exact Autotask entities impacted, and outline observability or config changes in documentation updates.
- Release candidates MUST be validated via `npm run build`, `npm run lint`, and `npm test`, with deviations documented in plan/task trackers.

## Governance
- Amendments require a documented proposal referencing affected principles, approval from project maintainers, and updates to dependent templates before ratification.
- Versioning follows Semantic Versioning: MAJOR for principle removals or incompatible governance shifts; MINOR for new principles or material expansions; PATCH for clarifications.
- Compliance reviews occur at the start of each feature cycle and before release tagging; violations demand remediation plans captured in feature tasks.

**Version**: 1.1.1 | **Ratified**: 2025-10-16 | **Last Amended**: 2025-10-19

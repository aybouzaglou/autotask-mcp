<!--
Sync Impact Report
Version change: N/A → 1.0.0
Modified principles: (new) Backend-Only MCP Charter; (new) Autotask Data Stewardship; (new) Quality Gates & Test Discipline; (new) Structured Observability & Error Hygiene; (new) Secure Configuration & Operational Readiness
Added sections: Operational Constraints & Stack; Development Workflow & Quality Gates
Removed sections: None
Templates requiring updates:
- ✅ .specify/templates/plan-template.md
- ✅ .specify/templates/spec-template.md
- ✅ .specify/templates/tasks-template.md
Follow-up TODOs: None
-->

# Autotask MCP Server Constitution

## Core Principles

### Backend-Only MCP Charter
- MUST keep all deliverables within the TypeScript MCP server hosted under `src/`; introducing frontend stacks, alternate services, or UI tooling is prohibited.
- MUST extend existing patterns in `src/services`, `src/mcp`, and `src/handlers` to maintain protocol fidelity and predictable AI behaviour.
- Rationale: Scope discipline preserves the server’s focus and keeps the MCP contract dependable for downstream assistants.

### Autotask Data Stewardship
- MUST interact with the Autotask platform only through sanctioned SDKs or documented REST endpoints, preserving official schemas and permissions.
- MUST treat Autotask data as sensitive: minimise payloads, redact confidential fields, and prevent accidental export outside approved transports.
- Rationale: Responsible integration protects customer data and sustains trust with Autotask administrators.

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

## Operational Constraints & Stack
- Language: TypeScript 5.3 targeting Node.js 18+; all source files live under `src/` with compiled output in `dist/`.
- Dependencies: follow `package.json` and `docs/architecture/tech-stack.md`; introducing new runtime stacks requires explicit governance approval.
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

**Version**: 1.0.0 | **Ratified**: 2025-10-16 | **Last Amended**: 2025-10-16

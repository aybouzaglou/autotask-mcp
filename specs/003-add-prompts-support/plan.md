# Implementation Plan: Autotask MCP Prompt Catalog

**Branch**: `003-add-prompts-support` | **Date**: October 17, 2025 | **Spec**: [/Users/avrahambouzaglou/autotask-mcp/specs/003-add-prompts-support/spec.md](/Users/avrahambouzaglou/autotask-mcp/specs/003-add-prompts-support/spec.md)  
**Input**: Feature specification from `/specs/003-add-prompts-support/spec.md`

## Summary

Implement the MCP `prompts` capability for the Autotask server by loading a curated catalog from `config/prompts.yaml`, advertising `prompts/list` and `prompts/get`, and enriching prompt responses with optional Autotask context. A new `PromptCatalogService` will manage configuration validation, dynamic context resolution, and list-changed notifications while preserving existing transport, logging, and quality gates. Decisions are backed by the research log in `research.md`.

## Technical Context

**Language/Version**: TypeScript 5.3 targeting Node.js 20+  
**Primary Dependencies**: `@modelcontextprotocol/sdk` (prompt schemas & notifications), `autotask-node` (Autotask data access), `winston` (structured logging)  
**Storage**: File-based prompt catalog (`config/prompts.yaml`); no persistent datastore  
**Testing**: Jest with ts-jest, Smithery HTTP harness (`scripts/test-smithery-http.js`) for integration validation  
**Target Platform**: Node.js CLI server (stdio + optional HTTP transport)  
**Project Type**: Backend service (single TypeScript package)  
**Performance Goals**: `prompts/list` responses <2s; `prompts/get` contextualization <3s when a single Autotask entity fetch is required  
**Constraints**: Avoid logging secrets or prompt bodies; degrade gracefully when Autotask API is unavailable; keep server startup impact under 200ms  
**Scale/Scope**: Initial catalog of 3–5 prompts with headroom for dozens without architectural changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Backend-Only MCP Charter**: All new logic lives under `src/mcp` and `src/services/prompts`; no frontend or alternate runtimes introduced. ✅
- **Autotask Data Stewardship**: Prompts access tickets, companies, contacts, and time entries only via existing `AutotaskService`, redacting nonessential fields before returning context. ✅
- **Quality Gates & Test Discipline**: Add Jest unit tests for catalog parsing/validation and integration coverage for prompt handlers to keep coverage ≥80% overall and 100% on new critical paths. ✅
- **Structured Observability & Error Hygiene**: Enhance shared logger output around prompt load/list/get operations (prompt id, status, latency) without including prompt instructions or Autotask payloads. ✅
- **Secure Configuration & Operational Readiness**: Introduce version-controlled `config/prompts.yaml`, update `docs/prompts.md` and release notes, and require operators to restart server after catalog edits; no new secrets. ✅

## Project Structure

### Documentation (this feature)

```
specs/003-add-prompts-support/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md          # Created by /speckit.tasks
```

### Source Code (repository root)

```
src/
├── mcp/
│   └── server.ts
├── services/
│   ├── autotask.service.ts
│   └── prompts/
│       ├── prompt.catalog.service.ts
│       ├── prompt.validators.ts
│       └── index.ts
├── handlers/
│   ├── enhanced.tool.handler.ts
│   └── resource.handler.ts
└── utils/
    └── logger.ts

config/
└── prompts.yaml

docs/
└── prompts.md

tests/
├── integration/
│   └── prompts.spec.ts
└── unit/
    └── prompt.catalog.service.spec.ts
```

**Structure Decision**: Extend the existing single-package layout by introducing a dedicated `src/services/prompts` module, configuration under `config/`, documentation in `docs/prompts.md`, and targeted Jest specs to keep prompt responsibilities cohesive and testable.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| *(none)* | | |


## Post-Design Constitution Check

All gates remain satisfied after Phase 1 outputs; no new risks identified.

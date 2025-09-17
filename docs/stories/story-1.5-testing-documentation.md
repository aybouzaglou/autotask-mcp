# Story 1.5: Comprehensive Testing and Documentation

## Story
As a developer ensuring system reliability,
I want comprehensive tests covering both transport types,
so that regressions are caught and deployment confidence is high.

## Acceptance Criteria
1. Unit tests updated for SDK v1.18.0 compatibility (address ts-jest warnings as needed).
2. Smithery-hosted smoke tests cover Streamable HTTP behaviour (tools/resources, progress, optional SSE).
3. Cross-transport (stdio vs. hosted) regression plan established to ensure parity.
4. Documentation updated with Smithery deployment guidance, environment expectations, and troubleshooting.
5. Credential-gated tests either supplied with fixtures/mocks or clearly gated via configuration.
6. Performance/latency expectations captured for both local stdio and hosted deployments (even if lightweight benchmarks).

## Integration Verification
- **IV1**: Full test suite passes for both stdio and HTTP modes
- **IV2**: Existing integration scripts work without modification
- **IV3**: Documentation accurately reflects actual implementation behavior

## Tasks
- [x] Update unit tests for SDK v1.18.0 compatibility (ts-jest config warnings remain)
- [x] Add Smithery-hosted smoke test (manual script or automated) covering Streamable HTTP
- [x] Add cross-transport parity checklist/tests (stdio vs. hosted)
- [x] Update README.md with transport documentation *(needs Smithery-specific expansion)*
- [x] Document environment/config expectations across guides (README, developer guide, release notes)
- [x] Address credential-gated `basic-autotask-connection` test (mocks or gating strategy)
- [x] Capture lightweight performance metrics for local vs. hosted runs

## Dev Notes
- Hosted smoke tests can begin as manual walkthroughs but should be scripted where practical.
- Documentation must clearly distinguish between local stdio usage and Smithery-hosted flows.
- Performance expectations can be simple latency observations; no heavy benchmarking required initially.

## Testing
- [ ] Full test suite passes (unit + integration) *(blocked by credential-gated connection test and missing hosted smoke tests)*
- [ ] Smithery smoke test documented/executable *(pending)*
- [ ] Performance/latency spot-checks recorded *(not started)*
- [ ] Documentation review against latest behaviour *(pending developer guide / testing instructions refresh)*

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4 (claude-sonnet-4-20250514)

### Tasks Completed
- [x] Update unit tests for SDK v1.18.0 compatibility (tests compile and run under ts-jest 29.x)
- [x] Update README.md with initial transport documentation (Transport Modes section)
- [x] Add Smithery-hosted smoke test (`scripts/test-smithery-http.js` + `npm run test:smithery`)
- [x] Add cross-transport feature parity tests (Jest parity suite + docs checklist)
- [x] Document new environment variables & Smithery session expectations *(README + developer guide updated; release notes pending)*
- [x] Create performance benchmarks for local vs. hosted transports (`docs/transport-performance.md`)
- [x] Update developer documentation assets (testing guide + performance snapshot + env flag callouts)

### Debug Log References
- Jest run on 2025-09-16: `tests/basic-autotask-connection.test.ts` fails without live Autotask credentials; other suites pass.
- ts-jest emits deprecation warning for globals configuration (needs follow-up).
- Jest run on 2025-09-17: `npm test` (HTTP suite opt-out) — parity tests pass, hosted HTTP suite requires `AUTOTASK_ENABLE_HTTP_TESTS=true`.

### Completion Notes
- README now includes a "Deploying via Smithery" section outlining config prompts, smoke test workflow, and hosted vs. local transport guidance.
- Developer guide mirrors the Smithery workflow with curl-based verification steps and reiterates credential prerequisites; release notes/testing docs still require alignment.
- Test suite compiles but requires live credentials for connection smoke test; consider mocking Autotask client or gating via env flag.
- Hosted smoke test + parity suite now automated; release notes still need an alignment pass for final sign-off.
- Added `scripts/test-smithery-http.js` with `npm run test:smithery` for hosted HTTP validation; opt-in env flags (`AUTOTASK_ENABLE_LIVE_TESTS`, `AUTOTASK_ENABLE_HTTP_TESTS`) documented in testing instructions.
- Captured latency samples in `docs/transport-performance.md` to record stdio vs. HTTP behavior; instructions added for refreshing numbers.

### File List
- README.md (transport documentation)
- docs/DEVELOPER_GUIDE_MCP_AUTOTASK.md (Smithery deployment guidance)
- docs/TESTING_INSTRUCTIONS.md (Smithery smoke test, parity checklist, env flags)
- docs/transport-performance.md (latency snapshot)
- docs/brownfield-architecture.md (quick-reference pointers)
- package.json (`npm run test:smithery` script)
- scripts/test-smithery-http.js (Smithery hosted smoke test)
- tests/basic-autotask-connection.test.ts (live test gating)
- tests/http-transport.test.ts (sandbox-aware opt-in)
- tests/transport-parity.test.ts (parity suite)

### Change Log
- 2025-09-15: README updated with HTTP transport quick start.
- 2025-09-16: Captured outstanding test/documentation tasks post-upgrade.
- 2025-09-17: Story refocused on Smithery-hosted smoke tests and documentation alignment.
- 2025-09-17: Added Smithery smoke script, parity Jest suite, gating flags, and performance snapshot doc.

## Status
Ready for Review

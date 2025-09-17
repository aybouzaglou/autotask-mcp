# Story 1.3: Streamable HTTP Compatibility

## Story
As a developer enabling remote MCP connections,
I want to validate Streamable HTTP compatibility via Smithery,
so that hosted deployments work without custom infrastructure.

## Acceptance Criteria
1. Autotask MCP server deploys to Smithery and responds to tool/resource calls over the hosted Streamable HTTP endpoint.
2. Hosted endpoint handling (authentication headers, `Mcp-Session-Id`, progress events) is documented and verified.
3. Optional SSE/event streams from Smithery can be consumed without code changes or regressions.
4. Local configuration defaults remain stdio-only; hosted guidance explains how Smithery session prompts map to our config.
5. Placeholder local HTTP transport is either retired or clearly documented as non-production.

## Integration Verification
- **IV1**: Stdio transport remains completely unaffected
- **IV2**: Smithery-hosted Streamable HTTP smoke tests confirm parity with stdio
- **IV3**: Optional SSE/events (if any) are handled without regressions

## Tasks
- [ ] Deploy latest build to Smithery and capture smoke-test results (tools/resources, error handling, progress events).
- [x] Document required Smithery configuration (session prompts, headers) in README and developer guide.
- [ ] Ensure clients can consume Smithery SSE/event streams without additional code changes (manual or automated check).
- [x] Decide fate of placeholder local HTTP transport (remove, disable by default, or rewrite to proxy to MCP server) and implement outcome.
- [ ] Update Story 1.5 test plan with hosted smoke test coverage.

## Dev Notes
- Smithery automatically wraps the server in Streamable HTTP; our focus is compatibility, not implementing a parallel HTTP stack.
- Keep stdio path as default for local development; hosted behaviour should be feature-parity without extra flags.
- Placeholder HTTP transport can remain temporarily for experimentation but must not be presented as production-ready.

## Testing
- [ ] Smithery smoke test script or documented manual steps
- [ ] Hosted SSE/event handling verification (manual or automated)
- [ ] Update Jest coverage only if local HTTP proxy is retained; otherwise remove redundant tests

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4 (claude-sonnet-4-20250514)

### Tasks Completed
- [x] Added transport abstraction hooks so hosted vs. local transports can be selected via config
- [x] Deployed placeholder HTTP transport for experimentation (non-production)
- [ ] Smithery smoke tests executed and documented
- [ ] Hosted SSE/event handling confirmed
- [x] Placeholder HTTP transport decision implemented

### Debug Log References
- Added verbose logging around placeholder HTTP request handling and auth failures.
- Captured TODO logs for future SSE implementation (pending decision on retaining local HTTP transport).
- Need new logs referencing Smithery deployment once smoke tests executed.

### Completion Notes
- Smithery already provides Streamable HTTP hosting; local HTTP transport remains experimental.
- 2025-09-17: `npx @smithery/cli@latest run @aybouzaglou/autotask-mcp --profile medical-termite-hpQdg6 --playground --no-open` prompts for a Smithery API key. Without it the CLI throws `Error [ERR_USE_AFTER_CLOSE]: readline was closed`, blocking smoke-test execution. Documented gap in PRD Outstanding Follow-Up Items.
- README.md and `docs/DEVELOPER_GUIDE_MCP_AUTOTASK.md` now include "Deploying via Smithery" instructions plus curl-based smoke test steps since the historical `connect` command is no longer available.
- Placeholder HTTP transport retained for self-hosted experiments only; file logs a runtime warning and has Jest coverage via `tests/http-transport.test.ts`.
- SSE / event handling should be validated via Smithery rather than implemented locally unless requirements change.

### File List
- src/transport/http.ts (experimental placeholder transport)
- src/transport/factory.ts (supports selecting transports)
- src/transport/index.ts (exports transport types)
- tests/transport.test.ts (covers factory wiring)
- README.md (Deploying via Smithery guidance)
- tests/http-transport.test.ts (experimental coverage)

### Change Log
- 2025-09-15: Added experimental HTTP transport with Basic Auth placeholder.
- 2025-09-16: Documented outstanding SSE and MCP proxying work.
- 2025-09-17: Story retargeted to Smithery Streamable HTTP compatibility and hosted testing.

## Status
In Progress

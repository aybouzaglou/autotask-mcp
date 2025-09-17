# Story 1.4: Dual Transport Configuration System

## Story
As a system administrator deploying the MCP server,
I want consistent configuration between local stdio runs and Smithery-hosted Streamable HTTP sessions,
so that teams can deploy without juggling conflicting transport settings.

## Acceptance Criteria
1. `AUTOTASK_TRANSPORT` environment variable controls local transport selection (`stdio` default).
2. Smithery session configuration (config schema, prompts) documented so users can supply required Autotask credentials without touching env vars.
3. Default behaviour preserves stdio-only operation for local dev; hosted deployments rely on Smithery-managed Streamable HTTP.
4. Clear error messages/logs for invalid configurations (missing creds, unsupported transport type, etc.).
5. Configuration validation on startup distinguishes between local/self-hosted vs. Smithery-hosted expectations.

## Integration Verification
- **IV1**: Default configuration preserves existing stdio behavior
- **IV2**: Invalid configurations fail fast with clear error messages
- **IV3**: Configuration changes don't affect running server instances

## Tasks
- [x] Add `AUTOTASK_TRANSPORT` environment variable support for local dev
- [x] Update configuration loader to surface transport settings *(validation still minimal)*
- [ ] Document Smithery session prompts and map them to config schema values
- [ ] Add configuration error handling/validation (invalid transport, missing credentials, conflicting settings)
- [ ] Ensure defaults favour stdio locally while documentation clarifies Smithery hosts Streamable HTTP automatically
- [ ] Provide guidance (or automation) for selecting transports in CI/self-hosted environments

## Dev Notes
- Retain `stdio` as default for local work; most users hosting on Smithery will not set transport vars manually.
- Smithery prompts users for configuration derived from `configSchema`; ensure schema aligns with Autotask credential needs.
- Decide whether to keep `http`/`both` options for self-hosters or clearly flag them as advanced.

## Testing
- [ ] Unit tests for configuration loading (env parsing, defaults, error paths)
- [ ] Smithery session walkthrough documented / automated (ensures config schema renders correctly)
- [ ] Error handling tests for invalid configurations (bad transport type, missing credentials)
- [ ] Optional: integration tests for self-hosted `http`/`both` if we decide to keep those paths

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4 (claude-sonnet-4-20250514)

### Tasks Completed
- [x] Add `AUTOTASK_TRANSPORT` environment variable support
- [x] Update configuration loading with transport settings and pass config into server
- [x] Implement transport selection logic in transport factory
- [ ] Add configuration error handling and validation *(follow-up)*
- [ ] Align defaults/documentation between local stdio and Smithery-hosted usage

### Debug Log References
- Added warning logs when HTTP auth enabled without credentials.
- TODO: add validation logs for missing transport configs.

### Completion Notes
- Environment loader now emits transport settings, enabling local experimentation.
- Need to reconcile local defaults with Smithery-hosted expectations and document how `configSchema` feeds session prompts.
- Error handling remains limited; still need validation layer plus guidance for self-hosted HTTP use cases (if retained).

### File List
- src/utils/config.ts (transport env loading)
- src/transport/factory.ts (config validation on creation)
- src/mcp/server.ts (wires default transport config)

### Change Log
- 2025-09-15: Added environment transport selection and HTTP config wiring.
- 2025-09-16: Documented outstanding validation/default alignment tasks.
- 2025-09-17: Story refocused on aligning local stdio defaults with Smithery Streamable HTTP deployments.

## Status
In Progress (needs additional validation, testing, and default alignment)

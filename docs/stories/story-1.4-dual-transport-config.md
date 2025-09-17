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
- [x] Document Smithery session prompts and map them to config schema values
- [x] Add configuration error handling/validation (invalid transport, missing credentials, conflicting settings)
- [x] Ensure defaults favour stdio locally while documentation clarifies Smithery hosts Streamable HTTP automatically
- [x] Provide guidance (or automation) for selecting transports in CI/self-hosted environments

## Dev Notes
- Retain `stdio` as default for local work; most users hosting on Smithery will not set transport vars manually.
- Smithery prompts users for configuration derived from `configSchema`; ensure schema aligns with Autotask credential needs.
- Decide whether to keep `http`/`both` options for self-hosters or clearly flag them as advanced.
- CLI now fails fast when `AUTOTASK_TRANSPORT`, HTTP port/auth, or optional credentials are misconfigured and surfaces human-readable warnings.
- HTTP transport defaults to `0.0.0.0` binding while stdio retains `localhost`, aligning container vs. local expectations.

## Smithery Session Prompt Mapping

| Config Schema Key | Smithery Prompt Label | Notes |
| --- | --- | --- |
| `serverName` | "Server name" | Defaults to package name; override for multiple deployments. |
| `serverVersion` | "Server version" | Defaults to package version; typically leave as-is. |
| `autotaskUsername` | "Autotask username" | Required Autotask API user email. |
| `autotaskSecret` | "Autotask secret" | Required API secret; Smithery stores securely. |
| `autotaskIntegrationCode` | "Autotask integration code" | Required; provided by Autotask admin. |
| `autotaskApiUrl` | "Autotask API URL override" | Leave blank unless pointing at a sandbox. |
| `logLevel` | "Log level" | Defaults to `info`; set to `debug` only for troubleshooting. |
| `logFormat` | "Log format" | `simple` for human-readable logs, `json` for ingestion. |
| `transport` | "Enabled transports" | Smithery default is `http`; switch to `stdio` for local-only sessions. |
| `httpHost` | "HTTP host" | Ignored when `transport` = `stdio`; Smithery uses container host. |
| `httpPort` | "HTTP port" | Defaults to `3000`; align with Smithery Streamable routing if changed. |
| `httpAuthEnabled` | "Enable HTTP auth?" | Enable for self-hosted HTTP; Smithery Streamable already wraps auth. |
| `httpAuthUsername` | "HTTP auth username" | Required when auth enabled; leave blank otherwise. |
| `httpAuthPassword` | "HTTP auth password" | Required when auth enabled; leave blank otherwise. |

### Local vs. Hosted Guidance
- **Local development**: use `.env` or CLI flags to set `AUTOTASK_TRANSPORT=stdio`; Smithery prompt defaults will still show `http`—remind developers to switch when running locally via Smithery CLI.
- **Smithery Streamable HTTP**: accept default `transport=http`; Smithery handles port binding and TLS. Authentication prompts can stay disabled because Smithery already scopes access per session.
- **Self-hosted HTTP**: set `transport=http` or `both`, enable `AUTOTASK_HTTP_AUTH=true`, and provide explicit credentials; configure `AUTOTASK_HTTP_HOST=0.0.0.0` and a non-conflicting port for CI runners and container platforms.
- **CI pipelines**: rely on the new CLI validation to fail early when transport/auth combinations are missing. Recommended baseline: `AUTOTASK_TRANSPORT=http AUTOTASK_HTTP_AUTH=true AUTOTASK_HTTP_PORT=8080 AUTOTASK_HTTP_HOST=0.0.0.0` with secrets injected via CI vaults.

## Testing
- [x] Unit tests for configuration loading (env parsing, defaults, error paths) *(npm test — 2025-09-17)*
- [ ] Smithery session walkthrough documented / automated (ensures config schema renders correctly)
- [x] Error handling tests for invalid configurations (bad transport type, missing credentials)
- [ ] Optional: integration tests for self-hosted `http`/`both` if we decide to keep those paths

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4 (claude-sonnet-4-20250514)

### Tasks Completed
- [x] Add `AUTOTASK_TRANSPORT` environment variable support
- [x] Update configuration loading with transport settings and pass config into server
- [x] Implement transport selection logic in transport factory
- [x] Add configuration error handling and validation *(follow-up)*
- [x] Align defaults/documentation between local stdio and Smithery-hosted usage

### Debug Log References
- `loadEnvironmentConfig` now records warnings/errors for invalid transports, auth combos, and ignored HTTP settings.
- CLI startup logs validation warnings and aborts when configuration errors exist.

### Completion Notes
- Environment loader now returns validation metadata so the CLI can block on misconfigured transports.
- Default HTTP binding is `0.0.0.0` for hosted modes while stdio remains `localhost`; documentation now clarifies the split across local, Smithery, CI, and self-hosted flows.
- README and story doc cover CI/self-hosted guidance, and new Jest coverage exercises both success and failure cases.

### File List
- src/utils/config.ts (transport env loading)
- src/transport/factory.ts (config validation on creation)
- src/mcp/server.ts (wires default transport config)
- src/cli.ts (startup validation and logging)
- tests/config.test.ts (new configuration unit tests)
- README.md (transport guidance for CI/self-hosted)

### Change Log
- 2025-09-15: Added environment transport selection and HTTP config wiring.
- 2025-09-16: Documented outstanding validation/default alignment tasks.
- 2025-09-17: Story refocused on aligning local stdio defaults with Smithery Streamable HTTP deployments.
- 2025-09-17: Introduced CLI/env validation for transport/auth combos, plus documentation and tests for CI/self-hosted usage.

## Status
Ready for Review (Smithery walkthrough + optional integration coverage remain follow-ups)

# Story 1.1: MCP SDK Upgrade Foundation

## Story
As a developer maintaining the Autotask MCP server,
I want to upgrade from MCP SDK v1.12.1 to v1.18.0,
so that the server uses the latest SDK features and security improvements.

## Acceptance Criteria
1. Package.json updated to MCP SDK v1.18.0
2. All existing functionality works with new SDK version
3. New SDK features (like "_meta" field support) are available
4. Build process completes without errors
5. All existing tests pass with new SDK

## Integration Verification
- **IV1**: Existing stdio transport continues to work without changes
- **IV2**: Autotask API integration functions identically to current version
- **IV3**: Server startup and shutdown processes remain unchanged

## Tasks
- [x] Update package.json to MCP SDK v1.18.0
- [x] Resolve any breaking changes from SDK upgrade
- [x] Update imports and type definitions as needed
- [x] Verify all existing functionality works
- [ ] Run full test suite and fix any failures *(blocked by `tests/basic-autotask-connection.test.ts` requiring live Autotask credentials)*
- [ ] Validate new SDK features are accessible *(follow-up: expose `_meta` fields in tool definitions)*

## Dev Notes
- Check breaking changes between v1.12.1 and v1.18.0
- Ensure backward compatibility with existing integrations
- Test stdio transport functionality thoroughly

## Testing
- [x] Unit tests pass (except credential-gated connection test noted above)
- [ ] Integration tests pass *(HTTP transport still pending, see Story 1.3)*
- [x] Manual testing of stdio transport
- [x] Verify no breaking changes to API contracts

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4 (claude-sonnet-4-20250514)

### Tasks Completed
- [x] Update package.json to MCP SDK v1.18.0
- [x] Resolve breaking changes introduced by SDK upgrade
- [x] Update imports and type definitions as needed
- [x] Verify existing functionality works in stdio mode
- [ ] Run full test suite and fix any failures *(pending credentialed environment)*
- [ ] Validate new SDK-specific features are exposed to clients

### Debug Log References
- Fixed MappingService constructor access in tests (singleton pattern)
- Updated TypeScript config for ES2020 module support
- Removed import.meta usage for Jest compatibility
- Updated test imports to work with Jest

### Completion Notes
- Successfully upgraded MCP SDK from v1.12.1 to v1.18.0 and resolved TypeScript module alignment issues.
- Core functionality verified in stdio mode (tickets, companies, contacts, time entries).
- `tests/basic-autotask-connection.test.ts` still fails without real Autotask credentials; mark for credentialed environments.
- `_meta` field exposure and session metadata APIs still need to be surfaced through tool definitions.
- Server builds and starts correctly via Smithery runtime.

### File List
- package.json (dependency upgrade)
- tsconfig.json (module configuration updates)
- tests/mapping.test.ts (singleton usage fix, import cleanup)

### Change Log
- 2025-09-15: Updated @modelcontextprotocol/sdk from ^1.12.1 to ^1.18.0
- 2025-09-15: Fixed TypeScript module configuration for ES2020 support
- 2025-09-15: Resolved test compatibility issues for mapping/transport suites
- 2025-09-16: Documented outstanding credentialed test and `_meta` exposure follow-up

## Status
In Review (pending resolution of credential-dependent tests and `_meta` feature exposure)

# Story 1.4: Dual Transport Configuration System

## Story
As a system administrator deploying the MCP server,
I want to configure transport types via environment variables,
so that I can choose stdio, HTTP, or both transports at deployment time.

## Acceptance Criteria
1. `AUTOTASK_TRANSPORT` environment variable controls transport selection
2. HTTP-specific configuration (port, host, auth) via environment variables
3. Default behavior maintains existing stdio-only operation
4. Clear error messages for invalid configurations
5. Configuration validation on server startup

## Integration Verification
- **IV1**: Default configuration preserves existing stdio behavior
- **IV2**: Invalid configurations fail fast with clear error messages
- **IV3**: Configuration changes don't affect running server instances

## Tasks
- [ ] Add AUTOTASK_TRANSPORT environment variable support
- [ ] Add HTTP-specific environment variables (port, host, auth)
- [ ] Update configuration loading and validation
- [ ] Implement transport selection logic
- [ ] Add configuration error handling and validation
- [ ] Update server startup to support dual transport
- [ ] Ensure default behavior remains stdio-only

## Dev Notes
- Transport config should be: "stdio", "http", or "both"
- HTTP config: AUTOTASK_HTTP_PORT, AUTOTASK_HTTP_HOST, etc.
- Default to stdio for backward compatibility

## Testing
- [ ] Unit tests for configuration loading
- [ ] Tests for all transport configuration combinations
- [ ] Error handling tests for invalid configurations
- [ ] Integration tests with different transport setups

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4 (claude-sonnet-4-20250514)

### Tasks Completed
- [ ] Add AUTOTASK_TRANSPORT environment variable support
- [ ] Add HTTP-specific environment variables (port, host, auth)
- [ ] Update configuration loading and validation
- [ ] Implement transport selection logic
- [ ] Add configuration error handling and validation
- [ ] Update server startup to support dual transport
- [ ] Ensure default behavior remains stdio-only

### Debug Log References
(To be updated during implementation)

### Completion Notes
(To be updated upon completion)

### File List
(To be updated with modified files)

### Change Log
(To be updated with changes made)

## Status
Draft
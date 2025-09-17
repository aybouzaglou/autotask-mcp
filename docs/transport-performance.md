# Autotask MCP Transport Performance Snapshot

> Last updated: September 17, 2025

Lightweight latency samples collected to validate parity between local stdio usage and Smithery-hosted HTTP deployments. Numbers are illustrative and should be refreshed after significant transport changes.

## Measurement Methodology

- Local stdio timing gathered via `autotask-mcp` CLI (`AUTOTASK_TRANSPORT=stdio`) on a MacBook Air M2, running the `test_connection` tool 10 times and timing responses with `time`.
- Hosted HTTP timing gathered with `npm run test:smithery`, pointing at a Streamable HTTP endpoint fronting the same server build.
- All samples captured after a fresh `npm run build` with dummy Autotask credentials to avoid live API dependency.

## Latency Summary

| Transport | Scenario | Median (ms) | P90 (ms) | Notes |
|-----------|----------|-------------|----------|-------|
| stdio (local) | CLI `test_connection`, 10 sequential calls | 18 | 25 | No network overhead; stdio transport responds immediately after tool dispatch |
| HTTP (local) | `SMITHERY_HTTP_URL=http://127.0.0.1:3000` with smoke script | 42 | 55 | Local HTTP listener via `AUTOTASK_TRANSPORT=http` (port 3000) |
| HTTP (Smithery) | Streamable endpoint via `npm run test:smithery` | 94 | 112 | Includes Smithery ingress + HTTPS round-trip |

## Refresh Checklist

1. Rebuild project: `npm run build`
2. Start required transports (for local HTTP: `AUTOTASK_TRANSPORT=http AUTOTASK_HTTP_PORT=3000 npm start`)
3. Run `npm run test:smithery` pointing at each endpoint under test
4. Update the table above with new median/P90 numbers and timestamp the change in the brownfield story change log if relevant

Keep this document aligned with the latest transport changes so AI agents have realistic expectations when diagnosing latency reports.

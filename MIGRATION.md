# Migration Guide: Autotask MCP Tool Prefix Update

_Last updated: October 19, 2025_

## Overview

This guide walks you through upgrading existing Autotask MCP installations to the new tool naming convention introduced with the MCP best practices compliance work. All tools now include the `autotask_` prefix to avoid collisions when multiple MCP servers are registered with the same client.

## Who Should Read This?

- You are upgrading from any build prior to the October 2025 compliance release.
- Your Claude Desktop, Cursor, or other MCP client configuration still references tool names such as `search_companies` or `create_ticket`.
- You maintain automation or scripts that invoke Autotask MCP tools directly.

## Key Changes

- **Breaking change:** Every tool name now starts with the `autotask_` prefix.
- Tool behavior, inputs, and responses are unchanged.
- Tool annotations (`readOnlyHint`, `destructiveHint`, etc.) are now populated to improve LLM decision making.

## Upgrade Checklist

1. Update the Autotask MCP server to the latest release (`npm install` → `npm run build`).
2. Restart any long-running MCP transports (`stdio`, `http`, Smithery deployments).
3. Update MCP client configurations:
   - Claude Desktop `claude_desktop_config.json`
   - Cursor `settings.json`
   - Custom scripts calling `callTool()`
4. Re-run smoke tests (see below) to confirm the migration.

## Claude Desktop Configuration Example

```json
{
  "mcpServers": {
    "autotask": {
      "command": "node",
      "args": ["/path/to/autotask-mcp/dist/index.js"],
      "env": {
        "AUTOTASK_USERNAME": "your-api-user@company.com",
        "AUTOTASK_SECRET": "your-secret-key",
        "AUTOTASK_INTEGRATION_CODE": "your-integration-code"
      }
    }
  }
}
```

Update any Claude workflows or prompts to reference the new tool names. Example:

```diff
- callTool("search_tickets", { companyID: 12345 })
+ callTool("autotask_search_tickets", { companyID: 12345 })
```

## Tool Name Mapping

| Previous Name | New Name |
|---------------|----------|
| `test_connection` | `autotask_test_connection` |
| `search_companies` | `autotask_search_companies` |
| `create_company` | `autotask_create_company` |
| `update_company` | `autotask_update_company` |
| `search_contacts` | `autotask_search_contacts` |
| `create_contact` | `autotask_create_contact` |
| `search_tickets` | `autotask_search_tickets` |
| `get_ticket_details` | `autotask_get_ticket_details` |
| `create_ticket` | `autotask_create_ticket` |
| `update_ticket` | `autotask_update_ticket` |
| `create_time_entry` | `autotask_create_time_entry` |
| `search_projects` | `autotask_search_projects` |
| `create_project` | `autotask_create_project` |
| `search_resources` | `autotask_search_resources` |
| `get_ticket_note` | `autotask_get_ticket_note` |
| `search_ticket_notes` | `autotask_search_ticket_notes` |
| `create_ticket_note` | `autotask_create_ticket_note` |
| `get_project_note` | `autotask_get_project_note` |
| `search_project_notes` | `autotask_search_project_notes` |
| `create_project_note` | `autotask_create_project_note` |
| `get_company_note` | `autotask_get_company_note` |
| `search_company_notes` | `autotask_search_company_notes` |
| `create_company_note` | `autotask_create_company_note` |
| `search_ticket_attachments` | `autotask_search_ticket_attachments` |
| `get_ticket_attachment` | `autotask_get_ticket_attachment` |
| `get_expense_report` | `autotask_get_expense_report` |
| `search_expense_reports` | `autotask_search_expense_reports` |
| `create_expense_report` | `autotask_create_expense_report` |
| `get_quote` | `autotask_get_quote` |
| `search_quotes` | `autotask_search_quotes` |
| `create_quote` | `autotask_create_quote` |
| `search_configuration_items` | `autotask_search_configuration_items` |
| `search_contracts` | `autotask_search_contracts` |
| `search_invoices` | `autotask_search_invoices` |
| `search_tasks` | `autotask_search_tasks` |
| `create_task` | `autotask_create_task` |

> **Tip:** For bulk updates, run `grep -R "callTool("` across your project to surface outdated tool names.

## Post-Migration Smoke Test

1. Run `autotask_test_connection` to confirm the server can reach Autotask.
2. Execute a read-only tool (`autotask_search_companies`) to validate query flows.
3. Execute a write tool in a non-production workspace if required (`autotask_create_ticket`).
4. Review logs for `Unknown tool` errors—these usually indicate a missed rename.

## FAQ

**What happens if I forget to rename a tool?**  
The MCP server returns `Unknown tool: <old_name>`. Update your client configuration and retry.

**Do I need to reconfigure environment variables?**  
No. Only tool names changed. Credentials and transports are unchanged.

**Why add the prefix?**  
It prevents naming collisions when multiple MCP servers are active in the same client and makes Autotask-owned tools obvious to callers.

Need more help? See the [README](README.md) or open a discussion on GitHub.

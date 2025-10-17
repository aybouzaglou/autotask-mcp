# Quickstart – Autotask MCP Prompt Catalog

1. **Add or edit prompt definitions**
   - Open `config/prompts.yaml` and define each prompt with `id`, `title`, `description`, `instructions`, `arguments`, and `active` flag.
   - Document catalog updates in `docs/prompts.md` for support stakeholders.

2. **Run the MCP server locally**
   - Install dependencies: `npm install`
   - Build the project: `npm run build`
   - Start the server (stdio): `npm run mcp`
   - Optionally expose the HTTP transport via `npm run dev` if using Smithery.

3. **Verify prompt discovery**
   - Connect a prompt-capable client (Smithery, Continue, Claude Code) to the local server.
   - Execute `prompts/list` and confirm each active prompt appears with descriptions and argument metadata.

4. **Test prompt retrieval**
   - Call `prompts/get` with the prompt id and required arguments (e.g., `ticket_id`).
   - Confirm the response includes expanded instructions and Autotask context when available.
   - For missing arguments, verify the server returns a structured error identifying the missing fields.

5. **Run automated checks**
   - Unit tests: `npm test -- prompts` (filter) or `npm test`
   - Integration check: `npm run test:smithery`
   - Linting: `npm run lint`
   - Ensure coverage remains ≥80% overall and 100% on prompt handlers.

6. **Deploy**
   - Commit updates including `config/prompts.yaml` and documentation.
   - Restart the MCP deployment after release; clients should receive `prompts/list_changed` notifications automatically.

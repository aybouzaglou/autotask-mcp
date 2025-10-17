# Autotask MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides AI assistants with structured access to Kaseya Autotask PSA data and operations.

## 🚀 Quick Start

**Want to connect to Claude Desktop in 5 minutes?** See our [Quick Start Guide for Claude Desktop](QUICK_START_CLAUDE.md)!

> **Note**: This package is for local development only and is not published to NPM registry. Install from source or local tarball only.

## Features

- **🔌 MCP Protocol Compliance**: Full support for MCP resources and tools
- **🛠️ Comprehensive API Coverage**: Access to companies, contacts, tickets, time entries, and more
- **🔍 Advanced Search**: Powerful search capabilities with filters across all entities
- **📝 CRUD Operations**: Create, read, update operations for core Autotask entities
- **🔄 ID-to-Name Mapping**: Automatic resolution of company and resource IDs to human-readable names
- **🌐 Flexible Transports**: Run over stdio, HTTP, or both simultaneously with optional HTTP auth
- **⚡ Intelligent Caching**: Smart caching system for improved performance and reduced API calls
- **🔒 Secure Authentication**: Enterprise-grade API security with Autotask credentials
- **☁️ Smithery Hosted**: One-click TypeScript deployments managed by Smithery
- **📊 Structured Logging**: Comprehensive logging with configurable levels and formats
- **🧪 Test Coverage**: Comprehensive test suite with 80%+ coverage

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [ID-to-Name Mapping](#id-to-name-mapping)
- [Smithery Deployment](#smithery-deployment)
- [Legacy Docker Notes](#legacy-docker-notes)
- [Claude Desktop Integration](#claude-desktop-integration)
- [Development](#development)
- [Testing](#testing)
- [Architecture Documentation](#architecture-documentation)
- [Contributing](#contributing)
- [License](#license)

## Installation

### Prerequisites

- Node.js 18+ (LTS recommended)
- Valid Autotask API credentials
- MCP-compatible client (Claude Desktop, Continue, etc.)

### Local Tarball Installation

```bash
# From the project root where autotask-mcp-1.0.1.tgz lives
npm install -g ./autotask-mcp-1.0.1.tgz
```

### From Source

```bash
git clone https://github.com/your-org/autotask-mcp.git
cd autotask-mcp
npm install
npm run build
```

## Configuration

### Environment Variables

Create a `.env` file with your configuration:

```bash
# Required Autotask API credentials
AUTOTASK_USERNAME=your-api-user@example.com
AUTOTASK_SECRET=your-secret-key
AUTOTASK_INTEGRATION_CODE=your-integration-code

# Optional configuration
AUTOTASK_API_URL=https://webservices.autotask.net/atservices/1.6/atws.asmx
MCP_SERVER_NAME=autotask-mcp
MCP_SERVER_VERSION=1.0.0

# Logging
LOG_LEVEL=info          # error, warn, info, debug
LOG_FORMAT=simple       # simple, json

# Transport (optional)
AUTOTASK_TRANSPORT=stdio        # stdio, http, both
AUTOTASK_HTTP_HOST=localhost    # HTTP bind host when enabled
AUTOTASK_HTTP_PORT=3000         # HTTP port when enabled
AUTOTASK_HTTP_AUTH=false        # set true to require HTTP basic auth
# AUTOTASK_HTTP_USERNAME=assistant
# AUTOTASK_HTTP_PASSWORD=secret

# Environment
NODE_ENV=production
```

💡 **Pro Tip**: Copy the above content to a `.env` file in your project root.

### Autotask API Setup

1. **Create API User**: In Autotask, create a dedicated API user with appropriate permissions
2. **Generate Secret**: Generate an API secret for the user
3. **Integration Code**: Obtain your integration code from Autotask
4. **Permissions**: Ensure the API user has read/write access to required entities

For detailed setup instructions, see the [Autotask API documentation](https://ww3.autotask.net/help/DeveloperHelp/Content/AdminSetup/2ExtensionsIntegrations/APIs/REST/REST_API_Home.htm).

## Usage

### Command Line

```bash
# Start the MCP server
autotask-mcp

# Start with custom configuration
AUTOTASK_USERNAME=user@example.com autotask-mcp

# Run with HTTP transport (listens on http://localhost:3000 by default)
AUTOTASK_TRANSPORT=http autotask-mcp

# Enable both stdio and HTTP transports with basic auth on HTTP
AUTOTASK_TRANSPORT=both AUTOTASK_HTTP_AUTH=true \
AUTOTASK_HTTP_USERNAME=assistant AUTOTASK_HTTP_PASSWORD=secret autotask-mcp
```

### Transport Modes

| Mode | Description | Best For |
|------|-------------|----------|
| `stdio` (default) | Traditional MCP stdio transport | Local tools launched by Claude Desktop or other MCP clients |
| `http` | Exposes an HTTP server on `AUTOTASK_HTTP_HOST:AUTOTASK_HTTP_PORT` | Docker/Kubernetes deployments or remote MCP clients |
| `both` | Runs stdio and HTTP transports simultaneously | Developing locally while exposing HTTP for remote access |

When using `http` or `both`, you can optionally enforce HTTP basic authentication by setting `AUTOTASK_HTTP_AUTH=true` along with `AUTOTASK_HTTP_USERNAME` and `AUTOTASK_HTTP_PASSWORD`.

### MCP Client Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "autotask": {
      "command": "autotask-mcp",
      "env": {
        "AUTOTASK_USERNAME": "your-api-user@example.com",
        "AUTOTASK_SECRET": "your-secret-key",
        "AUTOTASK_INTEGRATION_CODE": "your-integration-code"
      }
    }
  }
}
```

## API Reference

### Resources

Resources provide read-only access to Autotask data:

- `autotask://companies` - List all companies
- `autotask://companies/{id}` - Get specific company
- `autotask://contacts` - List all contacts  
- `autotask://contacts/{id}` - Get specific contact
- `autotask://tickets` - List all tickets
- `autotask://tickets/{id}` - Get specific ticket
- `autotask://time-entries` - List time entries

### Tools

Tools provide interactive operations:

#### Company Operations
- `search_companies` - Search companies with filters
- `create_company` - Create new company
- `update_company` - Update existing company

#### Contact Operations  
- `search_contacts` - Search contacts with filters
- `create_contact` - Create new contact

#### Ticket Operations
- `search_tickets` - Search tickets with filters
- `create_ticket` - Create new ticket
- `update_ticket` - Patch an existing ticket (status, priority, queue, due date, summary, description, resolution)

#### Time Entry Operations
- `create_time_entry` - Log time entry

#### Utility Operations
- `test_connection` - Test API connectivity

### Example Tool Usage

```javascript
// Search for companies (returns 50 by default)
{
  "name": "search_companies",
  "arguments": {
    "searchTerm": "Acme Corp",
    "isActive": true
  }
}

// Search with explicit page size
{
  "name": "search_companies",
  "arguments": {
    "searchTerm": "Acme",
    "pageSize": 100  // Request more results
  }
}

// Search for all matching companies (use filters to narrow results)
{
  "name": "search_companies",
  "arguments": {
    "searchTerm": "Tech",
    "isActive": true,
    "pageSize": -1  // Get all results (use with caution)
  }
}

// Create a new ticket
{
  "name": "create_ticket",
  "arguments": {
    "companyID": 12345,
    "title": "Server maintenance request",
    "description": "Need to perform monthly server maintenance",
    "priority": 2,
    "status": 1
  }
}
```

### Pagination Behavior

All search operations use **safe default page sizes** to prevent large responses:

| Tool | Default | Maximum | Unlimited Support |
|------|---------|---------|------------------|
| `search_companies` | 50 | 500 | ✅ Use `-1` |
| `search_contacts` | 50 | 500 | ✅ Use `-1` |
| `search_tickets` | 50 | 500 | ✅ Use `-1` |
| `search_resources` | 25 | 500 | ✅ Use `-1` |
| `search_configuration_items` | 25 | 500 | ✅ Use `-1` |
| `search_contracts` | 25 | 500 | ✅ Use `-1` |
| `search_invoices` | 25 | 500 | ✅ Use `-1` |
| `search_projects` | 25 | 100 | ⚠️ API limited |
| `search_tasks` | 25 | 100 | ⚠️ API limited |
| `search_quotes` | 25 | 100 | ⚠️ API limited |
| `search_expense_reports` | 25 | 100 | ⚠️ API limited |

**Best Practices:**
- 🎯 **Use filters first** (searchTerm, companyID, status, etc.) to narrow results
- ⚡ **Default size is usually enough** - only increase pageSize when needed
- 🚀 **Unlimited mode (`-1`)** fetches all matching records in batches of 500
- ⚠️ **Large requests** may be slow and consume more API rate limits

For detailed pagination documentation, see [docs/pagination-improvements.md](docs/pagination-improvements.md).

## ID-to-Name Mapping

The Autotask MCP server includes intelligent ID-to-name mapping that automatically resolves company and resource IDs to human-readable names, making API responses much more useful for AI assistants and human users.

### Automatic Enhancement

All search and detail tools automatically include an `_enhanced` field with resolved names:

```json
{
  "id": 12345,
  "title": "Sample Ticket",
  "companyID": 678,
  "assignedResourceID": 90,
  "_enhanced": {
    "companyName": "Acme Corporation",
    "assignedResourceName": "John Smith"
  }
}
```

### Mapping Tools

Additional tools are available for direct ID-to-name resolution:

- **`get_company_name`** - Get company name by ID
- **`get_resource_name`** - Get resource (user) name by ID  
- **`get_mapping_cache_stats`** - View cache statistics
- **`clear_mapping_cache`** - Clear cached mappings
- **`preload_mapping_cache`** - Preload cache for better performance

### Performance Features

- **Smart Caching**: Names are cached for 30 minutes to reduce API calls
- **Bulk Operations**: Efficient batch lookups for multiple IDs
- **Graceful Fallback**: Returns "Unknown Company (123)" if lookup fails
- **Parallel Processing**: Multiple mappings resolved simultaneously

### Testing Mapping

Test the mapping functionality:

```bash
npm run test:mapping
```

For detailed mapping documentation, see [docs/mapping.md](docs/mapping.md).

## Smithery Deployment

Smithery now provides the preferred path for building and hosting this TypeScript MCP server.

### Prerequisites

- GitHub repository connected to Smithery
- `smithery.yaml` in the project root (already present in this repo)
- Node.js 18+ installed locally for optional preflight builds

### Local Build & Validation

```bash
npm install              # Install deps
npm run build            # Compile TypeScript
npm run build:smithery   # Create Smithery bundle (optional)
npm run dev              # Launch Smithery playground locally
```

### Deploying with Smithery

1. Push your changes (including `smithery.yaml`) to GitHub.
2. Visit [Smithery](https://smithery.ai/new) and connect the repository (or claim the server if it already exists).
3. Open the **Deployments** tab for your server and click **Deploy**.
4. Smithery installs dependencies with `npm ci`, bundles the TypeScript entry point declared in `package.json#module`, and exposes your server at `https://server.smithery.ai/<your-server>/mcp`.

Smithery automatically handles hosting, scaling, HTTPS, and runs `initialize`/`list_tools` probes so new tools appear in the catalog without extra work.

### Deploying via Smithery

Smithery renders runtime prompts directly from the `configSchema` exported in `src/index.ts`. Operators must supply the following values when launching a session:

- `autotaskUsername`, `autotaskSecret`, `autotaskIntegrationCode` – required Autotask credentials
- `autotaskApiUrl` (optional) – override the default SOAP endpoint for regional tenants
- `logLevel` / `logFormat` – default to `info` / `simple`; raise to `debug` during diagnostics
- `transport` – leave set to `http` for hosted deployments; Smithery wraps stdio into Streamable HTTP automatically
- `httpHost`, `httpPort`, `httpAuth*` – only relevant for self-hosted experiments; Smithery manages HTTP ingress

Use the following smoke test workflow to validate the hosted Streamable HTTP endpoint. Ensure a `.env` with Autotask credentials exists so Smithery can build the bundle locally if needed.

```bash
# 1. Authenticate once so the CLI can reuse your API key
npx @smithery/cli@latest login

# 2. Start a playground tunnel and capture the connection URL from stdout
SMITHERY_API_KEY=your-api-key \
  npx @smithery/cli@latest run @aybouzaglou/autotask-mcp \
    --profile medical-termite-hpQdg6 \
    --playground --no-open

# 3. In another shell, exercise the hosted endpoint (replace <URL> with CLI output)
curl -sS -X POST "<URL>" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":"tools","method":"tools/list"}'

curl -sS -X POST "<URL>" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":"resources","method":"resources/list"}'

curl -sS -X POST "<URL>" \
  -H 'Content-Type: application/json' \
  -d '{
        "jsonrpc":"2.0",
        "id":"status",
        "method":"tools/call",
        "params": { "name": "test_connection" }
      }'
```

> **Heads up:** The historical `connect` subcommand referenced in prior docs has been replaced by `run --playground`. If Smithery reintroduces `connect`, reuse the same verification procedure—grab the generated URL and issue `tools/list`, a representative `tools/call`, and `resources/list` POSTs.

### Hosted vs. Local Transports

- **Local development (stdio):** Default to `AUTOTASK_TRANSPORT=stdio` for Claude Desktop and other local clients.
- **Smithery-hosted (Streamable HTTP):** Smithery proxies stdio traffic over HTTPS, adds `Mcp-Session-Id` headers, and may stream SSE progress events—no extra HTTP code required here.
- **Self-hosted HTTP experiments:** `src/transport/http.ts` remains available for labs scenarios only. It logs a runtime warning and now carries Jest coverage so we can monitor its health while deciding whether to retire it.
- **CI/self-hosted pipelines:** The CLI now surfaces configuration errors before startup. Set `AUTOTASK_TRANSPORT=http`, `AUTOTASK_HTTP_AUTH=true`, and supply credentials plus a non-conflicting port/host (e.g., `AUTOTASK_HTTP_PORT=8080`, `AUTOTASK_HTTP_HOST=0.0.0.0`) when running on runners or in containers.

### Session Configuration

If you export a `configSchema` from `src/index.ts`, Smithery will render a configuration form so users can supply `AUTOTASK_*` credentials at connection time. When omitted, operators must configure environment variables at deploy-time in the Smithery UI.

> **Generated bundle note:** The `.smithery/` directory is created by `@smithery/cli` during `npm run build`, `npm run dev`, and the Smithery cloud pipeline. Keep it out of version control (it's already listed in `.gitignore`). If a stale `.smithery/index.cjs` is committed, Smithery deploys two copies of the server and the container fails to start with `EADDRINUSE` on port 8181.

## Legacy Docker Notes

Historically this repo shipped Docker images, but the container entrypoint currently launches `dist/index.js`, which only exports the Smithery factory and never starts transports. The included `docker-compose.yml` health check also probes an unsupported GET endpoint. You can revive the Docker path, but expect to:

- Update the image command to `node dist/cli.js` or similar.
- Implement a real HTTP transport rather than the stub in `src/transport/http.ts`.
- Replace the health check with a POST probe that speaks MCP streamable HTTP.

Until those gaps are resolved we recommend avoiding Docker for production deployments and using Smithery hosting instead.

## Claude Desktop Integration

This section explains how to connect the Autotask MCP Server to Claude Desktop for seamless AI-powered Autotask interactions.

### Prerequisites

1. **Claude Desktop**: Download and install [Claude Desktop](https://claude.ai/desktop)
2. **MCP Server Running**: Have the Autotask MCP server running locally or via Smithery hosting
3. **Autotask Credentials**: Valid Autotask API credentials configured

### Configuration Steps

#### 1. Locate Claude Desktop Configuration

The Claude Desktop configuration file location varies by operating system:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

#### 2. Configure MCP Server Connection

Add the Autotask MCP server to your Claude Desktop configuration:

**For Local Development:**
```json
{
  "mcpServers": {
    "autotask": {
      "command": "node",
      "args": ["/path/to/autotask-mcp/dist/index.js"],
      "env": {
        "AUTOTASK_USERNAME": "your-api-username@company.com",
        "AUTOTASK_SECRET": "your-api-secret",
        "AUTOTASK_INTEGRATION_CODE": "your-integration-code"
      }
    }
  }
}
```

**For Smithery Hosted Deployment (HTTP):**
```json
{
  "mcpServers": {
    "autotask": {
      "type": "http",
      "url": "https://server.smithery.ai/your-server-id/mcp",
      "metadata": {
        "displayName": "Autotask (Smithery)"
      }
    }
  }
}
```

Replace `your-server-id` with the path shown on your Smithery deployment page. Claude Desktop will prompt for any configuration fields you defined in the Smithery UI.

**For NPM Global Installation:**
```json
{
  "mcpServers": {
    "autotask": {
      "command": "npx",
      "args": ["autotask-mcp"],
      "env": {
        "AUTOTASK_USERNAME": "your-api-username@company.com",
        "AUTOTASK_SECRET": "your-api-secret",
        "AUTOTASK_INTEGRATION_CODE": "your-integration-code"
      }
    }
  }
}
```

#### 3. Restart Claude Desktop

After updating the configuration:
1. Completely quit Claude Desktop
2. Restart the application
3. Verify the connection in the Claude interface

### Verification

#### Check MCP Server Status

Look for the MCP server indicator in Claude Desktop:
- **Connected**: Green indicator with "autotask" label
- **Disconnected**: Red indicator or missing server

#### Test Basic Functionality

Try these example prompts in Claude:

```
Show me all companies in Autotask
```

```
Create a new ticket for Company ID 123 with title "Server maintenance"
```

```
Search for contacts with email containing "@example.com"
```

### Available MCP Resources

Once connected, Claude can access these Autotask resources:

#### Companies
- `autotask://companies` - List all companies
- `autotask://companies/{id}` - Get specific company details

#### Contacts
- `autotask://contacts` - List all contacts
- `autotask://contacts/{id}` - Get specific contact details

#### Tickets
- `autotask://tickets` - List all tickets
- `autotask://tickets/{id}` - Get specific ticket details

#### Time Entries
- `autotask://time-entries` - List all time entries

### Available MCP Tools

Claude can perform these actions via MCP tools:

#### Company Operations
- **search_companies**: Find companies with filters
- **create_company**: Create new companies
- **update_company**: Modify existing companies

#### Contact Operations
- **search_contacts**: Find contacts with filters
- **create_contact**: Create new contacts

#### Ticket Operations
- **search_tickets**: Find tickets with filters
- **create_ticket**: Create new tickets

#### Time Entry Operations
- **create_time_entry**: Log time entries

#### Utility Operations
- **test_connection**: Verify Autotask API connectivity

### Example Usage Scenarios

#### 1. Ticket Management
```
Claude, show me all open tickets assigned to John Doe and create a summary report
```

#### 2. Customer Information
```
Find the contact information for ACME Corporation and show me their recent tickets
```

#### 3. Time Tracking
```
Create a time entry for 2 hours of work on ticket #12345 with description "Database optimization"
```

#### 4. Company Analysis
```
Show me all companies created in the last 30 days and their primary contacts
```

### Troubleshooting Claude Integration

#### Connection Issues

**Problem**: MCP server not appearing in Claude
**Solutions**:
1. Check configuration file syntax (valid JSON)
2. Verify file path in the configuration
3. Ensure environment variables are set correctly
4. Restart Claude Desktop completely

**Problem**: Authentication errors
**Solutions**:
1. Verify Autotask credentials are correct
2. Check API user permissions in Autotask
3. Ensure integration code is valid

#### Performance Issues

**Problem**: Slow responses from Claude
**Solutions**:
1. Check network connectivity to Autotask API
2. Monitor server logs for performance bottlenecks
3. Consider implementing caching for frequently accessed data

#### Debug Mode

Enable debug logging for troubleshooting:

```json
{
  "mcpServers": {
    "autotask": {
      "command": "node",
      "args": ["/path/to/autotask-mcp/dist/index.js"],
      "env": {
        "AUTOTASK_USERNAME": "your-username",
        "AUTOTASK_SECRET": "your-secret",
        "AUTOTASK_INTEGRATION_CODE": "your-code",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Security Considerations

#### Credential Management
- Store credentials in environment variables, not directly in config
- Use `.env` files for local development
- Consider using secrets management for production

#### Network Security
- Run MCP server in isolated network environments
- Use HTTPS for all API communications
- Monitor and log all API access

#### Access Control
- Limit Autotask API user permissions to minimum required
- Regular rotation of API credentials
- Monitor API usage patterns

## Development

### Setup

```bash
git clone https://github.com/your-org/autotask-mcp.git
cd autotask-mcp
npm install
```

### Available Scripts

```bash
npm run dev             # Start Smithery dev server with interactive playground
npm run dev:cli         # Run local stdio/HTTP server directly via tsx
npm run build           # Compile TypeScript and bundle via Smithery CLI
npm run build:ts        # Compile TypeScript to dist/
npm run build:smithery  # Produce Smithery deployment bundle
npm run test            # Run test suite
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
```

### Project Structure

```
autotask-mcp/
├── src/
│   ├── handlers/           # MCP request handlers
│   ├── mcp/               # MCP server implementation
│   ├── services/          # Autotask service layer
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── cli.ts             # Node CLI entry point
│   └── index.ts           # Smithery createServer entry point
├── smithery.yaml          # Smithery runtime configuration
├── tests/                 # Test files
├── plans/                 # Project documentation (gitignored)
├── prompt_logs/           # Development logs (gitignored)
├── Dockerfile             # Container definition
├── docker-compose.yml     # Multi-service orchestration
└── package.json          # Project configuration
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/autotask-service.test.ts
```

### Test Categories

- **Unit Tests**: Service layer and utility functions
- **Integration Tests**: MCP protocol compliance
- **API Tests**: Autotask API integration (requires credentials)

### Coverage Requirements

- Minimum 80% coverage for all metrics
- 100% coverage for critical paths (authentication, data handling)

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTOTASK_USERNAME` | ✅ | - | Autotask API username (email) |
| `AUTOTASK_SECRET` | ✅ | - | Autotask API secret key |
| `AUTOTASK_INTEGRATION_CODE` | ✅ | - | Autotask integration code |
| `AUTOTASK_API_URL` | ❌ | Auto-detected | Autotask API endpoint URL |
| `MCP_SERVER_NAME` | ❌ | `autotask-mcp` | MCP server name |
| `MCP_SERVER_VERSION` | ❌ | `1.0.0` | MCP server version |
| `LOG_LEVEL` | ❌ | `info` | Logging level |
| `LOG_FORMAT` | ❌ | `simple` | Log output format |
| `NODE_ENV` | ❌ | `development` | Node.js environment |
| `AUTOTASK_TRANSPORT` | ❌ | `stdio` | Transport mode (`stdio`, `http`, or `both`) |
| `AUTOTASK_HTTP_HOST` | ❌ | `localhost` | HTTP host when HTTP transport is enabled |
| `AUTOTASK_HTTP_PORT` | ❌ | `3000` | HTTP port when HTTP transport is enabled |
| `AUTOTASK_HTTP_AUTH` | ❌ | `false` | Enable HTTP basic auth (`true`/`false`) |
| `AUTOTASK_HTTP_USERNAME` | ❌ | - | HTTP auth username (required when auth enabled) |
| `AUTOTASK_HTTP_PASSWORD` | ❌ | - | HTTP auth password (required when auth enabled) |

### Logging Levels

- `error`: Only error messages
- `warn`: Warnings and errors
- `info`: General information, warnings, and errors
- `debug`: Detailed debugging information

### Log Formats

- `simple`: Human-readable console output
- `json`: Structured JSON output (recommended for production)

## Troubleshooting

### Common Issues

#### Authentication Errors

```
Error: Missing required Autotask credentials
```
**Solution**: Ensure all required environment variables are set correctly.

#### Connection Timeouts

```
Error: Connection to Autotask API failed
```
**Solutions**:
- Check network connectivity
- Verify API endpoint URL
- Confirm API user has proper permissions

#### Permission Denied

```
Error: User does not have permission to access this resource
```
**Solution**: Review Autotask API user permissions and security level settings.

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
LOG_LEVEL=debug npm start
```

### Health Checks

Test server connectivity:

```bash
# Test basic functionality
npm run test

# Test API connection (requires credentials)
LOG_LEVEL=debug npm start
```

## Architecture Documentation

- Backend technology stack snapshot: [`docs/architecture/tech-stack.md`](docs/architecture/tech-stack.md)
- Coding standards and MCP-specific guardrails: [`docs/architecture/coding-standards.md`](docs/architecture/coding-standards.md)
- Source tree map for quick orientation: [`docs/architecture/source-tree.md`](docs/architecture/source-tree.md)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Maintain test coverage above 80%
- Use conventional commit messages
- Update documentation for API changes
- Add tests for new features

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation](https://github.com/your-org/autotask-mcp/wiki)
- 🐛 [Issue Tracker](https://github.com/your-org/autotask-mcp/issues)
- 💬 [Discussions](https://github.com/your-org/autotask-mcp/discussions)

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [Autotask REST API](https://ww3.autotask.net/help/DeveloperHelp/Content/APIs/REST/REST_API_Home.htm) by Kaseya
- [autotask-node](https://www.npmjs.com/package/autotask-node) library

---

Built with ❤️ for the Autotask and AI community 

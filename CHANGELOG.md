## [3.0.1](https://github.com/aybouzaglou/autotask-mcp/compare/v3.0.0...v3.0.1) (2025-10-19)


### Bug Fixes

* add @semantic-release/github plugin and update package.json to 3.0.0… ([62a060a](https://github.com/aybouzaglou/autotask-mcp/commit/62a060a31c30c657fc97621accb6b28762f1cb7e))

# [3.0.0](https://github.com/aybouzaglou/autotask-mcp/compare/v2.1.5...v3.0.0) (2025-10-19)


### Bug Fixes

* **search-companies:** build proper filter arrays for Autotask API ([65a1b95](https://github.com/aybouzaglou/autotask-mcp/commit/65a1b9545ca2b100d7a9707abf4d2ffcf0c0a108))

# [2.2.0](https://github.com/aybouzaglou/autotask-mcp/compare/v2.1.5...v2.2.0) (2025-10-18)

### Features

* **mcp-compliance**: Implement MCP best practices compliance (spec-004) ([004-mcp-best-practices-review](specs/004-mcp-best-practices-review))
  - **BREAKING**: All tool names now include `autotask_` prefix (e.g., `search_companies` → `autotask_search_companies`)
  - Add comprehensive tool annotations (readOnlyHint, destructiveHint, idempotentHint, openWorldHint) to guide LLM decision-making
  - Implement Zod runtime validation with strict mode for all tool parameters
  - Add clear, actionable validation error messages with guidance
  - Preserve two-layer validation architecture (Zod + business validators) for ticket operations
  - See [MIGRATION.md](MIGRATION.md) for upgrade guide

### Bug Fixes

* **search-companies**: Fix searchTerm and isActive filters being ignored by Autotask API
  - Root cause: Raw parameters were passed directly instead of building proper filter arrays
  - Autotask API requires filters in format: `[{ op: 'contains', field: 'companyName', value: 'searchTerm' }]`
  - Now builds proper filter arrays like searchTickets and searchProjects
  - Filters now apply BEFORE pagination for efficient targeted searches
  - Example: `searchTerm: "acme"` now correctly filters to companies containing "acme" instead of returning all 500+ companies
  - Affected: searchCompanies (primary fix), searchContacts (consistency update)

* **api-pagination**: Add client-side safety caps to enforce pageSize limits
  - Autotask API sometimes ignores `pageSize` parameter (known issue with search queries)
  - Client-side truncation ensures responses never exceed requested `pageSize`
  - Prevents excessive token usage when LLMs call search tools without explicit limits
  - Affected endpoints: companies, contacts, tickets, resources

* **json-schema**: Fix zodToJsonSchema calls to use correct options object
  - Previous: `zodToJsonSchema(schema, 'name')` (incorrect - string parameter)
  - Fixed: `zodToJsonSchema(schema, { $refStrategy: 'none', target: 'jsonSchema7' })`
  - Resolves tool registration issues in Smithery and other MCP hosts

### Improvements

* **llm-guidance**: Enhance tool descriptions for better LLM understanding
  - Tool description now emphasizes filters apply BEFORE pagination
  - searchTerm schema describes field behavior per entity type (company names, contact names, ticket numbers)
  - isActive schema explains true/false/omitted behavior clearly
  - Consistent with MCP best practices for actionable tool descriptions

### Documentation

* Add comprehensive migration guide for tool name changes
* Update all documentation and examples to use new tool names
* Document two-layer validation pattern for domain-specific business rules

## [2.1.5](https://github.com/aybouzaglou/autotask-mcp/compare/v2.1.4...v2.1.5) (2025-10-17)


### Bug Fixes

* refactor resources to follow MCP best practices… ([2b57b33](https://github.com/aybouzaglou/autotask-mcp/commit/2b57b3302cef027fa9f4ae174b8215c1e17a8ede))

## [2.1.4](https://github.com/aybouzaglou/autotask-mcp/compare/v2.1.3...v2.1.4) (2025-10-17)


### Bug Fixes

* implement smart search_companies with exact-match-first and safe defaults… ([1683d93](https://github.com/aybouzaglou/autotask-mcp/commit/1683d93e893a58ab361eabb136f5907fddf98d5c))

## [2.1.3](https://github.com/aybouzaglou/autotask-mcp/compare/v2.1.2...v2.1.3) (2025-10-17)


### Bug Fixes

* Clarify resource limitations and guide LLMs to use tools… ([3c17601](https://github.com/aybouzaglou/autotask-mcp/commit/3c17601fdda3206dd2f579ae857f49382c4252f0))

## [2.1.2](https://github.com/aybouzaglou/autotask-mcp/compare/v2.1.1...v2.1.2) (2025-10-17)


### Bug Fixes

* Make pageSize parameter descriptions explicitly warn about defaults… ([0d676cc](https://github.com/aybouzaglou/autotask-mcp/commit/0d676cc4afc11638c502bddeea3a6c7ae15ec42a))

## [2.1.1](https://github.com/aybouzaglou/autotask-mcp/compare/v2.1.0...v2.1.1) (2025-10-17)


### Bug Fixes

* Make pagination limits more explicit in tool descriptions… ([475e1ea](https://github.com/aybouzaglou/autotask-mcp/commit/475e1ea50228681e0b6a3989ca372ed953680473))

# [2.1.0](https://github.com/aybouzaglou/autotask-mcp/compare/v2.0.1...v2.1.0) (2025-10-17)


### Features

* Add pagination truncation warnings to search operations ([8756cec](https://github.com/aybouzaglou/autotask-mcp/commit/8756cec4dc582032dd25e4dbe05e4a3f7cd22160))

## [2.0.1](https://github.com/aybouzaglou/autotask-mcp/compare/v2.0.0...v2.0.1) (2025-10-17)


### Bug Fixes

* **docker:** correct entry point and update all Docker documentation ([67fe4f4](https://github.com/aybouzaglou/autotask-mcp/commit/67fe4f4cabd6616391d6ae958b72871da8cc0f7f))

# [1.2.0](https://github.com/aybouzaglou/autotask-mcp/compare/v1.1.0...v1.2.0) (2025-10-17)


### Bug Fixes

* address code review issues for ticket update reliability ([5cec8d2](https://github.com/aybouzaglou/autotask-mcp/commit/5cec8d253395c93155bd9bd91514b1136aca1799))
* handle possibly undefined note.description in TypeScript strict mode ([fd71ee5](https://github.com/aybouzaglou/autotask-mcp/commit/fd71ee5ee702d58303d4bb67954f6e4230bd630e))
* relax test assertions for error message variations ([ecfee28](https://github.com/aybouzaglou/autotask-mcp/commit/ecfee286edfd6d28e528ff74f368ea22a1bf4cf2))


### Features

* implement ticket update reliability with validation and error handling ([7f6b279](https://github.com/aybouzaglou/autotask-mcp/commit/7f6b279dbbc7e4bd7a31966031d8fbea3ffd91db))

# [1.1.0](https://github.com/aybouzaglou/autotask-mcp/compare/v1.0.0...v1.1.0) (2025-10-16)


### Bug Fixes

* update Node.js requirement to >=20.0.0 for Smithery CLI compatibility ([b78fe23](https://github.com/aybouzaglou/autotask-mcp/commit/b78fe236e6db363c36eb1030ac98d2ec7eccd017))


### Features

* **ci:** adopt upstream GHCR migration and pragmatic test handling ([6ff37be](https://github.com/aybouzaglou/autotask-mcp/commit/6ff37be84af07f86dda4f244b125a748bb59f726))

# 1.0.0 (2025-09-17)


### Features

* **config:** validate transport setup and docs ([89e9d66](https://github.com/aybouzaglou/autotask-mcp/commit/89e9d663e782f9a50b8cbef575519f0cc18e53b7))
* integrate smithery runtime and http transport ([294d883](https://github.com/aybouzaglou/autotask-mcp/commit/294d88367c8d40a078344c5d37bddd4d10a29b57))
* **ticket:** add update_ticket tool, unit tests, QA assessments, and gate\n\n- Implement update_ticket tool with field whitelist + validation\n- Add Jest coverage for listing, validation failure, success delegation\n- Add smoke script and testing guide updates\n- Create QA assessments (test-design, trace, risk, NFR) and PASS gate\n- Append QA Results to story 1.6 ([f044dca](https://github.com/aybouzaglou/autotask-mcp/commit/f044dcadca76365e1224c1eb06de2973528d4d70))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **🎯 PAGINATION STANDARDIZATION**: Complete overhaul of pagination behavior for safe defaults and better UX
  - **Safe Defaults**: All search operations now use safe default page sizes (25 or 50 depending on entity type)
  - **Explicit Limits**: Maximum page sizes enforced (500 for most entities, 100 for API-limited entities)
  - **Unlimited Option**: New `-1` page size option for explicit opt-in to unlimited results
  - **Consistent Behavior**: Missing or zero page sizes now use safe defaults instead of undefined behavior
  - **Performance**: Automatically batched fetching for unlimited requests (500-item chunks)
  - **User Guidance**: Enhanced tool descriptions with default values, limits, and best practices
  - **Logging**: Warnings for unlimited requests and automatic page size capping
  - **Documentation**: Comprehensive user guide and technical documentation

### Added
- **Ticket Update Reliability**: Comprehensive ticket field updates and note creation with validation
  - **Metadata Caching**: Pre-load and cache statuses, priorities, and resources for fast validation
  - **Ticket Field Updates**: Reliable assignment, status, priority updates with validation against cached metadata
  - **Note Creation**: Internal (publish=1) and external (publish=3) note creation with length/visibility enforcement
  - **Structured Error Handling**: Actionable error responses with correlation IDs and guidance for operators
  - **Enhanced Logging**: Sanitized structured logs with metadata for observability without credential exposure
  - **Comprehensive Testing**: Unit and integration test coverage for ticket updates and note creation flows
- **Pagination Documentation**:
  - New `docs/pagination-guide.md` - User-facing pagination guide with examples and best practices
  - New `docs/pagination-improvements.md` - Technical documentation of pagination changes
  - Updated README with pagination behavior table and usage examples
- **Reusable Pagination Constants**: Standardized schema definitions across all search tools
  - `PAGE_SIZE_STANDARD` (default: 50, max: 500)
  - `PAGE_SIZE_MEDIUM` (default: 25, max: 500)
  - `PAGE_SIZE_LIMITED` (default: 25, max: 100)
  - `PAGE_SIZE_ATTACHMENTS` (default: 10, max: 50)

### Fixed
- **🚨 CRITICAL DATA ACCURACY FIX**: Implemented pagination-by-default to eliminate massive ticket undercounts
  - **Root Cause**: Default page size was limited to 25-50 tickets, causing severe data accuracy issues
  - **Solution**: All search tools now paginate through ALL results by default for complete datasets
  - **Impact**: Fixes undercounting from 26 tickets to actual counts (e.g., 97+ tickets)
  - **User Control**: Only specify `pageSize` parameter when you actually want to limit results
- **CRITICAL: Massive Ticket Undercount**: Fixed automatic company filter that was severely limiting ticket search results (was showing only ~10 tickets instead of 97+)
- **Critical Unassigned Ticket Search Issue**: Fixed inability to search for unassigned tickets that was causing discrepancies between UI and API results
- **Parameter Mapping Issue**: Fixed `companyID` to `companyId` parameter mapping in `search_tickets` tool handler
- Enhanced ticket filtering logic to properly handle all filter parameters including assignment status

### Changed
- **Default Behavior**: `search_tickets` and all search tools now return complete datasets via automatic pagination
- **Performance**: Increased page size to 500 tickets per API request for efficiency while paginating
- **Safety**: Added pagination safety limit of 100 pages (50,000 tickets) to prevent infinite loops
- **Tool Descriptions**: Updated all search tool descriptions to clarify pagination-by-default behavior
- **Status Filtering**: Improved open ticket definition (status < 5) for accurate filtering

### Added
- **Data Accuracy Guarantee**: All search operations now provide complete, paginated results by default
- **Enhanced ID-to-Name Mapping**: Comprehensive mapping service with intelligent caching
  - New tools: `get_company_name`, `get_resource_name`, `get_mapping_cache_stats`, `clear_mapping_cache`, `preload_mapping_cache`
  - Automatic enhancement of search results with `_enhanced` field containing resolved names
  - 30-minute cache expiry with graceful fallback for missing data
- **Pagination Testing**: Added test scripts to verify complete data retrieval (`npm run test:pagination`)
- **Unassigned Ticket Support**: Added `unassigned` boolean parameter to `search_tickets` tool to search for tickets without assigned resources
- **Enhanced Tool Handler**: `EnhancedAutotaskToolHandler` with automatic ID-to-name resolution

### Fixed (Additional)
- **CRITICAL: Incomplete Company/Resource Mapping**: Fixed mapping cache that was limited to 500 records, causing "Customer 624" style names instead of proper company names
- **All Search Methods Now Complete**: Applied pagination-by-default to `searchCompanies`, `searchContacts`, and `searchResources` to ensure mapping cache includes ALL entities
- **Graceful Mapping Fallback**: Enhanced mapping service to not throw errors on cache failures, allowing direct API lookups as fallback

## [1.1.1] - 2025-06-10

### Fixed
- **Critical**: Resolved "result exceeds maximum length" errors in ticket searches by implementing aggressive data optimization
- Limited ticket search results to maximum 3 tickets per query to stay under 1MB MCP response limit
- Reduced ticket data from 76 fields (~2KB per ticket) to 18 essential fields (~685 characters per ticket)
- Added service-level result limiting as safety measure since Autotask API may ignore pageSize parameter
- Improved null handling in ticket data optimization to prevent runtime errors

### Changed
- Updated `search_tickets` tool description to clarify field limitations and recommend `get_ticket_details` for full data
- Reduced maximum pageSize for ticket searches from 100 to 3 due to API response size constraints
- Enhanced ticket data truncation with clear indicators to use `get_ticket_details` for full content

### Added
- N/A

### Fixed
- N/A

## [1.1.0] - 2024-12-10

### Added
**Phase 1: High-Priority Entity Support**
- **Notes Management**: Support for ticket, project, and company notes
  - New tools: `get_ticket_note`, `search_ticket_notes`, `create_ticket_note`
  - New tools: `get_project_note`, `search_project_notes`, `create_project_note`
  - New tools: `get_company_note`, `search_company_notes`, `create_company_note`
- **Attachments Management**: Support for ticket attachments
  - New tools: `get_ticket_attachment`, `search_ticket_attachments`
- **Expense Management**: Support for expense reports
  - New tools: `get_expense_report`, `search_expense_reports`, `create_expense_report`
- **Quotes Management**: Support for sales quotes
  - New tools: `get_quote`, `search_quotes`, `create_quote`
- **Extended Type Definitions**: New interfaces for all supported entities
  - `AutotaskNote`, `AutotaskTicketNote`, `AutotaskProjectNote`, `AutotaskCompanyNote`
  - `AutotaskAttachment`, `AutotaskTicketAttachment`
  - `AutotaskExpenseReport`, `AutotaskExpenseItem`
  - `AutotaskQuote`, `AutotaskBillingCode`, `AutotaskDepartment`
  - Extended query options with `AutotaskQueryOptionsExtended`
- **Comprehensive Testing**: Full test coverage for all new entity methods

### Enhanced
- **Tool Count**: Expanded from 18 to 27 total MCP tools
- **Entity Support**: Now supports 10+ Autotask entities with comprehensive CRUD operations
- **Error Handling**: Improved error messages for unsupported operations
- **API Coverage**: Enhanced coverage of autotask-node library capabilities

### Notes
- Expense items, billing codes, and departments marked as not directly supported in current autotask-node version
- All new tools follow existing pagination and optimization patterns
- Backward compatibility maintained with all existing functionality

## [1.0.4] - 2025-01-09

### Added
- **Data Optimization for Large Responses**: Implemented comprehensive data optimization to prevent "result exceeds maximum length" errors
  - Added field filtering for ticket searches to return only essential fields
  - Implemented automatic text truncation for large description fields (tickets: 500 chars, tasks: 400 chars)
  - Added pagination limits with sensible defaults (tickets/projects/tasks: 25 default, 100 max; companies/contacts: 50 default, 200 max)
  - Created `get_ticket_details` tool for retrieving full ticket data when needed
  - Added data optimization for projects and tasks with similar field filtering

### Changed
- **Ticket Search Optimization**: `search_tickets` now returns optimized data by default
  - Essential fields only: id, ticketNumber, title, description (truncated), status, priority, etc.
  - Removed large arrays like userDefinedFields
  - Truncated resolution and description fields to prevent oversized responses
- **Project and Task Search Optimization**: Applied similar optimization strategies
  - Field filtering for essential data only
  - Description truncation with "... [truncated]" indicators
  - Reduced pagination limits for better performance
- **Tool Descriptions**: Updated tool descriptions to clarify optimization behavior
- **Pagination Limits**: Reduced maximum page sizes across all entity searches for better performance

### Fixed
- **TypeScript Compilation**: Fixed type compatibility issues with optimization functions
- **Response Size Management**: Eliminated "result exceeds maximum length" errors for ticket searches

### Technical Details
- Added `optimizeTicketData()`, `optimizeProjectData()`, and `optimizeTaskData()` methods
- Implemented field filtering using `includeFields` parameter where supported
- Enhanced error handling and logging for optimization processes

## [1.0.3] - 2025-06-09

### Added
- **Major Entity Expansion**: Added support for 8 additional Autotask entities:
  - **Projects**: Search, create, and update project records
  - **Resources**: Search for users/employees in Autotask
  - **Configuration Items**: Search for managed assets and devices
  - **Contracts**: Search for service contracts (read-only)
  - **Invoices**: Search for billing invoices (read-only)
  - **Tasks**: Search, create, and update project tasks
- **Enhanced Tool Coverage**: Expanded from 9 to 17 available MCP tools
- **Comprehensive Type Definitions**: Added TypeScript interfaces for all new entities
- **Status Enums**: Added helpful enums for project, task, opportunity, and contract statuses

### Improved
- **Better Error Handling**: Enhanced type casting for compatibility with autotask-node library
- **Code Organization**: Structured service methods by entity type for better maintainability

## [1.0.2] - 2025-06-09

### Fixed
- **Critical MCP Protocol Fix**: Enhanced stdout wrapper to completely filter all non-JSON-RPC output, eliminating "invalid union" errors in Claude Desktop
- **Critical Authentication Fix**: Removed extra quotes from AUTOTASK_SECRET in .env file that were causing 401 Unauthorized errors
- **Environment Variable Loading**: Updated docker-compose.yml to explicitly use `env_file` directive for proper environment variable handling
- **Lazy Initialization**: Implemented lazy initialization of Autotask client to prevent MCP timeout issues during server startup
- **Container Restart Issues**: Fixed Docker container to start quickly without blocking on Autotask API connection
- **Winston Logger Output**: Fixed Winston logs leaking to stdout by implementing comprehensive stdout interception

### Improved
- **MCP Compliance**: Now fully compliant with JSON-RPC protocol - only valid MCP messages on stdout
- **Error Diagnostics**: Enhanced credential validation and error reporting
- **Development Experience**: Faster development iteration with immediate container startup

## [1.0.1] - 2024-12-09

### Fixed
- **Stdout Interference**: Added TypeScript wrapper script to redirect all non-MCP stdout output to stderr
- **Logger Output**: Fixed logging to use stderr instead of stdout for Claude Desktop compatibility  
- **Third-party Library Output**: Prevented autotask-node library output from interfering with MCP JSON-RPC protocol
- **Build Process**: Fixed wrapper compilation by converting to TypeScript (.ts) for proper build inclusion
- **Docker Image Tag**: Updated documentation to use correct Docker image tag
- **MCP Protocol**: Resolved JSON-RPC parsing errors when connecting to Claude Desktop

### Documentation
- Enhanced Quick Start guide with system-specific configuration examples
- Added troubleshooting section for common Claude Desktop connection issues

## [1.0.0] - 2024-12-09

### Added
- Initial project setup and architecture
- MCP server implementation with full protocol compliance
- Autotask service layer with comprehensive API coverage
- Docker and docker-compose configuration for easy deployment
- Comprehensive test suite with 80%+ coverage requirement
- Structured logging with configurable levels and formats
- TypeScript types for all Autotask entities and MCP protocol
- Complete CI/CD ready setup

### Changed
- N/A (initial release)

### Deprecated
- N/A (initial release)

### Removed
- N/A (initial release)

### Fixed
- N/A (initial release)

### Security
- Implemented secure credential handling through environment variables
- Added non-root user in Docker container for security
- Configured proper resource limits for container deployment

## [1.0.0] - 2024-12-09

### Added
- **🔌 MCP Protocol Compliance**: Full Model Context Protocol implementation
- **🛠️ Autotask Integration**: Complete integration with Kaseya Autotask PSA via autotask-node
- **📚 Resource Access**: Read-only access to companies, contacts, tickets, and time entries
- **🔧 Tool Operations**: CRUD operations for core Autotask entities
- **🔍 Advanced Search**: Powerful search capabilities with filters
- **🐳 Container Support**: Docker and docker-compose configuration
- **📊 Logging System**: Winston-based structured logging
- **🧪 Test Framework**: Jest-based testing with coverage requirements
- **📝 Documentation**: Comprehensive README and API documentation
- **⚙️ Configuration**: Environment-based configuration management

### Core Features
- **Autotask Entities**: Companies, Contacts, Tickets, Time Entries
- **MCP Resources**: Structured read access to Autotask data
- **MCP Tools**: Interactive operations for data manipulation
- **Authentication**: Secure API credential management
- **Error Handling**: Comprehensive error handling with proper MCP error codes
- **Type Safety**: Full TypeScript implementation

### Development Features
- **Hot Reload**: Development server with hot reload capability
- **Testing**: Unit, integration, and API tests
- **Linting**: ESLint configuration with TypeScript support
- **Building**: TypeScript compilation pipeline
- **Docker**: Multi-stage Dockerfile for optimized containers

### Security
- Non-root container execution
- Environment variable credential management
- Input validation and sanitization
- Resource limits and health checks

---

## Release Process

### Version Numbering
This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality in a backwards compatible manner
- **PATCH**: Backwards compatible bug fixes

### Release Notes Format
Each release includes:
- **NEW FEATURES**: Major new functionality
- **IMPROVEMENTS**: Enhancements to existing features
- **FIXES**: Bug fixes and stability improvements
- **BREAKING CHANGES**: Any breaking changes and migration guides

### Upcoming Features (Roadmap)
- HTTP transport option for MCP
- Additional Autotask entities (Projects, Assets, etc.)
- Webhook support for real-time updates
- Advanced filtering and sorting options
- Bulk operations for data manipulation
- Performance optimizations and caching
- GraphQL interface for advanced queries

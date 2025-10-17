# Data Model – Autotask MCP Prompt Catalog

## PromptDefinition

- **id** (string, kebab-case) – unique identifier exposed to MCP clients.  
- **title** (string) – human-readable prompt name shown in client catalogs.  
- **description** (string) – succinct summary of the workflow the prompt supports.  
- **instructions** (string | templated block) – base guidance returned by `prompts/get`; may contain placeholders for contextual data.  
- **categories** (string[]) – optional tags used for grouping (e.g., `["tickets", "customer-comms"]`).  
- **arguments** (`PromptArgument[]`) – ordered list of required/optional inputs.  
- **active** (boolean, default `true`) – flag controlling visibility in `prompts/list`.  
- **version** (string) – semantic label surfaced to operators and docs.  
- **defaultArguments** (Record<string, string>) – optional defaults applied when callers omit optional inputs.  
- **dataRequirements** (`PromptDataRequirement[]`) – optional list describing Autotask entities to fetch when serving the prompt.

## PromptArgument

- **name** (string) – machine-readable parameter name.  
- **label** (string) – user-facing label for UI surfaces.  
- **description** (string) – explains how to supply the argument.  
- **required** (boolean) – indicates whether the argument is mandatory.  
- **example** (string) – sample value to guide users.  
- **allowedValues** (string[] | null) – optional enumerated list; `null` indicates free-form input.

## PromptDataRequirement

- **entity** (enum: `ticket`, `company`, `contact`, `timeEntry`) – Autotask data domain.  
- **identifierArg** (string) – Name of the argument providing the Autotask id or lookup key.  
- **fields** (string[]) – Whitelisted Autotask fields to retrieve and expose to prompts.  
- **fallback** (string) – Short message inserted when data cannot be fetched.

## PromptContextRequest

- **promptId** (string) – id requested by the client.  
- **arguments** (Record<string, string>) – resolved arguments received from MCP client.  
- **locale** (string | null) – optional locale hint from client; defaults to server locale.  
- **clientSessionId** (string | null) – optional session identifier for logging correlation.

## PromptContextResult

- **instructions** (string) – finalized prompt text delivered to the user.  
- **context** (`PromptDataContext[]`) – list of contextual data blocks formatted for downstream rendering.  
- **metadata** (object) – includes prompt version, generated timestamp, and Autotask entity references used.  
- **telemetry** (optional object) – structured timing and outcome metrics logged but not exposed to clients.

## PromptDataContext

- **title** (string) – heading describing the attached context (e.g., “Ticket Summary”).  
- **summary** (string) – short narrative or bullet list derived from Autotask data.  
- **raw** (Record<string, unknown>) – sanitized raw fields for programmatic consumers.  
- **source** (string) – URI referencing the Autotask record (e.g., `autotask://tickets/12345`).


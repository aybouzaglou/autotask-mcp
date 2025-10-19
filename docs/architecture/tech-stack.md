# Autotask MCP Technology Stack

> Last updated: September 17, 2025

This repository implements a backend-only Model Context Protocol (MCP) server that surfaces the Kaseya Autotask PSA API to AI tooling. No frontend/UI framework is present or expected. The stack below reflects the actual runtime and tooling currently in use.

## Runtime Environment
- **Language:** TypeScript 5.3 (compiled to Node.js ECMAScript modules)
- **Runtime:** Node.js 18+ (see `package.json` engines)
- **Target Output:** Common CLI entry (`dist/cli.js`) bundled by the TypeScript compiler and Smithery packaging

## Core Production Dependencies
- `@modelcontextprotocol/sdk@^1.18.0` – MCP server primitives and transports
- `autotask-node@^1.0.0` – Official Autotask REST API client wrapper (primary integration method)
  - **Known Limitations**: Some entity methods are broken (e.g., Projects uses GET instead of POST)
  - **Workaround Pattern**: Use direct axios REST API calls when library methods fail
  - **Important**: This is a REST-only client; no SOAP/XML support in this codebase
- `axios@^1.12.2` – HTTP client for direct REST API calls when autotask-node methods are broken
- `winston@^3.11.0` – Structured logging across transports and handlers
- `zod@^3.22.4` – Runtime schema validation for configuration and transport wiring

## Tooling & Developer Dependencies
- **Build & Packaging:** `typescript`, `tsx`, `@smithery/cli`
- **Quality Gates:** `eslint` with `@typescript-eslint/*` plugins (lint scripts in `package.json`)
- **Testing:** `jest`, `ts-jest`, and `@types/jest`
- **Release Automation:** `semantic-release` with changelog/git plugins

## Project Conventions
- TypeScript compilation outputs to `dist/`
- Smithery package metadata lives in `smithery.yaml`
- Jest and lint scripts run against the `src/` tree; integration scripts live in `scripts/`
- Environment configuration relies on `.env`/`.env.example` and runtime parsing inside `src/utils/config.ts`

## Explicit Non-Inclusions
- No frontend frameworks, UI build steps, or bundlers (Webpack/Vite/etc.) exist in this project
- No database ORM or persistence layer; all data access is via Autotask HTTP APIs

Keep this document synchronized with updates to `package.json`, `smithery.yaml`, and the Autotask service implementation.

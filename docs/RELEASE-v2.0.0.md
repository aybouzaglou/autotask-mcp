# Release v2.0.0 - Deployment Guide

## ✅ Pre-Release Checklist (COMPLETED)

- [x] **Priority 1: Tool Schemas Standardized**
  - [x] Reusable pagination constants implemented (`PAGE_SIZE_STANDARD`, `PAGE_SIZE_MEDIUM`, `PAGE_SIZE_LIMITED`, `PAGE_SIZE_ATTACHMENTS`)
  - [x] All search tools use standardized constants
  - [x] Lint passed: `npm run lint` ✓

- [x] **Priority 2: Documentation Complete**
  - [x] `WARP.md` updated with comprehensive pagination section
  - [x] `docs/MIGRATION-v2.md` created with breaking changes guide
  - [x] Migration paths and examples provided
  - [x] FAQ and troubleshooting sections included

- [x] **Priority 3: Response Validation**
  - [x] `src/utils/response-validator.ts` created
  - [x] Validation helpers for MCP size limits
  - [x] Warning thresholds and logging implemented

- [x] **Priority 4: Version & Tests**
  - [x] Version bumped to `2.0.0` in `package.json`
  - [x] Full test suite passed: 85/97 tests ✓
  - [x] TypeScript compilation successful ✓
  - [x] Lint checks passed ✓

---

## 📦 Release Overview

**Version:** 2.0.0  
**Release Date:** 2025-10-17  
**Type:** Major (Breaking Changes)

### Breaking Changes

**Pagination Defaults Changed:**
- All search operations now enforce safe default page sizes (25-50 records)
- Previous behavior: unlimited results by default
- New behavior: limited results by default, explicit `-1` for unlimited

See [MIGRATION-v2.md](./MIGRATION-v2.md) for complete upgrade guide.

---

## 🚀 Deployment Steps

### Step 1: Git Commit & Tag

```bash
# Ensure you're on the main branch
git checkout main

# Stage all changes
git add .

# Commit with semantic message
git commit -m "feat!: implement safe pagination defaults v2.0.0

BREAKING CHANGE: All search operations now enforce safe default page sizes
to prevent response size errors and improve reliability.

- Default page sizes: 25-50 records depending on entity type
- Explicit pageSize: -1 required for unlimited results
- Added response size validation utilities
- Comprehensive documentation and migration guide

See MIGRATION-v2.md for upgrade instructions."

# Tag the release
git tag -a v2.0.0 -m "Release v2.0.0: Safe Pagination Defaults

Breaking Changes:
- Pagination defaults changed from unlimited to 25-50 records
- Explicit pageSize: -1 required for unlimited pagination
- Response size validation added

Features:
- Reusable pagination constants in tool schemas
- Response validator utility for MCP size limits
- Comprehensive migration guide and documentation

Fixes:
- Prevents 'result exceeds maximum length' errors
- Improves API performance and reliability
- Predictable response sizes"

# Push commits and tags
git push origin main
git push origin v2.0.0
```

### Step 2: Update CHANGELOG.md

The CHANGELOG.md already has an `[Unreleased]` section. Move those changes to a new `[2.0.0]` section:

```bash
# Edit CHANGELOG.md to add release date
# Change:
## [Unreleased]

# To:
## [2.0.0] - 2025-10-17

# Commit the CHANGELOG update
git add CHANGELOG.md
git commit -m "chore: update CHANGELOG for v2.0.0 release"
git push origin main
```

### Step 3: Build Release Artifacts

```bash
# Clean build
npm run clean

# Full build (TypeScript + Smithery bundle)
npm run build

# Verify build outputs
ls -la dist/
ls -la .smithery/

# Expected outputs:
# dist/cli.js          - Main CLI entry point
# dist/index.js        - Smithery factory entry
# dist/services/       - Compiled service modules
# dist/handlers/       - Compiled handlers
# dist/utils/          - Compiled utilities
# .smithery/           - Smithery bundle (gitignored)
```

### Step 4: Smithery Deployment

#### Option A: Automatic GitHub Deploy (Recommended)

1. **Trigger GitHub Actions** (if configured):
   ```bash
   git push origin v2.0.0  # Tag push triggers CI/CD
   ```

2. **Or deploy via Smithery Dashboard:**
   - Visit https://smithery.ai/servers/@aybouzaglou/autotask-mcp
   - Click "Deployments" tab
   - Click "Deploy Latest" (picks up v2.0.0 tag)
   - Monitor deployment logs

#### Option B: Manual Smithery Deploy

```bash
# Authenticate
npx @smithery/cli@latest login

# Deploy from local build
npx @smithery/cli@latest deploy \
  --server @aybouzaglou/autotask-mcp \
  --version 2.0.0

# Or trigger remote build
npx @smithery/cli@latest deploy \
  --server @aybouzaglou/autotask-mcp \
  --version 2.0.0 \
  --remote
```

### Step 5: Test Deployed Version

```bash
# Test with Smithery playground
SMITHERY_API_KEY=your-key \
  npx @smithery/cli@latest run @aybouzaglou/autotask-mcp \
    --version 2.0.0 \
    --playground

# In another shell, verify endpoints
curl -X POST "https://your-deployment-url" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":"test","method":"tools/list"}'

# Verify pagination defaults in tool schemas
# Look for pageSize descriptions mentioning "default: 50" or "default: 25"
```

### Step 6: Create GitHub Release

1. **Visit:** https://github.com/aybouzaglou/autotask-mcp/releases/new

2. **Fill in details:**
   - **Tag:** v2.0.0
   - **Title:** Release v2.0.0: Safe Pagination Defaults
   - **Description:** (See template below)

3. **Attach artifacts** (optional):
   - `autotask-mcp-2.0.0.tgz` (from `npm pack`)

#### GitHub Release Description Template

```markdown
## 🎯 Major Release: Safe Pagination Defaults

Version 2.0.0 introduces **breaking changes** to pagination behavior, making the server more reliable and production-ready.

### ⚠️ Breaking Changes

**Pagination Defaults Changed:**
- All search operations now return **limited results by default** (25-50 records)
- Previous: Unlimited results by default
- **Action Required:** Add `pageSize: -1` to search calls that need all records

See the [Migration Guide](./docs/MIGRATION-v2.md) for detailed upgrade instructions.

### ✨ New Features

- **Reusable Pagination Constants:** Standardized `PAGE_SIZE_*` schemas across all tools
- **Response Size Validator:** New utility to prevent MCP protocol violations
- **Comprehensive Documentation:** Migration guide, user documentation, and developer references

### 🐛 Fixes

- Prevents "result exceeds maximum length" errors from large responses
- Improves API performance by reducing unnecessary data fetching
- Predictable response sizes for better reliability

### 📚 Documentation

- [Migration Guide (v1.x → v2.0.0)](./docs/MIGRATION-v2.md)
- [Pagination User Guide](./docs/pagination-guide.md)
- [Technical Details](./docs/pagination-improvements.md)
- [MCP Size Limits Reference](./docs/mcp-size-limits.md)

### 📦 Installation

**NPM:**
```bash
npm install autotask-mcp@2.0.0
```

**Smithery:**
```bash
npx @smithery/cli run @aybouzaglou/autotask-mcp --version 2.0.0
```

### 🔄 Upgrading from v1.x

**Quick Fix:**
```javascript
// Add pageSize: -1 to get all records like v1.x
{
  "name": "search_tickets",
  "arguments": {
    "companyID": 12345,
    "pageSize": -1  // ✅ Explicit unlimited pagination
  }
}
```

**Recommended Approach:**
Use filters to narrow results instead of fetching everything:
```javascript
{
  "name": "search_tickets",
  "arguments": {
    "companyID": 12345,
    "status": 1,              // Filter first
    "assignedResourceID": 42  // Narrow results
    // pageSize defaults to 50 - usually sufficient!
  }
}
```

See [MIGRATION-v2.md](./docs/MIGRATION-v2.md) for more scenarios.

### 🙏 Credits

Thanks to all contributors and users who reported response size issues that led to these improvements!

---

**Full Changelog:** https://github.com/aybouzaglou/autotask-mcp/blob/main/CHANGELOG.md
```

### Step 7: Post-Deployment Verification

```bash
# 1. Verify package version
npm view autotask-mcp version
# Expected: 2.0.0

# 2. Test local installation
npm install -g autotask-mcp@2.0.0
autotask-mcp --version
# Expected: 2.0.0

# 3. Verify Smithery deployment
npx @smithery/cli info @aybouzaglou/autotask-mcp
# Should show version 2.0.0 as latest

# 4. Run integration tests
cd /path/to/autotask-mcp
npm run test:pagination
npm run test:mapping

# 5. Test with Claude Desktop
# Update claude_desktop_config.json to use v2.0.0
# Restart Claude Desktop
# Test search_tickets tool with and without pageSize
```

### Step 8: Monitor Production

**First 24-48 Hours:**

```bash
# Watch Smithery logs
npx @smithery/cli logs @aybouzaglou/autotask-mcp --follow

# Look for:
# ✅ Successful tool calls with default pagination
# ⚠️ Warnings about unlimited pagination usage
# ❌ Any response size errors (shouldn't happen)
```

**Key Metrics to Monitor:**

- **Response sizes:** Should stay under 100KB for default pageSize
- **Unlimited requests:** Count of `pageSize: -1` usage (should be low)
- **Tool call success rate:** Should be ≥99%
- **Response time:** Should improve vs v1.x
- **Error rate:** Should decrease for large result sets

---

## 📋 Rollback Plan

If critical issues arise:

```bash
# 1. Rollback Smithery deployment
npx @smithery/cli rollback @aybouzaglou/autotask-mcp --to-version 1.2.0

# 2. Rollback local installations
npm install -g autotask-mcp@1.2.0

# 3. Notify users via GitHub release notes
# Add notice about temporary rollback and timeline for fix
```

---

## 📢 Communication Plan

### User Notification

**Channels:**
1. GitHub Release announcement
2. README update with migration notice
3. Smithery server description update
4. CHANGELOG.md prominent notice

**Message Template:**

> **🚨 Breaking Change in v2.0.0**
> 
> Pagination defaults have changed to improve reliability. If you need all records, add `pageSize: -1` to your search calls.
> 
> See [Migration Guide](./docs/MIGRATION-v2.md) for details.

### Support Resources

- **Migration Guide:** `docs/MIGRATION-v2.md`
- **Pagination Guide:** `docs/pagination-guide.md`
- **GitHub Issues:** For reporting problems
- **Examples:** Updated in README.md

---

## ✅ Post-Release Checklist

- [ ] Git tag v2.0.0 created and pushed
- [ ] CHANGELOG.md updated with release date
- [ ] GitHub Release created with description
- [ ] Smithery deployment successful
- [ ] Deployment verified via test calls
- [ ] README.md migration notice added
- [ ] Monitoring dashboards checked
- [ ] First 24h metrics reviewed
- [ ] User feedback collected
- [ ] Known issues documented (if any)

---

## 🎉 Success Criteria

Release is considered successful when:

1. ✅ Deployment completes without errors
2. ✅ All search tools return default page sizes correctly
3. ✅ Unlimited pagination (`pageSize: -1`) works as expected
4. ✅ Response size errors eliminated vs v1.x
5. ✅ Response times improve or remain stable
6. ✅ No critical bugs reported in first 48 hours
7. ✅ User migration questions answered promptly

---

## 📞 Support

**Issues during deployment?**

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) (if exists)
2. Review deployment logs: `npx @smithery/cli logs @aybouzaglou/autotask-mcp`
3. Open GitHub issue with deployment details
4. Contact Smithery support if infrastructure issues

---

**Release Manager:** @aybouzaglou  
**Release Date:** 2025-10-17  
**Status:** ✅ READY FOR DEPLOYMENT

---

## Next Steps After v2.0.0

**Future Enhancements (v2.1.0+):**
- [ ] Response size metrics collection
- [ ] Automatic pagination warnings in tool responses
- [ ] Performance benchmarking dashboard
- [ ] Enhanced error messages for oversized responses
- [ ] Pagination presets for common use cases

**See:** `docs/roadmap.md` (create if needed)

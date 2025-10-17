# Testing Strategy

## 🚨 **CRITICAL: Avoid Account Lockouts**

### The Problem
Running tests against the **live Autotask API** causes:
- **4-5 API calls per test run** (auth + metadata cache)
- **10,000 requests/hour limit** per Autotask integration
- **Account lockout** after multiple failed auth attempts (401 errors)
- **Resource endpoint retries** (4 attempts on 405 errors)

### Autotask Rate Limits (from official docs):
- 10,000 requests per hour per database
- Failed authentication triggers account lockout
- Multiple integrations share the same limit

---

## Test Types

### 1. **Unit Tests (Default - Safe)**
```bash
npm test                # Runs all unit tests (excludes MANUAL tests)
npm run test:watch      # Watch mode for development
npm run test:coverage   # Coverage report
```

**What they do:**
- Mock Autotask API calls
- Fast execution (no network calls)
- Safe to run repeatedly
- **No risk of account lockout**

**Location:** `tests/*.test.ts` (excluding MANUAL files)

---

### 2. **Live API Tests (Manual - Dangerous ⚠️)**
```bash
npm run test:live-api   # ONLY run when absolutely necessary
```

**⚠️ WARNING: Use sparingly!**
- Connects to **real Autotask API**
- Makes 4-5 API calls per run
- Can trigger account lockout if run repeatedly
- **Wait 60+ seconds between test runs**

**When to use:**
- Final verification before deployment
- Testing actual API changes
- Debugging production issues
- **NOT for regular development**

**Location:** `tests/integration/*.MANUAL-LIVE-API.test.ts`

---

## Best Practices

### ✅ DO:
- Run `npm test` during development (uses mocks)
- Create unit tests for new features
- Mock external API calls
- Test MCP contract/interface, not business logic
- Use sandbox data for live API tests

### ❌ DON'T:
- Run live API tests in CI/CD pipelines
- Run live API tests repeatedly while debugging
- Test against production Autotask data
- Skip waiting periods between live API test runs

---

## Running Live API Tests Safely

If you **must** run live API tests:

1. **Wait at least 60 seconds** since last test run
2. Verify credentials are correct in `.env`
3. Run once, review results
4. If tests fail with 401, **wait 5-10 minutes** before retrying
5. Monitor Autotask for account lockout warnings

### Example Safe Usage:
```bash
# Initial run
npm run test:live-api

# ... wait 60+ seconds ...

# If needed, run again
npm run test:live-api
```

---

## Troubleshooting

### Account Locked (401 Unauthorized)
**Symptoms:**
- Tests fail with "Authentication failed: Unauthorized"
- 401 errors in logs

**Solution:**
1. **Wait 5-10 minutes** for auto-unlock
2. Verify credentials in `.env` are correct
3. Check Autotask admin panel for lockout notifications
4. Consider creating a separate API user for testing

### Too Many Requests
**Symptoms:**
- Slowdowns in API responses
- "Usage-based delays" errors

**Solution:**
1. **Stop running tests immediately**
2. Wait for hourly limit to reset
3. Review API call patterns
4. Reduce test frequency

---

## MCP Testing Resources

- [How to test MCP servers effectively (Merge.dev)](https://www.merge.dev/blog/mcp-server-testing)
- [Stop Vibe-Testing Your MCP Server (jlowin.dev)](https://www.jlowin.dev/blog/stop-vibe-testing-mcp-servers)
- [Autotask API Rate Limits (Official Docs)](https://www.autotask.net/help/developerhelp/Content/APIs/REST/General_Topics/REST_Thresholds_Limits.htm)

---

## Summary

**Default behavior (safe):**
```bash
npm test  # Runs unit tests with mocks - safe for development
```

**Live API testing (dangerous):**
```bash
npm run test:live-api  # Manual verification only - wait 60s between runs
```

**Remember:** Mock early, mock often. Live API tests are for **final verification only**.

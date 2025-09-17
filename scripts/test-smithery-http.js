#!/usr/bin/env node

// Smithery-hosted HTTP smoke test
// Posts a lightweight MCP request to the Streamable HTTP endpoint and reports latency

import process from 'node:process';
import { performance } from 'node:perf_hooks';

import axios from 'axios';

const url = process.env.SMITHERY_HTTP_URL;

if (!url) {
  console.log('[smithery-smoke] SMITHERY_HTTP_URL not set – skipping hosted smoke test.');
  process.exit(0);
}

const username = process.env.SMITHERY_HTTP_USERNAME;
const password = process.env.SMITHERY_HTTP_PASSWORD;
const token = process.env.SMITHERY_HTTP_TOKEN;
const timeoutMs = Number.parseInt(process.env.SMITHERY_HTTP_TIMEOUT ?? '10000', 10);

async function run() {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = token.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`;
    }

    /** @type {import('axios').AxiosRequestConfig} */
    const axiosConfig = {
      headers,
      timeout: Number.isFinite(timeoutMs) ? timeoutMs : 10000,
      validateStatus: () => true
    };

    if (username && password) {
      // axios basic auth helper
      axiosConfig.auth = { username, password };
    }

    const payload = {
      jsonrpc: '2.0',
      id: 'smithery-smoke',
      method: 'tools.list'
    };

    const started = performance.now();
    const response = await axios.post(url, payload, axiosConfig);
    const latencyMs = performance.now() - started;

    const { status, data } = response;

    if (status !== 200) {
      console.error(`[smithery-smoke] Unexpected status ${status}`, data);
      process.exitCode = 1;
      return;
    }

    const result = data?.result ?? data?.message ?? data;
    console.log('[smithery-smoke] status=200 latencyMs=%d', Math.round(latencyMs));
    console.log('[smithery-smoke] sample result snippet:', JSON.stringify(result).slice(0, 200));
  } catch (error) {
    console.error('[smithery-smoke] Request failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

run();

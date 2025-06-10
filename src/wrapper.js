#!/usr/bin/env node

/**
 * Docker wrapper for Autotask MCP Server
 * Ensures proper stdio handling and graceful shutdown in containerized environments
 */

const { spawn } = require('child_process');
const path = require('path');

// Path to the main MCP server
const serverPath = path.join(__dirname, 'index.js');

// Signal handling for graceful shutdown
let serverProcess = null;
let isShuttingDown = false;

function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.error(`[wrapper] Received ${signal}, shutting down gracefully...`);
  
  if (serverProcess) {
    serverProcess.kill(signal);
    
    // Force kill after 10 seconds
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        console.error('[wrapper] Force killing server process...');
        serverProcess.kill('SIGKILL');
      }
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Handle various shutdown signals
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGQUIT', () => handleShutdown('SIGQUIT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[wrapper] Uncaught exception:', error);
  handleShutdown('SIGTERM');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[wrapper] Unhandled rejection at:', promise, 'reason:', reason);
  handleShutdown('SIGTERM');
});

// Start the MCP server
console.error('[wrapper] Starting Autotask MCP Server...');

serverProcess = spawn('node', [serverPath], {
  stdio: ['inherit', 'inherit', 'inherit'],
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'production'
  }
});

serverProcess.on('close', (code, signal) => {
  console.error(`[wrapper] Server process closed with code ${code}, signal ${signal}`);
  
  if (!isShuttingDown && code !== 0) {
    console.error('[wrapper] Server crashed, exiting...');
    process.exit(code || 1);
  } else {
    process.exit(code || 0);
  }
});

serverProcess.on('error', (error) => {
  console.error('[wrapper] Failed to start server process:', error);
  process.exit(1);
});

console.error('[wrapper] MCP Server started successfully'); 
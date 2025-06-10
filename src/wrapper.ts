#!/usr/bin/env node

/**
 * Wrapper script to ensure clean stdout for MCP JSON-RPC communication
 * Redirects any unwanted stdout from dependencies to stderr
 */

// Override ALL console methods to redirect to stderr
console.log = (...args: any[]) => {
  process.stderr.write('[CONSOLE.LOG->STDERR] ' + args.join(' ') + '\n');
};

console.info = (...args: any[]) => {
  process.stderr.write('[CONSOLE.INFO->STDERR] ' + args.join(' ') + '\n');
};

console.warn = (...args: any[]) => {
  process.stderr.write('[CONSOLE.WARN->STDERR] ' + args.join(' ') + '\n');
};

console.debug = (...args: any[]) => {
  process.stderr.write('[CONSOLE.DEBUG->STDERR] ' + args.join(' ') + '\n');
};

// console.error stays on stderr (this is correct)

// Override process.stdout directly to catch everything
const originalProcessStdoutWrite = process.stdout.write.bind(process.stdout);

// Completely override process.stdout.write to filter everything
process.stdout.write = function(chunk: any, encoding?: any, callback?: any) {
  const chunkStr = chunk.toString();
  
  // Check if this looks like a valid JSON-RPC message
  const isJsonRpcMessage = () => {
    try {
      const trimmed = chunkStr.trim();
      if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
        return false;
      }
      const parsed = JSON.parse(trimmed);
      return parsed.jsonrpc === '2.0' && (parsed.method || parsed.result !== undefined || parsed.error !== undefined);
    } catch {
      return false;
    }
  };
  
  // Only allow valid JSON-RPC messages to stdout
  if (isJsonRpcMessage()) {
    return originalProcessStdoutWrite(chunk, encoding, callback);
  }
  
  // Everything else (including Winston logs) goes to stderr
  process.stderr.write('[STDOUT->STDERR] ' + chunkStr);
  if (typeof callback === 'function') {
    callback();
  }
  return true;
};

// Now load and run the actual application
require('./index.js'); 
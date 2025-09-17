import http from 'node:http';

import { HttpTransport } from '../src/transport/http.js';
import { Logger } from '../src/utils/logger.js';

describe('HttpTransport (experimental)', () => {
  const logger = new Logger('error', 'json');

  test('accepts POST requests and disconnects cleanly', async () => {
    const transport = new HttpTransport({
      host: '127.0.0.1',
      port: 0,
      auth: { enabled: false }
    }, logger);

    await transport.connect({} as any);
    expect(transport.isConnected()).toBe(true);

    const httpServer = (transport as any).httpServer;
    const address = httpServer.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const responseBody = await new Promise<string>((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: '/',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        expect(res.statusCode).toBe(200);
        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString();
        });
        res.on('end', () => resolve(data));
      });

      req.on('error', reject);
      req.write(JSON.stringify({ jsonrpc: '2.0', id: 'test', method: 'ping' }));
      req.end();
    });

    const payload = JSON.parse(responseBody);
    expect(payload.result.message).toContain('MCP HTTP transport is running');

    await transport.disconnect();
    expect(transport.isConnected()).toBe(false);
  });
});

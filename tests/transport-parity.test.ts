import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import { AutotaskMcpServer } from '../src/mcp/server.js';
import { TransportFactory } from '../src/transport/index.js';
import { McpTransport } from '../src/transport/base.js';
import { Logger } from '../src/utils/logger.js';

class MockTransport implements McpTransport {
  private connected = false;
  public readonly connect = jest.fn(async (server: Server) => {
    this.connected = true;
    this.server = server;
  });
  public readonly disconnect = jest.fn(async () => {
    this.connected = false;
  });
  public readonly getType = jest.fn(() => this.type);
  public readonly isConnected = jest.fn(() => this.connected);

  private server: Server | null = null;

  constructor(private readonly type: 'stdio' | 'http') {}

  getServer(): Server | null {
    return this.server;
  }
}

const baseConfig = {
  name: 'autotask-mcp-test',
  version: '1.0.0-test',
  autotask: {
    username: 'user@example.com',
    secret: 'secret',
    integrationCode: 'integration'
  }
} as const;

const httpConfig = {
  type: 'both' as const,
  http: {
    host: '127.0.0.1',
    port: 0,
    auth: { enabled: false }
  }
};

describe('Transport parity across stdio and http', () => {
    const logger = new Logger('error', 'json');

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('server start connects both transports with a shared Server instance', async () => {
      const mockStdio = new MockTransport('stdio');
      const mockHttp = new MockTransport('http');
      const transports: McpTransport[] = [mockStdio, mockHttp];

      const spy = jest.spyOn(TransportFactory.prototype, 'createTransports').mockReturnValue(transports);

      const server = new AutotaskMcpServer(baseConfig, logger, httpConfig);

      await server.start(httpConfig);

      expect(spy).toHaveBeenCalledWith(httpConfig);
      expect(mockStdio.connect).toHaveBeenCalledTimes(1);
      expect(mockHttp.connect).toHaveBeenCalledTimes(1);

      const stdioServer = mockStdio.getServer();
      const httpServer = mockHttp.getServer();
      expect(stdioServer).toBe(httpServer);

      await server.stop();

      expect(mockStdio.disconnect).toHaveBeenCalledTimes(1);
      expect(mockHttp.disconnect).toHaveBeenCalledTimes(1);
    });

    test('stop can be invoked even when transports fail to connect', async () => {
      const failingTransport = new MockTransport('http');
      (failingTransport.connect as jest.Mock).mockRejectedValueOnce(new Error('connect error'));
      const transports: McpTransport[] = [failingTransport];

      jest.spyOn(TransportFactory.prototype, 'createTransports').mockReturnValue(transports);

      const server = new AutotaskMcpServer(baseConfig, logger, httpConfig);

      await expect(server.start(httpConfig)).rejects.toThrow('connect error');

      await expect(server.stop()).resolves.not.toThrow();
    });
});

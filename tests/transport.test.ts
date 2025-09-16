// Transport Abstraction Tests
// Tests the transport factory and stdio transport implementation

import { TransportFactory, StdioTransport, HttpTransport } from '../src/transport';
import { Logger } from '../src/utils/logger';

describe('Transport Abstraction', () => {
  let logger: Logger;
  let factory: TransportFactory;

  beforeEach(() => {
    logger = new Logger('error', 'json'); // Minimal logging for tests
    factory = new TransportFactory(logger);
  });

  describe('TransportFactory', () => {
    test('should create stdio transport for stdio config', () => {
      const transports = factory.createTransports({ type: 'stdio' });

      expect(transports).toHaveLength(1);
      expect(transports[0]).toBeInstanceOf(StdioTransport);
      expect(transports[0].getType()).toBe('stdio');
    });

    test('should create http transport when config provided', () => {
      const transports = factory.createTransports({
        type: 'http',
        http: {
          host: 'localhost',
          port: 3000,
          auth: { enabled: false }
        }
      });

      expect(transports).toHaveLength(1);
      expect(transports[0]).toBeInstanceOf(HttpTransport);
      expect(transports[0].getType()).toBe('http');
    });

    test('should create both transports when config provided', () => {
      const transports = factory.createTransports({
        type: 'both',
        http: {
          host: 'localhost',
          port: 3000,
          auth: { enabled: false }
        }
      });

      expect(transports).toHaveLength(2);
      expect(transports[0]).toBeInstanceOf(StdioTransport);
      expect(transports[1]).toBeInstanceOf(HttpTransport);
    });

    test('should throw error when http config missing', () => {
      expect(() => {
        factory.createTransports({ type: 'http' });
      }).toThrow('HTTP transport configuration is required');
    });

    test('should throw error when both config missing http section', () => {
      expect(() => {
        factory.createTransports({ type: 'both' });
      }).toThrow('HTTP transport configuration is required for both mode');
    });

    test('should throw error for unknown transport type', () => {
      expect(() => {
        factory.createTransports({ type: 'unknown' as any });
      }).toThrow('Unknown transport type: unknown');
    });
  });

  describe('StdioTransport', () => {
    test('should have correct type', () => {
      const transport = new StdioTransport();
      expect(transport.getType()).toBe('stdio');
    });

    test('should start as not connected', () => {
      const transport = new StdioTransport();
      expect(transport.isConnected()).toBe(false);
    });

    test('should mark as connected after connecting', async () => {
      const transport = new StdioTransport();

      // Mock server with minimal interface
      const mockServer = {
        connect: jest.fn().mockResolvedValue(undefined)
      };

      await transport.connect(mockServer as any);
      expect(transport.isConnected()).toBe(true);
      expect(mockServer.connect).toHaveBeenCalled();
    });

    test('should mark as disconnected after disconnecting', async () => {
      const transport = new StdioTransport();

      // Mock server
      const mockServer = {
        connect: jest.fn().mockResolvedValue(undefined)
      };

      await transport.connect(mockServer as any);
      expect(transport.isConnected()).toBe(true);

      await transport.disconnect();
      expect(transport.isConnected()).toBe(false);
    });
  });
});

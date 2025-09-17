import { loadEnvironmentConfig } from '../src/utils/config';

const TRANSPORT_ENV_KEYS = [
  'AUTOTASK_TRANSPORT',
  'AUTOTASK_HTTP_PORT',
  'AUTOTASK_HTTP_HOST',
  'AUTOTASK_HTTP_AUTH',
  'AUTOTASK_HTTP_USERNAME',
  'AUTOTASK_HTTP_PASSWORD'
];

describe('loadEnvironmentConfig', () => {
  const originalEnv = { ...process.env };

  const restoreTransportEnv = () => {
    TRANSPORT_ENV_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(originalEnv, key)) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    });
  };

  beforeEach(() => {
    restoreTransportEnv();
  });

  afterEach(() => {
    restoreTransportEnv();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('defaults to stdio transport with no warnings or errors', () => {
    const config = loadEnvironmentConfig();

    expect(config.transport.type).toBe('stdio');
    expect(config.transport.http).toBeUndefined();
    expect(config.errors).toHaveLength(0);
    expect(config.warnings).toHaveLength(0);
    expect(config.logging.level).toBe('info');
    expect(config.logging.format).toBe('simple');
  });

  it('captures invalid transport selections as configuration errors', () => {
    process.env.AUTOTASK_TRANSPORT = 'websocket';

    const config = loadEnvironmentConfig();

    expect(config.transport.type).toBe('stdio');
    expect(config.errors).toContain(
      'AUTOTASK_TRANSPORT="websocket" is not supported. Valid options: stdio, http, both.'
    );
  });

  it('validates HTTP auth requirements when enabled', () => {
    process.env.AUTOTASK_TRANSPORT = 'http';
    process.env.AUTOTASK_HTTP_AUTH = 'true';

    const config = loadEnvironmentConfig();

    expect(config.transport.type).toBe('http');
    expect(config.errors).toContain('AUTOTASK_HTTP_USERNAME is required when AUTOTASK_HTTP_AUTH is enabled.');
    expect(config.errors).toContain('AUTOTASK_HTTP_PASSWORD is required when AUTOTASK_HTTP_AUTH is enabled.');
  });

  it('flags HTTP settings when transport is stdio', () => {
    process.env.AUTOTASK_HTTP_PORT = '8080';

    const config = loadEnvironmentConfig();

    expect(config.transport.type).toBe('stdio');
    expect(config.transport.http).toBeUndefined();
    expect(config.warnings).toContain(
      'HTTP transport settings detected but AUTOTASK_TRANSPORT is set to "stdio". HTTP configuration will be ignored.'
    );
  });

  it('validates HTTP port when HTTP transport is selected', () => {
    process.env.AUTOTASK_TRANSPORT = 'http';
    process.env.AUTOTASK_HTTP_PORT = 'not-a-number';

    const config = loadEnvironmentConfig();

    expect(config.transport.type).toBe('http');
    expect(config.errors).toContain('AUTOTASK_HTTP_PORT="not-a-number" must be an integer between 1 and 65535.');
  });

  it('defaults HTTP host to 0.0.0.0 when HTTP transport is enabled', () => {
    process.env.AUTOTASK_TRANSPORT = 'http';

    const config = loadEnvironmentConfig();

    expect(config.transport.http?.host).toBe('0.0.0.0');
    expect(config.warnings).toContain(
      'HTTP transport selected without AUTOTASK_HTTP_AUTH enabled. For self-hosted deployments, enable auth or ensure external protections are in place.'
    );
  });
});

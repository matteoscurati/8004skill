import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildX402Status, buildAwalCommands } from '../../scripts/x402-status.js';

let exitSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${code})`);
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildX402Status', () => {
  const baseDetails = {
    agentId: '8453:42',
    name: 'Test Agent',
    active: true,
    x402support: true,
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    mcpEndpoint: 'https://mcp.example.com',
    a2aEndpoint: undefined,
    webEndpoint: undefined,
    reputation: { count: 15, averageValue: 82 },
  };

  it('reports paymentReady: true when all conditions are met', () => {
    const result = buildX402Status(baseDetails);
    const x402 = result.x402 as Record<string, unknown>;
    expect(x402.paymentReady).toBe(true);
    expect(x402.enabled).toBe(true);
    const checks = x402.readinessChecks as Record<string, boolean>;
    expect(checks.x402support).toBe(true);
    expect(checks.hasWallet).toBe(true);
    expect(checks.isActive).toBe(true);
    expect(checks.hasEndpoints).toBe(true);
  });

  it('reports paymentReady: false when x402 is disabled', () => {
    const result = buildX402Status({ ...baseDetails, x402support: false });
    const x402 = result.x402 as Record<string, unknown>;
    expect(x402.paymentReady).toBe(false);
    expect(x402.enabled).toBe(false);
  });

  it('reports paymentReady: false when wallet is missing', () => {
    const result = buildX402Status({ ...baseDetails, walletAddress: undefined });
    const x402 = result.x402 as Record<string, unknown>;
    expect(x402.paymentReady).toBe(false);
    const checks = x402.readinessChecks as Record<string, boolean>;
    expect(checks.hasWallet).toBe(false);
  });

  it('reports paymentReady: false when agent is inactive', () => {
    const result = buildX402Status({ ...baseDetails, active: false });
    const x402 = result.x402 as Record<string, unknown>;
    expect(x402.paymentReady).toBe(false);
    const checks = x402.readinessChecks as Record<string, boolean>;
    expect(checks.isActive).toBe(false);
  });

  it('reports paymentReady: false when no endpoints exist', () => {
    const result = buildX402Status({
      ...baseDetails,
      mcpEndpoint: undefined,
      a2aEndpoint: undefined,
      webEndpoint: undefined,
    });
    const x402 = result.x402 as Record<string, unknown>;
    expect(x402.paymentReady).toBe(false);
    const checks = x402.readinessChecks as Record<string, boolean>;
    expect(checks.hasEndpoints).toBe(false);
  });

  it('defaults x402support to false when undefined (legacy agents)', () => {
    const { x402support: _, ...legacyDetails } = baseDetails;
    const result = buildX402Status(legacyDetails);
    const x402 = result.x402 as Record<string, unknown>;
    expect(x402.enabled).toBe(false);
    expect(x402.paymentReady).toBe(false);
  });

  it('captures all endpoint types', () => {
    const result = buildX402Status({
      ...baseDetails,
      mcpEndpoint: 'https://mcp.example.com',
      a2aEndpoint: 'https://a2a.example.com',
      webEndpoint: 'https://web.example.com',
    });
    const endpoints = result.endpoints as Record<string, string | null>;
    expect(endpoints.mcp).toBe('https://mcp.example.com');
    expect(endpoints.a2a).toBe('https://a2a.example.com');
    expect(endpoints.web).toBe('https://web.example.com');
  });

  it('preserves reputation data', () => {
    const result = buildX402Status(baseDetails);
    expect(result.reputation).toEqual({ count: 15, averageValue: 82 });
  });
});

describe('buildAwalCommands', () => {
  it('targets MCP endpoint when present', () => {
    const commands = buildAwalCommands({ mcpEndpoint: 'https://mcp.example.com' });
    expect(commands.details).toBe('npx awal x402 details https://mcp.example.com');
    expect(commands.pay).toBe('npx awal x402 pay https://mcp.example.com');
    expect(commands.search).toBeDefined();
    expect(commands.monetize).toBeDefined();
  });

  it('targets A2A endpoint when no MCP', () => {
    const commands = buildAwalCommands({ a2aEndpoint: 'https://a2a.example.com' });
    expect(commands.details).toBe('npx awal x402 details https://a2a.example.com');
    expect(commands.pay).toBe('npx awal x402 pay https://a2a.example.com');
  });

  it('targets web endpoint when no MCP or A2A', () => {
    const commands = buildAwalCommands({ webEndpoint: 'https://web.example.com' });
    expect(commands.details).toBe('npx awal x402 details https://web.example.com');
    expect(commands.pay).toBe('npx awal x402 pay https://web.example.com');
  });

  it('omits details/pay when no endpoints exist', () => {
    const commands = buildAwalCommands({});
    expect(commands.details).toBeUndefined();
    expect(commands.pay).toBeUndefined();
    expect(commands.search).toBeDefined();
    expect(commands.monetize).toBeDefined();
  });

  it('prefers MCP over A2A and web when multiple endpoints present', () => {
    const commands = buildAwalCommands({
      mcpEndpoint: 'https://mcp.example.com',
      a2aEndpoint: 'https://a2a.example.com',
      webEndpoint: 'https://web.example.com',
    });
    expect(commands.details).toContain('mcp.example.com');
    expect(commands.pay).toContain('mcp.example.com');
  });

  it('treats empty string endpoint as absent', () => {
    const commands = buildAwalCommands({
      mcpEndpoint: '',
      a2aEndpoint: '',
      webEndpoint: '',
    });
    expect(commands.details).toBeUndefined();
    expect(commands.pay).toBeUndefined();
  });
});

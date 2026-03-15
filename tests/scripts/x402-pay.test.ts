import { describe, it, expect, vi } from 'vitest';
import { buildRequestConfig, formatPaymentDetails } from '../../scripts/x402-pay.js';
import { setupCliSpies } from '../helpers/cli-spies.js';

setupCliSpies();

describe('buildRequestConfig', () => {
  it('parses minimal args with defaults', () => {
    const config = buildRequestConfig({ 'url': 'https://api.example.com/data' });
    expect(config.url).toBe('https://api.example.com/data');
    expect(config.method).toBe('GET');
    expect(config.body).toBeUndefined();
    expect(config.autoPay).toBe(false);
    expect(config.maxAmount).toBeUndefined();
  });

  it('parses POST method with body', () => {
    const config = buildRequestConfig({
      'url': 'https://api.example.com/data',
      'method': 'POST',
      'body': '{"query":"test"}',
    });
    expect(config.method).toBe('POST');
    expect(config.body).toBe('{"query":"test"}');
  });

  it('normalizes method to uppercase', () => {
    const config = buildRequestConfig({
      'url': 'https://api.example.com/data',
      'method': 'post',
    });
    expect(config.method).toBe('POST');
  });

  it('parses auto-pay flag', () => {
    const config = buildRequestConfig({
      'url': 'https://api.example.com/data',
      'auto-pay': 'true',
    });
    expect(config.autoPay).toBe(true);
  });

  it('parses max-amount', () => {
    const config = buildRequestConfig({
      'url': 'https://api.example.com/data',
      'max-amount': '5.50',
    });
    expect(config.maxAmount).toBe(5.5);
  });

  it('exits when url is missing', () => {
    expect(() => buildRequestConfig({})).toThrow('process.exit(1)');
  });

  it('exits on invalid method', () => {
    expect(() => buildRequestConfig({
      'url': 'https://api.example.com/data',
      'method': 'INVALID',
    })).toThrow('process.exit(1)');
  });

  it('exits on negative max-amount', () => {
    expect(() => buildRequestConfig({
      'url': 'https://api.example.com/data',
      'max-amount': '-1',
    })).toThrow('process.exit(1)');
  });

  it('exits on non-numeric max-amount', () => {
    expect(() => buildRequestConfig({
      'url': 'https://api.example.com/data',
      'max-amount': 'abc',
    })).toThrow('process.exit(1)');
  });

  it('accepts all valid HTTP methods', () => {
    for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) {
      const config = buildRequestConfig({ 'url': 'https://api.example.com', 'method': method });
      expect(config.method).toBe(method);
    }
  });
});

describe('formatPaymentDetails', () => {
  const mockPayment = {
    accepts: [
      {
        price: '10000',
        token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        network: 'eip155:8453',
        destination: '0x1234567890abcdef1234567890abcdef12345678',
        scheme: 'exact',
        description: 'API access fee',
      },
    ],
    x402Version: 2,
    price: '10000',
    token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    network: 'eip155:8453',
    pay: vi.fn(),
  };

  it('formats payment with all details', () => {
    const result = formatPaymentDetails(mockPayment);
    expect(result.paymentRequired).toBe(true);
    expect(result.price).toBe('10000');
    expect(result.token).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    expect(result.network).toBe('eip155:8453');
    expect(result.x402Version).toBe(2);
    expect(result.acceptCount).toBe(1);
  });

  it('formats accepts array with indexed entries', () => {
    const result = formatPaymentDetails(mockPayment);
    const accepts = result.accepts as Array<Record<string, unknown>>;
    expect(accepts).toHaveLength(1);
    expect(accepts[0].index).toBe(0);
    expect(accepts[0].price).toBe('10000');
    expect(accepts[0].token).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    expect(accepts[0].network).toBe('eip155:8453');
    expect(accepts[0].destination).toBe('0x1234567890abcdef1234567890abcdef12345678');
  });

  it('handles multiple accepts', () => {
    const multiPayment = {
      ...mockPayment,
      accepts: [
        { price: '10000', token: '0xUSDC', network: 'eip155:8453' },
        { price: '20000', token: '0xDAI', network: 'eip155:1' },
      ],
    };
    const result = formatPaymentDetails(multiPayment);
    expect(result.acceptCount).toBe(2);
    const accepts = result.accepts as Array<Record<string, unknown>>;
    expect(accepts[0].index).toBe(0);
    expect(accepts[1].index).toBe(1);
  });

  it('defaults network to "same as SDK chain" when missing', () => {
    const noNetworkPayment = {
      ...mockPayment,
      accepts: [{ price: '5000', token: '0xUSDC' }],
    };
    const result = formatPaymentDetails(noNetworkPayment);
    const accepts = result.accepts as Array<Record<string, unknown>>;
    expect(accepts[0].network).toBe('same as SDK chain');
  });

  it('handles empty accepts array', () => {
    const emptyPayment = {
      ...mockPayment,
      accepts: [],
    };
    const result = formatPaymentDetails(emptyPayment);
    expect(result.acceptCount).toBe(0);
  });

  it('includes resource info when present', () => {
    const withResource = {
      ...mockPayment,
      resource: { url: 'https://api.example.com/resource', description: 'Premium data' },
    };
    const result = formatPaymentDetails(withResource);
    expect(result.resource).toEqual({ url: 'https://api.example.com/resource', description: 'Premium data' });
  });

  it('includes error message when present', () => {
    const withError = {
      ...mockPayment,
      error: 'Payment required for this resource',
    };
    const result = formatPaymentDetails(withError);
    expect(result.error).toBe('Payment required for this resource');
  });
});

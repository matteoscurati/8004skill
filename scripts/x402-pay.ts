#!/usr/bin/env npx tsx
/**
 * Execute HTTP requests with x402 payment handling.
 *
 * Usage:
 *   npx tsx x402-pay.ts --url <endpoint> --chain-id <id> --rpc-url <url> \
 *     [--method GET|POST] [--body <json>] [--auto-pay] [--max-amount <usd>]
 */

import { isX402Required } from 'agent0-sdk';
import type { X402RequestResult, X402Payment } from 'agent0-sdk';
import {
  parseArgs,
  requireArg,
  requireChainId,
  createSdk,
  handleError,
  isMainScript,
  outputJson,
  exitWithError,
  loadWalletProvider,
  getSigningMode,
} from './lib/shared.js';

// x402 prices are in atomic token units. USDC has 6 decimals; --max-amount is in USD.
const USDC_DECIMALS = 6;

/**
 * Build the request configuration from CLI args.
 */
export function buildRequestConfig(args: Record<string, string>): {
  url: string;
  method: string;
  body?: string;
  autoPay: boolean;
  maxAmount?: number;
} {
  const url = requireArg(args, 'url', 'endpoint URL');
  const method = (args['method'] ?? 'GET').toUpperCase();
  if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    exitWithError(`Invalid --method "${method}". Must be GET, POST, PUT, DELETE, or PATCH.`);
  }
  const body = args['body'];
  const autoPay = args['auto-pay'] === 'true';
  const maxAmount = args['max-amount'] ? parseFloat(args['max-amount']) : undefined;
  if (maxAmount !== undefined && (Number.isNaN(maxAmount) || maxAmount < 0)) {
    exitWithError(`Invalid --max-amount "${args['max-amount']}". Must be a non-negative number.`);
  }
  return { url, method, body, autoPay, maxAmount };
}

/**
 * Format payment details from an x402Payment object for display.
 */
export function formatPaymentDetails(x402Payment: X402Payment): Record<string, unknown> {
  const accepts = x402Payment.accepts.map((accept, i) => ({
    index: i,
    price: accept.price,
    token: accept.token,
    network: accept.network ?? 'same as SDK chain',
    destination: accept.destination ?? 'unknown',
    scheme: accept.scheme,
    description: accept.description,
  }));

  return {
    paymentRequired: true,
    price: x402Payment.price,
    token: x402Payment.token,
    network: x402Payment.network,
    x402Version: x402Payment.x402Version,
    error: x402Payment.error,
    resource: x402Payment.resource,
    accepts,
    acceptCount: accepts.length,
  };
}

function buildRequestOptions(config: ReturnType<typeof buildRequestConfig>) {
  return {
    url: config.url,
    method: config.method,
    ...(config.body && { body: config.body }),
    ...(['POST', 'PUT', 'PATCH'].includes(config.method) && config.body && {
      headers: { 'Content-Type': 'application/json' },
    }),
  };
}

async function main() {
  const args = parseArgs();
  const config = buildRequestConfig(args);
  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');

  // Create SDK — PRIVATE_KEY is picked up from env automatically.
  // WalletConnect is loaded lazily only if 402 + auto-pay and no PRIVATE_KEY.
  const sdk = createSdk({ chainId, rpcUrl });

  console.error(JSON.stringify({ status: 'requesting', url: config.url, method: config.method }));
  const result: X402RequestResult<object> = await sdk.request(buildRequestOptions(config));

  if (isX402Required(result)) {
    const paymentDetails = formatPaymentDetails(result.x402Payment);
    console.error(JSON.stringify({ status: 'payment_required', ...paymentDetails }));

    if (config.autoPay) {
      // Safety cap: --max-amount is in USD, price is in atomic units (assumes USDC 6 decimals)
      if (config.maxAmount !== undefined && result.x402Payment.price) {
        const priceNum = parseFloat(result.x402Payment.price);
        const capInAtomicUnits = config.maxAmount * (10 ** USDC_DECIMALS);
        if (priceNum > capInAtomicUnits) {
          exitWithError(
            `Payment amount (${result.x402Payment.price} atomic units) exceeds --max-amount cap (${config.maxAmount} USD / ${capInAtomicUnits} atomic units). Aborting.`,
          );
        }
      }

      // PRIVATE_KEY mode: SDK already has signing capability, pay directly.
      // WalletConnect mode: load WC now, create signing SDK, re-request (SDK handles 402+pay).
      if (getSigningMode() === 'privatekey') {
        console.error(JSON.stringify({ status: 'paying', message: 'Auto-paying with PRIVATE_KEY...' }));
        const payResult = await result.x402Payment.pay();
        outputJson({ status: 'paid', response: payResult });
      } else {
        console.error(JSON.stringify({ status: 'paying', message: 'Loading WalletConnect for payment signing...' }));
        const walletProvider = await loadWalletProvider(chainId);
        const signingSdk = createSdk({ chainId, rpcUrl, walletProvider });
        const paidResult = await signingSdk.request(buildRequestOptions(config));
        if (isX402Required(paidResult)) {
          // WC SDK still got 402 — the pay() method now has signing capability
          const payResult = await paidResult.x402Payment.pay();
          outputJson({ status: 'paid', response: payResult });
        } else {
          outputJson({ status: 'paid', response: paidResult });
        }
      }
    } else {
      outputJson({
        status: 'payment_required',
        ...paymentDetails,
        hint: 'Re-run with --auto-pay to pay automatically, or use the SDK to call x402Payment.pay() programmatically.',
      });
    }
  } else {
    outputJson({ status: 'success', response: result });
  }
}

if (isMainScript(import.meta.url)) {
  main().catch(handleError);
}

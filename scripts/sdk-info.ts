#!/usr/bin/env npx tsx
/**
 * Read SDK diagnostics for the configured chain.
 *
 * Usage:
 *   npx tsx sdk-info.ts --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 */

import {
  parseArgs,
  requireArg,
  requireChainId,
  createSdk,
  handleError,
  outputJson,
  parseChainId,
} from './lib/shared.js';

function safeRead<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs();
  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');
  const subgraphProbeChainId = args['subgraph-chain-id'] ? parseChainId(args['subgraph-chain-id']) : chainId;

  const sdk = createSdk({ chainId, rpcUrl });
  const sdkAny = sdk as unknown as {
    requestValidation?: unknown;
    respondToValidation?: unknown;
    getValidationStatus?: unknown;
    getValidationSummary?: unknown;
    getAgentValidations?: unknown;
    getValidatorRequests?: unknown;
  };

  outputJson({
    chainId: await sdk.chainId(),
    registries: sdk.registries(),
    identityRegistryAddress: safeRead(() => sdk.identityRegistryAddress()),
    reputationRegistryAddress: safeRead(() => sdk.reputationRegistryAddress()),
    validationRegistryAddress: safeRead(() => sdk.validationRegistryAddress()),
    isReadOnly: sdk.isReadOnly,
    hasChainClient: Boolean(sdk.chainClient),
    hasIpfsClient: Boolean(sdk.ipfsClient),
    hasSubgraphClient: Boolean(sdk.subgraphClient),
    subgraphProbeChainId,
    hasProbedSubgraphClient: Boolean(sdk.getSubgraphClient(subgraphProbeChainId)),
    hasValidationSdkMethods:
      typeof sdkAny.requestValidation === 'function' &&
      typeof sdkAny.respondToValidation === 'function' &&
      typeof sdkAny.getValidationStatus === 'function' &&
      typeof sdkAny.getValidationSummary === 'function' &&
      typeof sdkAny.getAgentValidations === 'function' &&
      typeof sdkAny.getValidatorRequests === 'function',
  });
}

main().catch(handleError);

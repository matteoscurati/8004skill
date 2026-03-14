import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const coverage = readFileSync(resolve(process.cwd(), 'references/sdk-api.md'), 'utf8');

const SDK_METHODS = [
  'SDK.chainId()',
  'SDK.registries()',
  'SDK.identityRegistryAddress()',
  'SDK.reputationRegistryAddress()',
  'SDK.validationRegistryAddress()',
  'SDK.getSubgraphClient()',
  'SDK.createAgent()',
  'SDK.loadAgent()',
  'SDK.getAgent()',
  'SDK.searchAgents()',
  'SDK.transferAgent()',
  'SDK.isAgentOwner()',
  'SDK.getAgentOwner()',
  'SDK.prepareFeedbackFile()',
  'SDK.giveFeedback()',
  'SDK.getFeedback()',
  'SDK.searchFeedback()',
  'SDK.appendResponse()',
  'SDK.revokeFeedback()',
  'SDK.getReputationSummary()',
  'SDK.chainClient',
  'SDK.ipfsClient',
  'SDK.subgraphClient',
  'SDK.isReadOnly',
];

const AGENT_METHODS = [
  'Agent.setMCP()',
  'Agent.setA2A()',
  'Agent.setENS()',
  'Agent.removeEndpoint()',
  'Agent.removeEndpoints()',
  'Agent.addSkill()',
  'Agent.removeSkill()',
  'Agent.addDomain()',
  'Agent.removeDomain()',
  'Agent.setWallet()',
  'Agent.unsetWallet()',
  'Agent.getWallet()',
  'Agent.setActive()',
  'Agent.setX402Support()',
  'Agent.setTrust()',
  'Agent.setMetadata()',
  'Agent.getMetadata()',
  'Agent.delMetadata()',
  'Agent.getRegistrationFile()',
  'Agent.updateInfo()',
  'Agent.registerOnChain()',
  'Agent.registerIPFS()',
  'Agent.registerHTTP()',
  'Agent.setAgentURI()',
  'Agent.transfer()',
];

describe('sdk coverage manifest', () => {
  it('tracks every public SDK method used by the skill', () => {
    for (const method of SDK_METHODS) {
      expect(coverage).toContain(`\`${method}\``);
    }
  });

  it('tracks every public Agent method used by the skill', () => {
    for (const method of AGENT_METHODS) {
      expect(coverage).toContain(`\`${method}\``);
    }
  });

  it('documents validation as reference-only until SDK wrappers ship', () => {
    expect(coverage).toContain('Validation registry request/response flows remain reference-only');
  });
});

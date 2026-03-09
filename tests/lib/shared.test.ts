import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  splitCsv,
  validateConfig,
  buildAgentDetails,
  parseArgs,
  requireArg,
  parseChainId,
  parseDecimalInRange,
  validateAgentId,
  validateAddress,
  validateSignature,
  validateIpfsProvider,
  buildSdkConfig,
  extractIpfsConfig,
  getOverridesFromEnv,
  validateIpfsEnv,
  tryCatch,
  exitWithError,
  outputJson,
  isMainScript,
  sanitizeString,
  createSdk,
  parseEndpointType,
} from '../../scripts/lib/shared.js';

let exitSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;
let stdoutSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${code})`);
  });
  stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  stdoutSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('splitCsv', () => {
  it('splits comma-separated values and trims whitespace', () => {
    expect(splitCsv('a, b, c')).toEqual(['a', 'b', 'c']);
  });

  it('returns single-element array for value without commas', () => {
    expect(splitCsv('solo')).toEqual(['solo']);
  });

  it('filters out empty values', () => {
    expect(splitCsv(',,')).toEqual([]);
  });

  it('trims whitespace from all values', () => {
    expect(splitCsv(' spazi , ovunque ')).toEqual(['spazi', 'ovunque']);
  });
});

describe('validateConfig', () => {
  it('warns on HTTP RPC URL', () => {
    const warnings = validateConfig({ rpcUrl: 'http://localhost:8545' });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].field).toBe('rpcUrl');
    expect(warnings[0].message).toContain('unencrypted HTTP');
  });

  it('returns no warnings for known HTTPS URL on known chain', () => {
    const warnings = validateConfig({ activeChain: 11155111, rpcUrl: 'https://rpc.sepolia.org' });
    expect(warnings).toEqual([]);
  });

  it('warns on unknown HTTPS URL for known chain', () => {
    const warnings = validateConfig({ activeChain: 11155111, rpcUrl: 'https://custom-rpc.example.com' });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].field).toBe('rpcUrl');
    expect(warnings[0].message).toContain('does not match known public endpoints');
  });

  it('returns no warnings when rpcUrl is absent', () => {
    expect(validateConfig({})).toEqual([]);
  });

  it.each([
    ['Ethereum Mainnet', 1, 'https://eth.llamarpc.com'],
    ['Ethereum Sepolia', 11155111, 'https://rpc.sepolia.org'],
    ['Polygon Mainnet', 137, 'https://polygon-rpc.com'],
  ] as const)('returns no warnings for known %s RPC URL', (_label, chainId, rpcUrl) => {
    expect(validateConfig({ activeChain: chainId, rpcUrl })).toEqual([]);
  });

  it('warns on unknown RPC URL for supported chains', () => {
    const warnings = validateConfig({ activeChain: 137, rpcUrl: 'https://custom-polygon.example.com' });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('does not match known public endpoints');
  });
});

describe('buildAgentDetails', () => {
  it('builds correct object with all fields', () => {
    const agent = {
      agentId: '11155111:42',
      name: 'TestAgent',
      description: 'A test agent',
      image: 'https://example.com/img.png',
      mcpEndpoint: 'https://mcp.example.com',
      a2aEndpoint: 'https://a2a.example.com',
      ensEndpoint: 'test.eth',
      mcpTools: [{ name: 'tool1' }],
      mcpPrompts: [{ name: 'prompt1' }],
      mcpResources: [{ name: 'resource1' }],
      a2aSkills: [{ name: 'skill1' }],
    };
    const regFile = { active: true, trustModels: ['model1'], owners: ['0xabc'], endpoints: { rpc: 'x' } };
    const result = buildAgentDetails(agent, regFile);

    expect(result.agentId).toBe('11155111:42');
    expect(result.name).toBe('TestAgent');
    expect(result.active).toBe(true);
    expect(result.mcpTools).toEqual([{ name: 'tool1' }]);
    expect(result.trustModels).toEqual(['model1']);
  });

  it('defaults array fields to empty arrays when undefined', () => {
    const result = buildAgentDetails({ name: 'A', description: 'B' }, { active: false });
    expect(result.mcpTools).toEqual([]);
    expect(result.mcpPrompts).toEqual([]);
    expect(result.mcpResources).toEqual([]);
    expect(result.a2aSkills).toEqual([]);
    expect(result.oasfSkills).toEqual([]);
    expect(result.oasfDomains).toEqual([]);
  });

  it('includes oasfSkills and oasfDomains when provided', () => {
    const agent = {
      name: 'OasfAgent',
      description: 'Agent with OASF',
      oasfSkills: [{ slug: 'nlp/summarization' }],
      oasfDomains: [{ slug: 'finance/trading' }],
    };
    const result = buildAgentDetails(agent, { active: true });
    expect(result.oasfSkills).toEqual([{ slug: 'nlp/summarization' }]);
    expect(result.oasfDomains).toEqual([{ slug: 'finance/trading' }]);
  });

  it('extracts oasfSkills/oasfDomains from regFile.endpoints when agent lacks them', () => {
    const agent = { name: 'SDKAgent', description: 'Loaded via sdk.loadAgent()' };
    const regFile = {
      active: true,
      endpoints: [
        { type: 'MCP', value: 'https://mcp.example.com' },
        { type: 'OASF', value: 'https://github.com/agntcy/oasf/', meta: { skills: ['nlp/summarization'], domains: ['finance/trading'] } },
      ],
    };
    const result = buildAgentDetails(agent, regFile);
    expect(result.oasfSkills).toEqual(['nlp/summarization']);
    expect(result.oasfDomains).toEqual(['finance/trading']);
  });

  it('merges extras into output', () => {
    const result = buildAgentDetails({ name: 'A', description: 'B' }, { active: true }, { customField: 'hello' });
    expect(result.customField).toBe('hello');
  });

  it('sanitizes control characters from name and description', () => {
    const result = buildAgentDetails(
      { name: 'Good\x00Agent\x07', description: 'Hello\x01World' },
      { active: true },
    );
    expect(result.name).toBe('GoodAgent');
    expect(result.description).toBe('HelloWorld');
  });

  it('preserves newlines and tabs in description', () => {
    const result = buildAgentDetails(
      { name: 'A', description: 'Line1\nLine2\tTabbed' },
      { active: true },
    );
    expect(result.description).toBe('Line1\nLine2\tTabbed');
  });

  it('truncates long name and sets _truncated flag', () => {
    const longName = 'x'.repeat(600);
    const result = buildAgentDetails({ name: longName, description: 'B' }, { active: true });
    expect((result.name as string).length).toBe(500);
    expect(result._truncated).toBe(true);
  });

  it('truncates long description and sets _truncated flag', () => {
    const longDesc = 'y'.repeat(3000);
    const result = buildAgentDetails({ name: 'A', description: longDesc }, { active: true });
    expect((result.description as string).length).toBe(2000);
    expect(result._truncated).toBe(true);
  });

  it('does not set _truncated when fields are within limits', () => {
    const result = buildAgentDetails({ name: 'A', description: 'B' }, { active: true });
    expect(result._truncated).toBeUndefined();
  });
});

describe('sanitizeString', () => {
  it('strips control characters but keeps \\n and \\t', () => {
    const { value } = sanitizeString('hello\x00\x01world\n\ttab', 100);
    expect(value).toBe('helloworld\n\ttab');
  });

  it('truncates at maxLength', () => {
    const { value, truncated } = sanitizeString('abcdef', 3);
    expect(value).toBe('abc');
    expect(truncated).toBe(true);
  });

  it('does not truncate at exact length', () => {
    const { value, truncated } = sanitizeString('abc', 3);
    expect(value).toBe('abc');
    expect(truncated).toBe(false);
  });

  it('returns empty string for empty input', () => {
    const { value, truncated } = sanitizeString('', 100);
    expect(value).toBe('');
    expect(truncated).toBe(false);
  });
});

describe('parseArgs', () => {
  const savedArgv = process.argv;
  afterEach(() => { process.argv = savedArgv; });

  it('parses key-value flags', () => {
    process.argv = ['node', 'script.ts', '--name', 'test', '--chain-id', '1'];
    expect(parseArgs()).toEqual({ name: 'test', 'chain-id': '1' });
  });

  it('parses boolean flags', () => {
    process.argv = ['node', 'script.ts', '--verbose'];
    expect(parseArgs()).toEqual({ verbose: 'true' });
  });

  it('returns empty object for no arguments', () => {
    process.argv = ['node', 'script.ts'];
    expect(parseArgs()).toEqual({});
  });

  it('treats consecutive -- flags as booleans', () => {
    process.argv = ['node', 'script.ts', '--name', '--other'];
    expect(parseArgs()).toEqual({ name: 'true', other: 'true' });
  });
});

describe('requireArg', () => {
  it('returns value when key is present', () => {
    expect(requireArg({ key: 'val' }, 'key', 'label')).toBe('val');
  });

  it('calls exitWithError when key is missing', () => {
    expect(() => requireArg({}, 'key', 'the label')).toThrow('process.exit(1)');
    const output = JSON.parse(stderrSpy.mock.calls[0][0]);
    expect(output.error).toContain('--key is required');
  });
});

describe('parseChainId', () => {
  it('parses valid chain id', () => {
    expect(parseChainId('11155111')).toBe(11155111);
  });

  it('exits on non-numeric input', () => {
    expect(() => parseChainId('abc')).toThrow('process.exit(1)');
  });

  it('exits on undefined', () => {
    expect(() => parseChainId(undefined)).toThrow('process.exit(1)');
  });
});

describe('parseDecimalInRange', () => {
  it('parses value within range', () => {
    expect(parseDecimalInRange('85', 'score', -100, 100)).toBe(85);
  });

  it('exits when value exceeds range', () => {
    expect(() => parseDecimalInRange('101', 'score', -100, 100)).toThrow('process.exit(1)');
  });

  it('exits on non-numeric input', () => {
    expect(() => parseDecimalInRange('abc', 'score', -100, 100)).toThrow('process.exit(1)');
  });
});

describe('validateAgentId', () => {
  it('accepts valid agent id', () => {
    expect(() => validateAgentId('11155111:42')).not.toThrow();
  });

  it('exits on missing colon format', () => {
    expect(() => validateAgentId('invalid')).toThrow('process.exit(1)');
  });

  it('exits on trailing colon', () => {
    expect(() => validateAgentId('11155111:')).toThrow('process.exit(1)');
  });
});

describe('validateAddress', () => {
  it('accepts valid checksummed address', () => {
    expect(() => validateAddress('0x5B38Da6a701c568545dCfcB03FcB875f56beddC4', 'addr')).not.toThrow();
  });

  it('exits on malformed address', () => {
    expect(() => validateAddress('0xINVALID', 'addr')).toThrow('process.exit(1)');
  });

  it('warns on bad checksum but does not exit', () => {
    validateAddress('0x5b38Da6a701c568545dCfcB03FcB875f56beddC4', 'addr');
    expect(exitSpy).not.toHaveBeenCalled();
    const warningCall = stderrSpy.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('warning'),
    );
    expect(warningCall).toBeDefined();
  });
});

describe('validateSignature', () => {
  it('accepts valid signature', () => {
    const sig = '0x' + 'ab'.repeat(65);
    expect(() => validateSignature(sig)).not.toThrow();
  });

  it('exits on short signature', () => {
    expect(() => validateSignature('0xabcd')).toThrow('process.exit(1)');
  });
});

describe('validateIpfsProvider', () => {
  it('returns valid provider', () => {
    expect(validateIpfsProvider('pinata')).toBe('pinata');
  });

  it('accepts helia as a built-in provider', () => {
    expect(validateIpfsProvider('helia')).toBe('helia');
  });

  it('exits on invalid provider', () => {
    expect(() => validateIpfsProvider('invalid')).toThrow('process.exit(1)');
  });
});

describe('parseEndpointType', () => {
  it('maps supported endpoint aliases', () => {
    expect(parseEndpointType('mcp')).toBe('MCP');
    expect(parseEndpointType('A2A')).toBe('A2A');
    expect(parseEndpointType('agentwallet')).toBe('wallet');
  });

  it('exits on unsupported endpoint types', () => {
    expect(() => parseEndpointType('smtp')).toThrow('process.exit(1)');
  });
});

describe('buildSdkConfig', () => {
  it('builds base config with chainId and rpcUrl', () => {
    const config = buildSdkConfig({ chainId: 1, rpcUrl: 'https://eth.llamarpc.com' });
    expect(config.chainId).toBe(1);
    expect(config.rpcUrl).toBe('https://eth.llamarpc.com');
  });

  it('includes pinata config when ipfs provider is pinata', () => {
    const config = buildSdkConfig({
      chainId: 1,
      rpcUrl: 'https://eth.llamarpc.com',
      ipfsProvider: 'pinata',
      pinataJwt: 'test-jwt',
    });
    expect(config.ipfs).toBe('pinata');
    expect(config.pinataJwt).toBe('test-jwt');
  });

  it('accepts helia without extra credentials', () => {
    const config = buildSdkConfig({
      chainId: 1,
      rpcUrl: 'https://eth.llamarpc.com',
      ipfsProvider: 'helia',
    });
    expect(config.ipfs).toBe('helia');
  });

  it('exits when pinata is selected without JWT', () => {
    expect(() =>
      buildSdkConfig({ chainId: 1, rpcUrl: 'https://eth.llamarpc.com', ipfsProvider: 'pinata' }),
    ).toThrow('process.exit(1)');
  });
});

describe('extractIpfsConfig', () => {
  it('reads args and env vars', () => {
    vi.stubEnv('PINATA_JWT', 'test-jwt');
    vi.stubEnv('FILECOIN_PRIVATE_KEY', 'test-key');
    const config = extractIpfsConfig({ ipfs: 'pinata', 'ipfs-node-url': 'http://localhost:5001' });
    expect(config.ipfsProvider).toBe('pinata');
    expect(config.pinataJwt).toBe('test-jwt');
    expect(config.filecoinPrivateKey).toBe('test-key');
    expect(config.ipfsNodeUrl).toBe('http://localhost:5001');
  });

  it('returns undefined fields when env vars are not set', () => {
    vi.stubEnv('PINATA_JWT', '');
    vi.stubEnv('FILECOIN_PRIVATE_KEY', '');
    vi.stubEnv('IPFS_NODE_URL', '');
    const config = extractIpfsConfig({});
    expect(config.ipfsProvider).toBeUndefined();
    expect(config.pinataJwt).toBe('');
  });
});

describe('getOverridesFromEnv', () => {
  it('returns overrides when env vars are set', () => {
    vi.stubEnv('SUBGRAPH_URL', 'https://subgraph.example.com');
    vi.stubEnv('REGISTRY_ADDRESS_IDENTITY', '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4');
    const result = getOverridesFromEnv(11155111);
    expect(result.subgraphUrl).toBe('https://subgraph.example.com');
    expect(result.registryOverrides).toBeDefined();
    expect(result.registryOverrides![11155111]).toHaveProperty('IDENTITY');
  });

  it('returns empty object when no env vars set', () => {
    vi.stubEnv('SUBGRAPH_URL', '');
    vi.stubEnv('REGISTRY_ADDRESS_IDENTITY', '');
    vi.stubEnv('REGISTRY_ADDRESS_REPUTATION', '');
    const result = getOverridesFromEnv(1);
    expect(result.subgraphUrl).toBeUndefined();
    expect(result.registryOverrides).toBeUndefined();
  });

  it('returns no overrides for Polygon when no env vars set (SDK handles it natively)', () => {
    vi.stubEnv('REGISTRY_ADDRESS_IDENTITY', '');
    vi.stubEnv('REGISTRY_ADDRESS_REPUTATION', '');
    const result = getOverridesFromEnv(137);
    expect(result.registryOverrides).toBeUndefined();
  });

  it('prefers env vars over built-in Polygon registry defaults', () => {
    vi.stubEnv('REGISTRY_ADDRESS_IDENTITY', '0x1111111111111111111111111111111111111111');
    vi.stubEnv('REGISTRY_ADDRESS_REPUTATION', '');
    const result = getOverridesFromEnv(137);
    expect(result.registryOverrides).toEqual({
      137: { IDENTITY: '0x1111111111111111111111111111111111111111' },
    });
  });
});

describe('validateIpfsEnv', () => {
  it('does nothing when no provider is set', () => {
    expect(() => validateIpfsEnv({})).not.toThrow();
  });

  it('passes when pinata provider has JWT', () => {
    expect(() => validateIpfsEnv({ ipfsProvider: 'pinata', pinataJwt: 'jwt' })).not.toThrow();
  });

  it('passes when helia is selected', () => {
    expect(() => validateIpfsEnv({ ipfsProvider: 'helia' })).not.toThrow();
  });

  it('exits when pinata provider is missing JWT', () => {
    expect(() => validateIpfsEnv({ ipfsProvider: 'pinata' })).toThrow('process.exit(1)');
  });
});

describe('tryCatch', () => {
  it('returns value on success', async () => {
    const result = await tryCatch(async () => 42);
    expect(result).toEqual({ value: 42 });
  });

  it('returns error message on failure', async () => {
    const result = await tryCatch(async () => { throw new Error('boom'); });
    expect(result).toEqual({ error: 'boom' });
  });
});

describe('exitWithError', () => {
  it('writes JSON error to stderr and exits', () => {
    expect(() => exitWithError('something failed')).toThrow('process.exit(1)');
    const output = JSON.parse(stderrSpy.mock.calls[0][0]);
    expect(output).toEqual({ error: 'something failed' });
  });

  it('includes details when provided', () => {
    expect(() => exitWithError('fail', 'extra info')).toThrow('process.exit(1)');
    const output = JSON.parse(stderrSpy.mock.calls[0][0]);
    expect(output).toEqual({ error: 'fail', details: 'extra info' });
  });
});

describe('outputJson', () => {
  it('writes formatted JSON to stdout', () => {
    outputJson({ key: 'value' });
    expect(stdoutSpy).toHaveBeenCalledWith(JSON.stringify({ key: 'value' }, null, 2));
  });
});

describe('isMainScript', () => {
  const savedArgv = process.argv;
  afterEach(() => { process.argv = savedArgv; });

  it('returns true when argv[1] matches the script name (.ts)', () => {
    process.argv = ['node', '/path/to/search.ts'];
    expect(isMainScript('file:///path/to/search.ts')).toBe(true);
  });

  it('returns true when argv[1] is .js and import.meta.url is .ts', () => {
    process.argv = ['node', '/path/to/search.js'];
    expect(isMainScript('file:///other/path/search.ts')).toBe(true);
  });

  it('returns false when script names differ', () => {
    process.argv = ['node', '/path/to/register.ts'];
    expect(isMainScript('file:///path/to/search.ts')).toBe(false);
  });

  it('returns false when argv[1] is undefined', () => {
    process.argv = ['node'];
    expect(isMainScript('file:///path/to/search.ts')).toBe(false);
  });
});

describe('createSdk', () => {
  it('returns an SDK instance', () => {
    const sdk = createSdk({ chainId: 11155111, rpcUrl: 'https://rpc.sepolia.org' });
    expect(sdk).toBeDefined();
    expect(typeof sdk.loadAgent).toBe('function');
  });

  it('applies IPFS config when provided', () => {
    const sdk = createSdk({
      chainId: 11155111,
      rpcUrl: 'https://rpc.sepolia.org',
      ipfs: { ipfsProvider: 'pinata', pinataJwt: 'test-jwt' },
    });
    expect(sdk).toBeDefined();
  });
});

describe('chain coverage', () => {
  const SDK_SUPPORTED_CHAINS = [1, 11155111, 137];

  it('has KNOWN_RPC_URLS for all SDK-supported chain IDs', () => {
    for (const chainId of SDK_SUPPORTED_CHAINS) {
      const warnings = validateConfig({ activeChain: chainId, rpcUrl: 'https://test.example.com' });
      const hasKnownUrls = warnings.some((w) => w.message.includes('does not match known public endpoints'));
      expect(hasKnownUrls).toBe(true);
    }
  });
});

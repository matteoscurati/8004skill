# Search Filters Reference

> As of agent0-sdk v1.6.0, March 2026.

## SearchFilters

Passed to `sdk.searchAgents(filters?, options?)`. All fields are optional.

```typescript
{
  chains?: number[] | 'all', agentIds?: AgentId[], name?: string, description?: string,
  owners?: Address[], operators?: Address[], walletAddress?: Address,
  // Endpoint filters
  hasRegistrationFile?: boolean, hasWeb?: boolean, hasMCP?: boolean, hasA2A?: boolean,
  hasOASF?: boolean, hasEndpoints?: boolean,
  webContains?: string, mcpContains?: string, a2aContains?: string, ensContains?: string, didContains?: string,
  // Capability filters
  supportedTrust?: string[], a2aSkills?: string[], mcpTools?: string[], mcpPrompts?: string[], mcpResources?: string[],
  oasfSkills?: string[], oasfDomains?: string[],
  // Status & time
  active?: boolean, x402support?: boolean,
  registeredAtFrom?: Date | string | number, registeredAtTo?: Date | string | number,
  updatedAtFrom?: Date | string | number, updatedAtTo?: Date | string | number,
  // Metadata & keyword
  hasMetadataKey?: string, metadataValue?: { key: string, value: string }, keyword?: string,
  feedback?: FeedbackFilters,
}
```

## SearchOptions

```typescript
{ sort?: string[], semanticMinScore?: number, semanticTopK?: number }
```

## FeedbackSearchFilters & FeedbackSearchOptions

Used by `sdk.searchFeedback(filters, options?)`.

```typescript
// FeedbackSearchFilters
{ agentId?: AgentId, agents?: AgentId[], tags?: string[], reviewers?: Address[],
  capabilities?: string[], skills?: string[], tasks?: string[], names?: string[], includeRevoked?: boolean }

// FeedbackSearchOptions
{ minValue?: number, maxValue?: number }
```

## FeedbackFilters (SearchFilters sub-filter)

Used as `SearchFilters.feedback` to filter agents by feedback characteristics.

```typescript
{ hasFeedback?: boolean, hasNoFeedback?: boolean, includeRevoked?: boolean,
  minValue?: number, maxValue?: number, minCount?: number, maxCount?: number,
  fromReviewers?: Address[], endpoint?: string, hasResponse?: boolean,
  tag1?: string, tag2?: string, tag?: string }
```

## CLI Flag Mapping

The `scripts/lib/filters.ts` module maps CLI flags to `SearchFilters` fields. CSV flags accept comma-separated values.

**Note**: `search.ts` requires `--chain-id` and `--rpc-url`. Semantic search is triggered by `--keyword` (combined with any structured filters). `--query` and `--limit` are legacy aliases for `--keyword` and `--semantic-top-k`.

### Text & Identity

| CLI Flag | SearchFilters Field | Type |
|---|---|---|
| `--name` | `name` | string |
| `--description` | `description` | string |
| `--agent-ids` | `agentIds` | CSV |
| `--keyword` | `keyword` | string |
| `--owners` | `owners` | CSV |
| `--operators` | `operators` | CSV |
| `--wallet-address` | `walletAddress` | string |

### Endpoint Existence

| CLI Flag | SearchFilters Field | Notes |
|---|---|---|
| `--mcp-only true` | `hasMCP` | boolean |
| `--a2a-only true` | `hasA2A` | boolean |
| `--has-oasf true` | `hasOASF` | boolean |
| `--has-web true` | `hasWeb` | boolean |
| `--has-registration-file true` | `hasRegistrationFile` | boolean |
| `--has-endpoints true` | `hasEndpoints` | boolean |

### Endpoint Substring

| CLI Flag | SearchFilters Field |
|---|---|
| `--web-contains` | `webContains` |
| `--mcp-contains` | `mcpContains` |
| `--a2a-contains` | `a2aContains` |
| `--ens-contains` | `ensContains` |
| `--did-contains` | `didContains` |

### Capabilities

| CLI Flag | SearchFilters Field | Type |
|---|---|---|
| `--supported-trust` | `supportedTrust` | CSV |
| `--a2a-skills` | `a2aSkills` | CSV |
| `--mcp-tools` | `mcpTools` | CSV |
| `--mcp-prompts` | `mcpPrompts` | CSV |
| `--mcp-resources` | `mcpResources` | CSV |
| `--oasf-skills` | `oasfSkills` | CSV |
| `--oasf-domains` | `oasfDomains` | CSV |

### Status & Chain

| CLI Flag | SearchFilters Field | Notes |
|---|---|---|
| `--active true` | `active` | boolean |
| `--x402-support true` | `x402support` | boolean |
| `--chains all` | `chains` | only `'all'` supported via CLI |

### Time

| CLI Flag | SearchFilters Field |
|---|---|
| `--registered-from` | `registeredAtFrom` |
| `--registered-to` | `registeredAtTo` |
| `--updated-from` | `updatedAtFrom` |
| `--updated-to` | `updatedAtTo` |

### Metadata

| CLI Flag | SearchFilters Field | Notes |
|---|---|---|
| `--has-metadata-key` | `hasMetadataKey` | string |
| `--metadata-key` + `--metadata-value` | `metadataValue` | both required |

### Feedback Sub-filters

Mapped to `SearchFilters.feedback` (FeedbackFilters):

| CLI Flag | FeedbackFilters Field | Type |
|---|---|---|
| `--has-feedback true` | `hasFeedback` | boolean |
| `--has-no-feedback true` | `hasNoFeedback` | boolean |
| `--min-feedback-value` | `minValue` | number |
| `--max-feedback-value` | `maxValue` | number |
| `--min-feedback-count` | `minCount` | number |
| `--max-feedback-count` | `maxCount` | number |
| `--feedback-reviewers` | `fromReviewers` | CSV |
| `--feedback-endpoint` | `endpoint` | string |
| `--has-feedback-response true` | `hasResponse` | boolean |
| `--feedback-tag` | `tag` | string |
| `--feedback-tag1` | `tag1` | string |
| `--feedback-tag2` | `tag2` | string |
| `--include-revoked-feedback true` | `includeRevoked` | boolean |

### Search Options

| CLI Flag | SearchOptions Field | Type |
|---|---|---|
| `--sort` | `sort` | CSV |
| `--semantic-min-score` | `semanticMinScore` | number |
| `--semantic-top-k` | `semanticTopK` | positive integer |

## Examples

**Find MCP agents on Base:**

```bash
npx tsx scripts/search.ts --mcp-only true --chains all "MCP agents" \
  # Then filter results by chainId 8453 (Base) in the output
```

Or with keyword:

```bash
npx tsx scripts/search.ts --mcp-only true --keyword "base" "MCP agents on Base"
```

**Agents with positive feedback:**

```bash
npx tsx scripts/search.ts --has-feedback true --min-feedback-value 50 "well-reviewed agents"
```

**Active agents with A2A skills containing "translation":**

```bash
npx tsx scripts/search.ts --active true --a2a-only true --a2a-skills translation "translation agents"
```

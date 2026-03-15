# SDK Types Reference

> As of agent0-sdk v1.7.0, March 2026.

## AgentSummary

Returned by `sdk.searchAgents()` and `sdk.getAgent()`. Contains subgraph data including fields not available on the `Agent` class.

```typescript
{
  chainId: number, agentId: string, name: string, description: string, image?: string,
  owners: Address[], operators: Address[],
  // Endpoints (short names — differs from Agent class which uses mcpEndpoint, a2aEndpoint, etc.)
  mcp?: string, a2a?: string, web?: string, email?: string, ens?: string, did?: string, walletAddress?: string,
  // Capabilities (non-optional arrays, default [])
  supportedTrusts: string[], a2aSkills: string[], mcpTools: string[], mcpPrompts: string[],
  mcpResources: string[], oasfSkills: string[], oasfDomains: string[],
  // Status
  active: boolean, x402support: boolean,
  // Metadata
  createdAt?: number, updatedAt?: number, lastActivity?: number,
  agentURI?: string, agentURIType?: string,
  feedbackCount?: number, averageValue?: number, semanticScore?: number,
  extras: Record<string, any>,
}
```

## Feedback

Returned by `sdk.giveFeedback()`, `sdk.getFeedback()`, `sdk.searchFeedback()`, `sdk.revokeFeedback()`, and `sdk.appendResponse()`.

```typescript
{
  id: [AgentId, Address, number], agentId: string, reviewer: Address, txHash?: string,
  value?: number, tags: string[], endpoint?: string, text?: string,
  proofOfPayment?: Record<string, any>, fileURI?: string,
  createdAt: number, answers: Array<Record<string, any>>, isRevoked: boolean,
  mcpTool?: string, mcpPrompt?: string, mcpResource?: string,
  a2aSkills?: string[], a2aContextId?: string, a2aTaskId?: string,
  oasfSkills?: string[], oasfDomains?: string[],
}
```

## FeedbackSearchFilters Compatibility

`sdk.searchFeedback()` still accepts legacy filter buckets such as `capabilities`, `skills`, `tasks`, and `names` for backwards compatibility with indexed data and older clients. This does **not** change the feedback-file schema, which is spec-aligned in v1.7.0.

## X402 Types (v1.7.0+)

```typescript
// Describes what payment methods an x402 endpoint accepts
interface X402Accept {
  scheme: string;          // e.g. "exact", "upto"
  network: string;         // e.g. "base-mainnet", "base-sepolia"
  maxAmountRequired: string;  // Maximum amount in smallest unit (e.g. USDC wei)
  resource: string;        // URL of the resource being paid for
  description?: string;    // Human-readable description
  mimeType?: string;       // Expected response MIME type
  payTo?: string;          // Recipient address
  extra?: Record<string, any>;
}

// Payment object returned when x402Required is true
interface X402Payment {
  accepts: X402Accept[];          // Payment options from the 402 response
  resource: ResourceInfo;         // URL and metadata of the requested resource
  pay(): Promise<X402SettlementResponse>;      // Execute payment with user approval
  payFirst(): Promise<X402SettlementResponse>;  // Pay immediately without re-checking
}

// Options for sdk.request() and sdk.fetchWithX402()
interface X402RequestOptions extends RequestInit {
  maxAmount?: string;      // Cap the maximum payment amount (safety limit)
  autoApprove?: boolean;   // Skip user confirmation (for fetchWithX402)
}

// Result of sdk.request() — discriminated union
type X402RequestResult =
  | { x402Required: false; response: Response }
  | { x402Required: true; x402Payment: X402Payment };

// Wrapper indicating an x402 payment was required (returned in x402Required: true branch)
interface X402RequiredResponse {
  x402Payment: X402Payment;
}

// Resource metadata from the 402 response
interface ResourceInfo {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

// Result of pay() or payFirst()
interface X402SettlementResponse {
  response: Response;      // The unlocked HTTP response after payment
  txHash: string;          // On-chain payment transaction hash
  amount: string;          // Amount paid
  network: string;         // Network used for payment
}

// Type guard: check if an X402RequestResult requires payment
function isX402Required(result: X402RequestResult): result is { x402Required: true; x402Payment: X402Payment }
```

## A2A Types (v1.7.0+)

```typescript
// Response from agent.messageA2A() / agent.message()
interface MessageResponse {
  taskId: string;
  state: TaskState;
  parts: Part[];
  metadata?: Record<string, any>;
}

// Response from task.query(), task.message(), task.cancel()
interface TaskResponse {
  taskId: string;
  state: TaskState;
  parts: Part[];
  metadata?: Record<string, any>;
}

// Returned when an A2A message triggers a 402 payment requirement
interface A2APaymentRequired {
  x402Payment: X402Payment;
  taskId: string;
}

// Task states
type TaskState = 'submitted' | 'working' | 'input-required' | 'completed' | 'canceled' | 'failed';

// Loaded task object with methods
interface AgentTask {
  id: string;
  state: TaskState;
  parts: Part[];
  query(): Promise<TaskResponse>;
  message(text: string): Promise<TaskResponse>;
  cancel(): Promise<TaskResponse>;
}

// Summary returned by agent.listTasks()
interface TaskSummary {
  id: string;
  state: TaskState;
  createdAt: number;
  updatedAt: number;
  title?: string;
}

// A content part in a task response
interface Part {
  type: 'text' | 'data' | 'file';
  text?: string;          // When type is 'text'
  data?: any;             // When type is 'data'
  file?: {                // When type is 'file'
    name: string;
    mimeType: string;
    url?: string;
    bytes?: string;       // base64-encoded
  };
  metadata?: Record<string, any>;
}

// Options for agent.messageA2A()
interface MessageA2AOptions {
  taskId?: string;         // Continue an existing task (omit to start new)
  metadata?: Record<string, any>;
  timeout?: number;        // Request timeout in ms
}

// Options for agent.listTasks()
interface ListTasksOptions {
  state?: TaskState;       // Filter by state
  limit?: number;          // Max results
  offset?: number;         // Pagination offset
}

// Options for agent.loadTask()
interface LoadTaskOptions {
  timeout?: number;        // Request timeout in ms
}

// Authentication info from an agent card
interface AgentCardAuth {
  schemes: SecurityScheme[];
}

// Security scheme from an agent card
interface SecurityScheme {
  type: string;            // e.g. "x402", "bearer", "apiKey"
  description?: string;
  in?: string;             // e.g. "header", "query"
  name?: string;           // Header/query param name
}

// A2A client interface (returned by sdk.createA2AClient())
interface A2AClient {
  agentId: string;
  endpoint: string;
  message(text: string, options?: MessageA2AOptions): Promise<MessageResponse>;
  listTasks(options?: ListTasksOptions): Promise<TaskSummary[]>;
  loadTask(taskId: string, options?: LoadTaskOptions): Promise<AgentTask>;
}
```

## TransactionHandle

See `sdk-api.md` for the full TransactionHandle lifecycle (`.hash`, `.waitMined()`).

## Enums

### EndpointType

```typescript
enum EndpointType {
  MCP = 'MCP',
  A2A = 'A2A',
  ENS = 'ENS',
  DID = 'DID',
  WALLET = 'wallet',  // Note: lowercase
  OASF = 'OASF',
}
```

### TrustModel

```typescript
type TrustModel = 'reputation' | 'crypto-economic' | 'tee-attestation';
```

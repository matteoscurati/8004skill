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

### X402Accept

A single payment option from a 402 response (`PAYMENT-REQUIRED` header). Each entry has at least `price` and `token`; other fields are optional. Includes an index signature for additional server-provided fields.

```typescript
interface X402Accept {
  price: string;               // Amount in smallest units (e.g. USDC 6 decimals). String for large values.
  token: string;               // Token contract address or symbol.
  network?: string;            // Chain id (number or string, e.g. "base-sepolia", "eip155:84532").
  scheme?: string;             // Payment scheme (e.g. "exact").
  description?: string;        // Human-readable description.
  maxAmountRequired?: string;  // Max amount required when variable.
  destination?: string;        // Destination / pay-to address (recipient or verifying contract).
  asset?: string;              // Asset address (alias for token in some 402 body shapes).
  [key: string]: unknown;      // Additional fields from server (e.g. payTo, paymentRequirements).
}
```

### X402Payment\<T\>

Payment-required payload returned when the server responds with HTTP 402. Always includes `accepts[]`; when there is a single accept, convenience fields may be set. Generic parameter `T` defaults to `unknown` and represents the parsed success response type.

```typescript
interface X402Payment<T = unknown> {
  accepts: X402Accept[];       // Array of accepted payment options. Always present.
  x402Version?: number;        // x402 version from server's PAYMENT-REQUIRED header (e.g. 1 or 2).
  error?: string;              // V1/V2 human-readable error message from 402 response when present.
  resource?: ResourceInfo;     // V2 ResourceInfo from 402 response when present.
  price?: string;              // When single accept: convenience price (same as accepts[0].price).
  token?: string;              // When single accept: convenience token (same as accepts[0].token).
  network?: string;            // When single accept: convenience network (same as accepts[0].network).

  // Performs payment and retries the request.
  // No arg = use single accept; number = accepts[index]; X402Accept = chosen option.
  // Resolves to the same shape as a successful request (no x402Required).
  pay(accept?: X402Accept | number): Promise<T>;

  // When present (deps provided checkBalance): pays using the first accept for which
  // the signer has sufficient token balance on that chain. Throws if none have sufficient balance.
  payFirst?(): Promise<T>;     // Optional — only present when balance-checking deps are available.
}
```

### X402RequestOptions\<T\>

Options for the generic x402 HTTP request. Generic parameter `T` defaults to `unknown`.

```typescript
interface X402RequestOptions<T = unknown> {
  url: string;                 // Request URL.
  method: string;              // HTTP method (e.g. "GET", "POST").
  headers?: Record<string, string>;  // Optional request headers.
  body?: string | ArrayBuffer | Uint8Array;  // Optional request body.

  // Optional parser for 2xx response body. If omitted, body is parsed as JSON (res.json()).
  parseResponse?: (response: Response) => Promise<T>;

  // Optional payment to send with the first request (e.g. base64 PAYMENT-SIGNATURE payload).
  // If provided and server returns 2xx, one round trip; if 402, normal x402 flow.
  payment?: string;
}
```

### X402RequiredResponse\<T\>

Response when server returns HTTP 402. Caller checks `x402Required` and may call `x402Payment.pay()`.

```typescript
interface X402RequiredResponse<T> {
  x402Required: true;          // Always true — discriminant for the union.
  x402Payment: X402Payment<T>; // The payment object with accepts[] and pay()/payFirst?() methods.
}
```

### X402RequestResult\<T\>

Result of `sdk.request()`: either the parsed success value or the 402 response object. Discriminated union — on success, `x402Required` is `undefined` or `false`; on 402, `x402Required` is `true`.

```typescript
type X402RequestResult<T> =
  | (T & { x402Required?: false })   // Success: T with x402Required absent or false.
  | X402RequiredResponse<T>;          // 402: x402Required is true, x402Payment present.
```

### ResourceInfo

V2 resource metadata from the 402 response (x402 spec). All fields are optional.

```typescript
interface ResourceInfo {
  url?: string;                // URL of the resource.
  description?: string;        // Human-readable description.
  mimeType?: string;           // Expected response MIME type.
}
```

### X402SettlementResponse

Settlement response from `PAYMENT-RESPONSE` header or body after successful payment.

```typescript
interface X402SettlementResponse {
  success: boolean;            // Whether settlement succeeded.
  errorReason?: string;        // Error reason when success is false.
  transaction?: string;        // On-chain transaction hash.
  network?: string;            // Network used for payment.
  payer?: string;              // Address of the payer.
}
```

### Parse402FromHeaderResult

Result of parsing a `PAYMENT-REQUIRED` header (accepts + optional version, resource, error).

```typescript
interface Parse402FromHeaderResult {
  accepts: X402Accept[];       // Parsed payment options. Empty array if parsing failed.
  x402Version?: number;        // x402 version (1 or 2) when present.
  resource?: ResourceInfo;     // V2 PaymentRequired top-level resource. Present when server sends it.
  error?: string;              // V1 human-readable error message. Present when server sends it.
}
```

### X402 Utility Functions

```typescript
// Type guard: returns true if result is a 402 response. Returns false for null/undefined.
function isX402Required<T>(
  result: X402RequestResult<T> | null | undefined
): result is X402RequiredResponse<T>;

// Filter accepts to EVM-only (removes Solana and other non-EVM options).
function filterEvmAccepts(accepts: X402Accept[]): X402Accept[];

// Parse PAYMENT-REQUIRED header (base64-encoded JSON with accepts array).
function parse402FromHeader(headerValue: string | null): Parse402FromHeaderResult;

// Parse WWW-Authenticate header with x402 challenge.
// Format: x402 address="0x...", amount="0.01", chainId="8453", token="0x..."
// Decimal amounts are converted to atomic units (assumes USDC 6 decimals).
function parse402FromWWWAuthenticate(headerValue: string | null): Parse402FromHeaderResult;

// Parse 402 response body (JSON with accepts array). Used when server sends
// payment options in body instead of header.
function parse402FromBody(bodyText: string | null): Parse402FromHeaderResult;

// Parse PAYMENT-REQUIRED header, returning only the accepts array.
function parse402AcceptsFromHeader(headerValue: string | null): X402Accept[];

// Parse PAYMENT-RESPONSE header (base64-encoded JSON) after successful payment.
// Returns settlement info when present and valid; undefined otherwise.
function parse402SettlementFromHeader(headerValue: string | null): X402SettlementResponse | undefined;
```

## A2A Types (v1.7.0+)

### CredentialObject

Credential as an object. When a `string` is passed, it is normalized to `{ apiKey: string }`.

```typescript
interface CredentialObject {
  apiKey?: string;             // API key credential.
  bearer?: string;             // Bearer token credential.
  [key: string]: unknown;      // Additional credential fields.
}
```

### MessageA2AOptions

Options for `messageA2A()`. Controls blocking behavior, task continuation, authentication, payment, and A2A send configuration.

```typescript
interface MessageA2AOptions {
  blocking?: boolean;          // Whether to block until the task completes.
  contextId?: string;          // Context ID for grouping related messages.
  taskId?: string;             // Continue an existing task (omit to start new).
  credential?: string | CredentialObject;  // Auth credential: string (-> apiKey) or object.
  payment?: string;            // Optional base64 PAYMENT-SIGNATURE payload for the first request.
  acceptedOutputModes?: string[];  // SendMessageConfiguration: accepted output modes (e.g. stream, push).
  historyLength?: number;      // SendMessageConfiguration: requested history length for the task.
  pushNotificationConfig?: Record<string, unknown>;  // SendMessageConfiguration: push notification config (v0.3 / v1).
  returnImmediately?: boolean; // SendMessageConfiguration: return immediately without waiting (v1).
}
```

### MessageResponse

Direct message response from an A2A server (no task created). Discriminate from `TaskResponse` by checking `'task' in response`. Has `x402Required?: false` so the `x402Required` discriminant works.

```typescript
interface MessageResponse {
  x402Required?: false;        // Always false/absent — discriminant for the union with A2APaymentRequired.
  content?: string;            // Text content of the response.
  parts?: Part[];              // Structured content parts.
  contextId?: string;          // Context ID for follow-up messages.
}
```

### TaskResponse

Response when the server created a task. Discriminate from `MessageResponse` by checking `'task' in response`. Has `x402Required?: false` so the `x402Required` discriminant works.

```typescript
interface TaskResponse {
  x402Required?: false;        // Always false/absent — discriminant for the union with A2APaymentRequired.
  taskId: string;              // ID of the created/continued task.
  contextId: string;           // Context ID for this task.
  task: AgentTask;             // Task handle with query(), message(), cancel() methods.
  status?: TaskState;          // Optional task state snapshot from the send response.
}
```

### TaskState

Task state returned by `task.query()` or after cancel. Server-specific status values; common values include `open`, `working`, `completed`, `failed`, `canceled`, `rejected`. Includes an index signature for additional server-provided fields.

```typescript
interface TaskState {
  state?: string;              // Status string (e.g. "open", "working", "completed", "failed").
  [key: string]: unknown;      // Additional server-specific state fields.
}
```

### Part

Smallest unit of content in a Message or Artifact. Per A2A Protocol: text, url, data, or raw. Includes an index signature for additional fields.

```typescript
interface Part {
  text?: string;               // Text content.
  url?: string;                // URL content.
  data?: string;               // Data content (e.g. base64-encoded).
  raw?: string;                // Raw content.
  [key: string]: unknown;      // Additional fields.
}
```

### AgentTask

Task handle with read-only identifiers and methods to query, continue, or cancel a task. Returned by `response.task` and by `agent.loadTask(taskId)`. Methods may return `A2APaymentRequired`; use `pay()` to retry after payment.

```typescript
interface AgentTask {
  readonly taskId: string;     // Immutable task identifier.
  readonly contextId: string;  // Immutable context identifier.

  query(options?: {
    historyLength?: number;
  }): Promise<TaskQueryResult | A2APaymentRequired<TaskQueryResult>>;

  message(
    content: string | { parts: Part[] }
  ): Promise<MessageResponse | TaskResponse | A2APaymentRequired<MessageResponse | TaskResponse>>;

  cancel(): Promise<TaskCancelResult | A2APaymentRequired<TaskCancelResult>>;
}
```

### TaskQueryResult

Result of `task.query()`.

```typescript
type TaskQueryResult = {
  taskId: string;              // Task identifier.
  contextId: string;           // Context identifier.
  status?: TaskState;          // Current task state.
  artifacts?: unknown[];       // Task artifacts when present.
  messages?: unknown[];        // Message history when present.
};
```

### TaskCancelResult

Result of `task.cancel()`.

```typescript
type TaskCancelResult = {
  taskId: string;              // Task identifier.
  contextId: string;           // Context identifier.
  status?: TaskState;          // Task state after cancellation.
};
```

### TaskSummary

Summary of a task returned by `listTasks()`. Has `x402Required?: false` so the discriminant works. Includes an index signature for additional server-provided fields.

```typescript
interface TaskSummary {
  x402Required?: false;        // Always false/absent — discriminant for the union with A2APaymentRequired.
  taskId: string;              // Task identifier.
  contextId: string;           // Context identifier.
  status?: TaskState;          // Current task state.
  messages?: unknown[];        // Optional message history when historyLength > 0.
  [key: string]: unknown;      // Additional server-specific fields.
}
```

### A2APaymentRequired\<T\>

Returned when an A2A request returns HTTP 402. Compatible with `X402RequiredResponse` from the x402 types. Caller may call `x402Payment.pay()` to pay and retry. Generic parameter `T` defaults to `unknown` and represents the type returned after payment.

```typescript
interface A2APaymentRequired<T = unknown> {
  x402Required: true;          // Always true — discriminant for the union.
  x402Payment: {
    pay(accept?: unknown): Promise<T>;       // Pay and retry the request.
    payFirst?(): Promise<T>;                 // Pay using first accept with sufficient balance.
    accepts: unknown[];                      // Payment options from the 402 response.
    price?: string;                          // Convenience price when single accept.
    token?: string;                          // Convenience token when single accept.
    network?: string;                        // Convenience network when single accept.
  };
}
```

### ListTasksOptions

Options for `listTasks()`. Supports filtering, history length, authentication, and payment.

```typescript
interface ListTasksOptions {
  filter?: {
    contextId?: string;        // Filter by context ID.
    status?: string;           // Filter by status.
    [key: string]: unknown;    // Additional filter fields.
  };
  historyLength?: number;      // Requested message history length.
  credential?: string | CredentialObject;  // Auth credential.
  payment?: string;            // Optional payment payload for the first request.
}
```

### LoadTaskOptions

Options for `loadTask()`.

```typescript
interface LoadTaskOptions {
  credential?: string | CredentialObject;  // Auth credential.
  payment?: string;            // Optional payment payload.
}
```

### SecurityScheme

Union type of supported A2A security scheme types (per spec). Two variants: API key and HTTP.

```typescript
// API key scheme: where to send the value and under what name.
interface SecuritySchemeApiKey {
  type: 'apiKey';              // Discriminant.
  in: 'header' | 'query' | 'cookie';  // Where to send the credential.
  name: string;                // Header/query param/cookie name.
  description?: string;        // Human-readable description.
}

// HTTP (Bearer/Basic) scheme.
interface SecuritySchemeHttp {
  type: 'http';                // Discriminant.
  scheme: 'bearer' | 'basic';  // HTTP auth scheme.
  bearerFormat?: string;       // Format hint (e.g. "JWT").
  description?: string;        // Human-readable description.
}

type SecurityScheme = SecuritySchemeApiKey | SecuritySchemeHttp;
```

### AgentCardAuth

Agent card authentication configuration: security schemes and which are required.

```typescript
interface AgentCardAuth {
  securitySchemes?: Record<string, SecurityScheme>;  // Named security schemes.
  security?: Array<Record<string, string[]>>;        // Which schemes are required (OpenAPI style).
}
```

### A2AClient

Interface for A2A-capable clients. Implemented by `Agent` and `A2AClientFromSummary` so that loaded agents and agent summaries can be used interchangeably for A2A messaging. All methods may return `A2APaymentRequired` when the endpoint requires payment.

```typescript
interface A2AClient {
  messageA2A(
    content: string | { parts: Part[] },
    options?: MessageA2AOptions
  ): Promise<MessageResponse | TaskResponse | A2APaymentRequired<MessageResponse | TaskResponse>>;

  listTasks(
    options?: ListTasksOptions
  ): Promise<TaskSummary[] | A2APaymentRequired<TaskSummary[]>>;

  loadTask(
    taskId: string,
    options?: LoadTaskOptions
  ): Promise<AgentTask | A2APaymentRequired<AgentTask>>;
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

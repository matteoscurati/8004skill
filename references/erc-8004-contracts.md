# ERC-8004 Contract Interfaces

> As of agent0-sdk v1.7.1, March 2026. For protocol overview, see `erc-8004-spec.md`.

## Identity Registry

```solidity
// Write
function register() external returns (uint256 agentId)
function register(string memory agentURI) external returns (uint256 agentId)
function register(string memory agentURI, MetadataEntry[] memory metadata) external returns (uint256 agentId)
function setAgentURI(uint256 agentId, string calldata newURI) external
function setMetadata(uint256 agentId, string memory key, bytes memory value) external
function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external
function unsetAgentWallet(uint256 agentId) external

// Read
function getMetadata(uint256 agentId, string memory key) external view returns (bytes memory)
function getAgentWallet(uint256 agentId) external view returns (address)
function isAuthorizedOrOwner(address spender, uint256 agentId) external view returns (bool)
function ownerOf(uint256 tokenId) external view returns (address)  // ERC-721
function tokenURI(uint256 tokenId) external view returns (string memory)  // ERC-721
```

## Reputation Registry

```solidity
// Write
function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals,
    string calldata tag1, string calldata tag2, string calldata endpoint,
    string calldata feedbackURI, bytes32 feedbackHash) external
function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external
function appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex,
    string calldata responseURI, bytes32 responseHash) external

// Read
function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex) external view
    returns (int128 value, uint8 valueDecimals, string memory tag1, string memory tag2, bool isRevoked)
function readAllFeedback(uint256 agentId, address[] calldata clientAddresses,
    string calldata tag1, string calldata tag2, bool includeRevoked) external view returns (...)
function getSummary(uint256 agentId, address[] calldata clientAddresses,
    string calldata tag1, string calldata tag2) external view
    returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)
function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64)
function getClients(uint256 agentId) external view returns (address[] memory)
function getResponseCount(uint256 agentId, address clientAddress, uint64 feedbackIndex,
    address[] calldata responders) external view returns (uint64 count)
```

## Validation Registry

See `validation-registry.md` for contract functions (write + read), data model, and use cases.

## Event Signatures

```solidity
// Identity Registry
event Registered(uint256 indexed agentId, string agentURI, address indexed owner)
event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy)
event MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey,
    string metadataKey, bytes metadataValue)

// Reputation Registry
event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex,
    int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2,
    string endpoint, string feedbackURI, bytes32 feedbackHash)
event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress,
    uint64 indexed feedbackIndex)
event ResponseAppended(uint256 indexed agentId, address indexed clientAddress,
    uint64 feedbackIndex, address indexed responder, string responseURI, bytes32 responseHash)

// Validation Registry
event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId,
    string requestURI, bytes32 indexed requestHash)
event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId,
    bytes32 indexed requestHash, uint8 response, string responseURI,
    bytes32 responseHash, string tag)
```

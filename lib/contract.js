export const ANCHOR_ABI = [
  'function anchor(bytes32 eventHash)',
  'function isAnchored(bytes32 eventHash) view returns (bool)',
  'function owner() view returns (address)',
  'event Anchored(bytes32 indexed eventHash, uint256 anchoredAt)',
];


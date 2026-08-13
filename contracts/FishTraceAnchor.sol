// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title FishTraceAnchor
/// @notice Stores only privacy-safe SHA-256 traceability event hashes.
contract FishTraceAnchor {
    address public immutable owner;
    mapping(bytes32 => uint256) public anchoredAt;

    event Anchored(bytes32 indexed eventHash, uint256 anchoredAt);

    error Unauthorized();
    error InvalidHash();
    error AlreadyAnchored();

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert Unauthorized();
        owner = initialOwner;
    }

    function anchor(bytes32 eventHash) external {
        if (msg.sender != owner) revert Unauthorized();
        if (eventHash == bytes32(0)) revert InvalidHash();
        if (anchoredAt[eventHash] != 0) revert AlreadyAnchored();

        anchoredAt[eventHash] = block.timestamp;
        emit Anchored(eventHash, block.timestamp);
    }

    function isAnchored(bytes32 eventHash) external view returns (bool) {
        return anchoredAt[eventHash] != 0;
    }
}


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

/// @title KinetixForwarder
/// @notice Forwarder OpenZeppelin: kiểm value, chữ ký, nonce, deadline và trusted target.
contract KinetixForwarder is ERC2771Forwarder {
    constructor() ERC2771Forwarder("KinetixForwarder") {}
}

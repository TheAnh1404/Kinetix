// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWithdrawalHub {
    function fastWithdraw(uint256 vaultId, uint256 amount) external;
    function requestLargeWithdrawal(
        uint256 vaultId,
        uint256 amount,
        string calldata reason
    ) external returns (uint256);
}

/// @notice Receiver đối kháng chỉ dùng cho kiểm thử EVM cục bộ.
contract WithdrawalReceiver {
    IWithdrawalHub public hub;
    uint256 public vaultId;
    bool public rejectPayment;
    bool public reentered;

    constructor(address target) {
        hub = IWithdrawalHub(target);
    }
    function configure(uint256 id, bool reject) external {
        vaultId = id;
        rejectPayment = reject;
    }
    function withdraw(uint256 amount) external {
        hub.fastWithdraw(vaultId, amount);
    }
    function request(uint256 amount) external {
        hub.requestLargeWithdrawal(vaultId, amount, "Receiver regression");
    }

    receive() external payable {
        if (rejectPayment) revert("RECEIVER_REJECTED");
        try hub.fastWithdraw(vaultId, 1) {
            reentered = true;
        } catch {
            reentered = false;
        }
    }
}

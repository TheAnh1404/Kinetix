// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IKinetixVault} from "../interfaces/IKinetixVault.sol";

/**
 * @notice Receiver giả lập để kiểm thử Reentrancy Attack và Rollback khi nhận tiền thất bại.
 */
contract VaultV1MaliciousReceiver {
    address public targetVault;
    bool public shouldRevert;
    bool public attemptReenter;
    bool public reenterSuccess;

    constructor(address _targetVault) {
        targetVault = _targetVault;
    }

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function setAttemptReenter(bool _attemptReenter) external {
        attemptReenter = _attemptReenter;
    }

    receive() external payable {
        if (shouldRevert) {
            revert("RECEIVER_FORCE_REVERT");
        }
        if (attemptReenter) {
            attemptReenter = false; // Ngăn loop vô hạn
            try IKinetixVault(targetVault).withdrawFast(1, payable(address(this))) {
                reenterSuccess = true;
            } catch {
                reenterSuccess = false;
            }
        }
    }
}

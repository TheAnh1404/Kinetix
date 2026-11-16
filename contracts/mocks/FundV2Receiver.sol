// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IKinetixFundV2} from "../interfaces/IKinetixFundV2.sol";

/// @notice Receiver kiểm tra rollback, gọi lặp và hoàn tiền về smart wallet.
contract FundV2Receiver {
    IKinetixFundV2 public targetFund;
    bool public rejectPayment;
    bool public reenter;
    bool public reentered;
    uint256 public expenseId;

    function configure(address fund, bool reject, bool attack, uint256 id) external {
        targetFund = IKinetixFundV2(fund);
        rejectPayment = reject;
        reenter = attack;
        expenseId = id;
    }

    function contribute() external payable {
        targetFund.deposit{value: msg.value}(bytes32(0));
    }
    function refund() external {
        targetFund.refundFailedGoal();
    }

    receive() external payable {
        require(!rejectPayment, "receiver rejected");
        if (reenter) {
            reenter = false;
            try targetFund.executeExpense(expenseId) {
                reentered = true;
            } catch {
                reentered = false;
            }
        }
    }
}

/// @notice Chỉ dùng trong test để ép gửi native asset, không có trong luồng sản phẩm.
contract FundV2ForcedNative {
    constructor(address payable destination) payable {
        // solhint-disable-next-line avoid-suicide
        selfdestruct(destination);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ITeleporterMessenger.sol";

/**
 * @title MockTeleporterMessenger
 * @notice Hợp đồng giả lập Avalanche Teleporter phục vụ môi trường kiểm thử (Unit Test / Local)
 * Cho phép mô phỏng việc truyền thông điệp liên chuỗi giữa Family L1 và Fuji C-Chain
 */
contract MockTeleporterMessenger is ITeleporterMessenger {
    uint256 private _messageIdCounter;

    event MockMessageSent(
        uint256 indexed messageId,
        bytes32 indexed destinationBlockchainID,
        address indexed destinationAddress,
        bytes message
    );

    /**
     * @notice Giả lập gửi thông điệp và tự động phân phát đến Receiver nếu có địa chỉ hợp lệ
     */
    function sendCrossChainMessage(
        TeleporterMessageInput calldata messageInput
    ) external override returns (uint256) {
        _messageIdCounter++;
        uint256 messageId = _messageIdCounter;

        emit MockMessageSent(
            messageId,
            messageInput.destinationBlockchainID,
            messageInput.destinationAddress,
            messageInput.message
        );

        // Nếu chuỗi nhận hoặc địa chỉ nhận được thiết lập, gọi callback receiveTeleporterMessage
        if (messageInput.destinationAddress != address(0)) {
            // Giả lập ID chuỗi nguồn
            bytes32 originChainId = keccak256(abi.encodePacked(block.chainid));
            try
                ITeleporterReceiver(messageInput.destinationAddress).receiveTeleporterMessage(
                    originChainId,
                    msg.sender,
                    messageInput.message
                )
            {
                // Phân phối thành công
            } catch {
                // Trong môi trường test nếu không gọi trực tiếp được thì bỏ qua (async bridge mock)
            }
        }

        return messageId;
    }

    /**
     * @notice Hàm thủ công phân phát tin nhắn giả lập đến Receiver
     */
    function deliverMockMessage(
        address receiver,
        bytes32 originChainId,
        address originSender,
        bytes calldata message
    ) external {
        ITeleporterReceiver(receiver).receiveTeleporterMessage(
            originChainId,
            originSender,
            message
        );
    }
}

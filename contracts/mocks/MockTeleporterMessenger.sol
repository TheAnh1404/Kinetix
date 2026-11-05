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

    /// @notice Giả lập ID chuỗi nguồn (mặc định keccak256("Family-L1") để đồng bộ với test suite)
    bytes32 public mockOriginBlockchainID = keccak256(bytes("Family-L1"));

    event MockMessageSent(
        bytes32 indexed messageId,
        bytes32 indexed destinationBlockchainID,
        address indexed destinationAddress,
        bytes message
    );
    event MockDeliveryFailed(bytes32 indexed messageId, address indexed receiver, bytes reason);

    /**
     * @notice Cho phép cấu hình mockOriginBlockchainID phục vụ kiểm thử bảo mật
     */
    function setMockOriginBlockchainID(bytes32 _id) external {
        mockOriginBlockchainID = _id;
    }

    /**
     * @notice Giả lập gửi thông điệp và tự động phân phát đến Receiver nếu có địa chỉ hợp lệ
     */
    function sendCrossChainMessage(
        TeleporterMessageInput calldata messageInput
    ) external override returns (bytes32) {
        _messageIdCounter++;
        bytes32 messageId = bytes32(_messageIdCounter);

        emit MockMessageSent(
            messageId,
            messageInput.destinationBlockchainID,
            messageInput.destinationAddress,
            messageInput.message
        );

        // Nếu chuỗi nhận hoặc địa chỉ nhận được thiết lập, gọi callback receiveTeleporterMessage
        if (messageInput.destinationAddress != address(0)) {
            bytes32 originChainId = mockOriginBlockchainID;
            try
                ITeleporterReceiver(messageInput.destinationAddress).receiveTeleporterMessage(
                    originChainId,
                    msg.sender,
                    messageInput.message
                )
            {
                // Phân phối thành công
            } catch (bytes memory reason) {
                // Lỗi receiver luôn quan sát được; event gửi không chứng minh đã nhận vốn.
                emit MockDeliveryFailed(messageId, messageInput.destinationAddress, reason);
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

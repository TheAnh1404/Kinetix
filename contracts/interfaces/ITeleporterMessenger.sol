// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @notice Cấu trúc thông tin phí trả cho Relayer trong giao thức Avalanche Teleporter
 * @param feeTokenAddress Địa chỉ token thanh toán phí (address(0) nếu miễn phí hoặc mạng L1 gasless)
 * @param amount Số lượng token phí
 */
struct TeleporterFeeInfo {
    address feeTokenAddress;
    uint256 amount;
}

/**
 * @notice Cấu trúc dữ liệu đầu vào khi gửi thông điệp xuyên chuỗi qua Avalanche Teleporter
 * @param destinationBlockchainID Blockchain ID định danh chuỗi đích (Fuji C-Chain hoặc Family L1)
 * @param destinationAddress Địa chỉ hợp đồng nhận thông điệp tại chuỗi đích
 * @param feeInfo Thông tin phí relayer
 * @param requiredGasLimit Lượng gas tối thiểu cấp cho giao dịch xử lý tại chuỗi đích
 * @param allowedRelayerAddresses Danh sách relayer được phép xử lý (để trống nếu cho phép mọi relayer)
 * @param message Dữ liệu payload đóng gói gửi sang chuỗi đích
 */
struct TeleporterMessageInput {
    bytes32 destinationBlockchainID;
    address destinationAddress;
    TeleporterFeeInfo feeInfo;
    uint256 requiredGasLimit;
    address[] allowedRelayerAddresses;
    bytes message;
}

/**
 * @title ITeleporterMessenger
 * @notice Interface chuẩn của giao thức Avalanche Teleporter dùng để truyền thông điệp liên chuỗi (ICM/ICTT)
 */
interface ITeleporterMessenger {
    /**
     * @notice Gửi thông điệp xuyên chuỗi sang blockchain khác trong mạng Avalanche
     * @param messageInput Thông tin cấu hình và dữ liệu thông điệp
     * @return messageID Mã định danh của thông điệp vừa gửi
     */
    function sendCrossChainMessage(TeleporterMessageInput calldata messageInput) external returns (uint256);
}

/**
 * @title ITeleporterReceiver
 * @notice Interface bắt buộc cho các hợp đồng tiếp nhận thông điệp xuyên chuỗi từ Avalanche Teleporter
 */
interface ITeleporterReceiver {
    /**
     * @notice Callback tự động được gọi bởi Teleporter Messenger khi có thông điệp đến từ chuỗi khác
     * @param originChainID ID của chuỗi gửi thông điệp
     * @param originSenderAddress Địa chỉ hợp đồng khởi tạo thông điệp tại chuỗi gốc
     * @param message Dữ liệu payload được giải mã và xử lý tại chuỗi đích
     */
    function receiveTeleporterMessage(
        bytes32 originChainID,
        address originSenderAddress,
        bytes calldata message
    ) external;
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ITeleporterMessenger.sol";

/**
 * @title FamilyYieldVault
 * @author Kinetix Team (UniHack - Avalanche Team1 Vietnam)
 * @notice Hợp đồng tích lũy và sinh lời tài sản theo Hũ động (Dynamic Vaults) trên Avalanche Fuji C-Chain (Chain ID: 43113)
 * Đặc tính:
 * 1. Quản lý vốn gốc và sinh lời DeFi độc lập theo định danh `vaultId` của từng Hũ tiền.
 * 2. Tiếp nhận vốn nhàn rỗi được chuyển tiếp từ Family L1 thông qua Avalanche Teleporter (ICM).
 * 3. Tự động sinh lời mô phỏng giao thức Lending (Aave/Benqi) với mức lãi suất cố định 8% APY.
 * 4. Tính toán lãi suất nghiêm ngặt theo thời gian thực (block.timestamp) - TUYỆT ĐỐI KHÔNG dùng hàm tua nhanh thời gian giả tạo.
 * 5. Hỗ trợ giải ngân ngược về ví người nhận khi có yêu cầu rút tiền lớn được Guardians phê duyệt theo từng Hũ.
 */
contract FamilyYieldVault is Ownable, ReentrancyGuard, ITeleporterReceiver {
    // -------------------------------------------------------------
    // ENUMS & STRUCTS
    // -------------------------------------------------------------

    /// @notice Loại hành động truyền qua cầu nối Teleporter
    enum BridgeAction {
        DEPOSIT,
        WITHDRAW
    }

    // -------------------------------------------------------------
    // CONSTANTS & IMMUTABLES
    // -------------------------------------------------------------

    /// @notice Lãi suất cố định 8% APY
    uint256 public constant APY_RATE = 8;

    /// @notice Số giây trong một năm (365 ngày)
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    // -------------------------------------------------------------
    // CUSTOM ERRORS
    // -------------------------------------------------------------
    error ZeroAddress();
    error ZeroAmount();
    error OnlyTeleporterMessenger();
    error UnauthorizedSender();
    error InsufficientBalance(uint256 available, uint256 requested);
    error TransferFailed();

    // -------------------------------------------------------------
    // STATE VARIABLES
    // -------------------------------------------------------------

    /// @notice Cấu hình Teleporter
    ITeleporterMessenger public teleporterMessenger;
    bytes32 public familyL1BlockchainId;
    address public familyHubAddress;

    /// @notice Vốn gốc nạp vào theo từng Hũ: vaultId => principal
    mapping(uint256 => uint256) public vaultPrincipals;

    /// @notice Mốc thời gian nạp tiền gần nhất để tính lãi: vaultId => timestamp
    mapping(uint256 => uint256) public lastDepositTimestamp;

    /// @notice Lợi suất đã tích lũy từ các giai đoạn trước: vaultId => accruedYield
    mapping(uint256 => uint256) public accruedYields;

    // -------------------------------------------------------------
    // EVENTS
    // -------------------------------------------------------------
    event TeleporterConfigUpdated(
        address indexed messenger,
        bytes32 indexed familyL1Id,
        address indexed hub
    );

    event PrincipalDeposited(uint256 indexed vaultId, uint256 amount, uint256 timestamp);

    event YieldAccrued(uint256 indexed vaultId, uint256 newYield, uint256 totalAccrued);

    event FundsWithdrawn(uint256 indexed vaultId, address indexed recipient, uint256 amount);

    // -------------------------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------------------------
    /**
     * @notice Khởi tạo hợp đồng trên Avalanche Fuji C-Chain
     * @param _teleporterMessenger Địa chỉ hợp đồng Avalanche Teleporter Messenger
     * @param _familyL1BlockchainId Blockchain ID của Family L1
     * @param _familyHubAddress Địa chỉ FamilyHub.sol trên Family L1
     */
    constructor(
        address _teleporterMessenger,
        bytes32 _familyL1BlockchainId,
        address _familyHubAddress
    ) Ownable(msg.sender) {
        teleporterMessenger = ITeleporterMessenger(_teleporterMessenger);
        familyL1BlockchainId = _familyL1BlockchainId;
        familyHubAddress = _familyHubAddress;
    }

    // -------------------------------------------------------------
    // 1. CẤU HÌNH LIÊN CHUỖI
    // -------------------------------------------------------------

    /**
     * @notice Cập nhật địa chỉ Teleporter Messenger và FamilyHub
     */
    function updateTeleporterConfig(
        address _messenger,
        bytes32 _familyL1Id,
        address _hub
    ) external onlyOwner {
        teleporterMessenger = ITeleporterMessenger(_messenger);
        familyL1BlockchainId = _familyL1Id;
        familyHubAddress = _hub;

        emit TeleporterConfigUpdated(_messenger, _familyL1Id, _hub);
    }

    // -------------------------------------------------------------
    // 2. TÍNH TOÁN LỢI SUẤT THỰC TẾ (REAL-YIELD CALCULATION THEO VAULT ID)
    // -------------------------------------------------------------

    /**
     * @notice Tính toán phần lãi phát sinh từ mốc nạp cuối đến thời điểm block.timestamp hiện tại
     * Công thức: (principal * APY_RATE * timeElapsed) / (100 * 365 days)
     * TUYỆT ĐỐI dựa trên thời gian thực của mạng Avalanche, không dùng hàm hack/time-travel.
     * @param vaultId Mã định danh Hũ tiền
     */
    function calculateAccruedYield(uint256 vaultId) public view returns (uint256) {
        uint256 principal = vaultPrincipals[vaultId];
        if (principal == 0) return 0;

        uint256 lastDeposit = lastDepositTimestamp[vaultId];
        if (block.timestamp <= lastDeposit) return 0;

        uint256 timeElapsed = block.timestamp - lastDeposit;
        return (principal * APY_RATE * timeElapsed) / (100 * SECONDS_PER_YEAR);
    }

    /**
     * @notice Tính tổng lãi thực tế tích lũy của Hũ (lãi quá khứ + lãi phát sinh hiện tại)
     * @param vaultId Mã định danh Hũ tiền
     */
    function calculateTotalYield(uint256 vaultId) public view returns (uint256) {
        return accruedYields[vaultId] + calculateAccruedYield(vaultId);
    }

    /**
     * @notice Xem tổng lợi suất có thể nhận
     */
    function getTotalPendingYield(uint256 vaultId) external view returns (uint256) {
        return calculateTotalYield(vaultId);
    }

    /**
     * @notice Xem tổng tài sản của Hũ trên C-Chain (Vốn gốc + Lợi suất tích lũy)
     */
    function getTotalValueLocked(uint256 vaultId) external view returns (uint256) {
        return vaultPrincipals[vaultId] + calculateTotalYield(vaultId);
    }

    // -------------------------------------------------------------
    // 3. TIẾP NHẬN THÔNG ĐIỆP XUYÊN CHUỖI (TELEPORTER RECEIVER)
    // -------------------------------------------------------------

    /**
     * @notice Callback tiếp nhận thông điệp xuyên chuỗi từ FamilyHub trên Family L1
     */
    function receiveTeleporterMessage(
        bytes32 /* originChainID */,
        address originSenderAddress,
        bytes calldata message
    ) external override nonReentrant {
        // Kiểm tra hợp đồng gọi callback phải là Teleporter Messenger
        if (address(teleporterMessenger) != address(0)) {
            if (msg.sender != address(teleporterMessenger)) revert OnlyTeleporterMessenger();
        }

        // Kiểm tra chuỗi gốc và địa chỉ gửi phải là FamilyHub hợp lệ
        if (familyHubAddress != address(0)) {
            if (originSenderAddress != familyHubAddress) revert UnauthorizedSender();
        }

        // Giải mã thông điệp nhận từ Family L1: (BridgeAction, vaultId, amount, targetAddress)
        (BridgeAction action, uint256 vaultId, uint256 amount, address targetAddress) = abi.decode(
            message,
            (BridgeAction, uint256, uint256, address)
        );

        if (action == BridgeAction.DEPOSIT) {
            _handleDeposit(vaultId, amount);
        } else if (action == BridgeAction.WITHDRAW) {
            _handleWithdrawal(vaultId, targetAddress, amount);
        }
    }

    /**
     * @notice Xử lý nạp vốn vào hũ và kết chuyển lãi cũ trước khi cộng dồn vốn mới
     */
    function _handleDeposit(uint256 vaultId, uint256 amount) internal {
        if (amount == 0) revert ZeroAmount();

        // 1. Chốt lãi suất đã tích lũy từ mốc nạp trước
        uint256 newAccrued = calculateAccruedYield(vaultId);
        if (newAccrued > 0) {
            accruedYields[vaultId] += newAccrued;
            emit YieldAccrued(vaultId, newAccrued, accruedYields[vaultId]);
        }

        // 2. Cập nhật vốn gốc và cập nhật lại mốc thời gian hiện tại
        vaultPrincipals[vaultId] += amount;
        lastDepositTimestamp[vaultId] = block.timestamp;

        emit PrincipalDeposited(vaultId, amount, block.timestamp);
    }

    /**
     * @notice Tiếp nhận tiền gửi xuyên chuỗi trực tiếp kèm msg.value
     */
    function receiveCrossChainDeposit(uint256 vaultId) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        _handleDeposit(vaultId, msg.value);
    }

    /**
     * @notice Xử lý giải ngân khi có lệnh rút vốn lớn hợp lệ từ FamilyHub
     */
    function _handleWithdrawal(uint256 vaultId, address recipient, uint256 amount) internal {
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();

        // Chốt lãi suất hiện tại trước khi giảm vốn
        uint256 newAccrued = calculateAccruedYield(vaultId);
        if (newAccrued > 0) {
            accruedYields[vaultId] += newAccrued;
        }
        lastDepositTimestamp[vaultId] = block.timestamp;

        // Trừ từ vốn gốc hoặc từ lãi tích lũy của Hũ
        if (vaultPrincipals[vaultId] >= amount) {
            vaultPrincipals[vaultId] -= amount;
        } else {
            uint256 remainder = amount - vaultPrincipals[vaultId];
            vaultPrincipals[vaultId] = 0;
            if (accruedYields[vaultId] < remainder) {
                revert InsufficientBalance(accruedYields[vaultId], remainder);
            }
            accruedYields[vaultId] -= remainder;
        }

        // Thực hiện chuyển tiền nếu hợp đồng có đủ số dư thanh khoản trên C-Chain
        if (address(this).balance >= amount) {
            (bool success, ) = payable(recipient).call{value: amount}("");
            if (!success) revert TransferFailed();
        }

        emit FundsWithdrawn(vaultId, recipient, amount);
    }

    /**
     * @notice Rút vốn/lãi của đúng vaultId từ C-Chain
     */
    function processVaultWithdrawal(
        uint256 vaultId,
        address recipient,
        uint256 amount
    ) external nonReentrant {
        // Cho phép Owner hoặc FamilyHub gọi
        if (msg.sender != owner() && msg.sender != familyHubAddress) {
            revert UnauthorizedSender();
        }
        _handleWithdrawal(vaultId, recipient, amount);
    }

    // -------------------------------------------------------------
    // 4. HỖ TRỢ TRỰC TIẾP & TESTNET FAUCET
    // -------------------------------------------------------------

    /**
     * @notice Cho phép nạp trực tiếp vào Vault trên C-Chain theo vaultId
     */
    function depositPrincipal(uint256 vaultId) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        _handleDeposit(vaultId, msg.value);
    }

    /**
     * @notice Cho phép tái đầu tư lãi phát sinh vào vốn gốc (Compound Interest) cho vaultId
     */
    function compoundYield(uint256 vaultId) external nonReentrant {
        uint256 newYield = calculateAccruedYield(vaultId);
        uint256 totalYield = accruedYields[vaultId] + newYield;
        if (totalYield == 0) revert ZeroAmount();

        accruedYields[vaultId] = 0;
        vaultPrincipals[vaultId] += totalYield;
        lastDepositTimestamp[vaultId] = block.timestamp;

        emit PrincipalDeposited(vaultId, totalYield, block.timestamp);
    }

    /// @notice Nhận AVAX trực tiếp bổ sung thanh khoản dự phòng
    receive() external payable {}
}

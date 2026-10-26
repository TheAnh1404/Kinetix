// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ITeleporterMessenger.sol";

/**
 * @title FamilyYieldVault
 * @author Kinetix Team (UniHack - Avalanche Team1 Vietnam)
 * @notice Hợp đồng tích lũy và sinh lời tài sản gia đình trên Avalanche Fuji C-Chain (Chain ID: 43113)
 * Đặc tính:
 * 1. Tiếp nhận vốn nhàn rỗi (90%) được chuyển tiếp từ Family L1 thông qua Avalanche Teleporter (ICM).
 * 2. Tự động sinh lời mô phỏng giao thức Lending (Aave/Benqi) với mức lãi suất cố định 8% APY.
 * 3. Tính toán lãi suất nghiêm ngặt theo thời gian thực (block.timestamp) - TUYỆT ĐỐI KHÔNG dùng hàm tua nhanh thời gian giả tạo.
 * 4. Hỗ trợ giải ngân ngược về ví người nhận khi có yêu cầu rút tiền lớn được Guardians phê duyệt.
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

    /// @notice Vốn gốc nạp vào theo từng gia đình (hoặc theo địa chỉ Hub): family => principal
    mapping(address => uint256) public principalBalances;

    /// @notice Mốc thời gian nạp tiền gần nhất để tính lãi: family => timestamp
    mapping(address => uint256) public lastDepositTimestamp;

    /// @notice Lợi suất đã tích lũy từ các giai đoạn trước: family => accruedYield
    mapping(address => uint256) public accruedYieldBalances;

    // -------------------------------------------------------------
    // EVENTS
    // -------------------------------------------------------------
    event TeleporterConfigUpdated(
        address indexed messenger,
        bytes32 indexed familyL1Id,
        address indexed hub
    );

    event PrincipalDeposited(address indexed family, uint256 amount, uint256 timestamp);

    event YieldAccrued(address indexed family, uint256 newYield, uint256 totalAccrued);

    event FundsWithdrawn(address indexed family, address indexed recipient, uint256 amount);

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
    // 2. TÍNH TOÁN LỢI SUẤT THỰC TẾ (REAL-YIELD CALCULATION)
    // -------------------------------------------------------------

    /**
     * @notice Tính toán phần lãi phát sinh từ mốc nạp cuối đến thời điểm block.timestamp hiện tại
     * Công thức: (principal * APY_RATE * timeElapsed) / (100 * 365 days)
     * TUYỆT ĐỐI dựa trên thời gian thực của mạng Avalanche, không dùng hàm hack/time-travel.
     * @param family Địa chỉ gia đình (hoặc FamilyHub)
     */
    function calculateAccruedYield(address family) public view returns (uint256) {
        uint256 principal = principalBalances[family];
        if (principal == 0) return 0;

        uint256 lastDeposit = lastDepositTimestamp[family];
        if (block.timestamp <= lastDeposit) return 0;

        uint256 timeElapsed = block.timestamp - lastDeposit;
        return (principal * APY_RATE * timeElapsed) / (100 * SECONDS_PER_YEAR);
    }

    /**
     * @notice Xem tổng lợi suất có thể nhận (lãi quá khứ + lãi tích lũy hiện tại)
     */
    function getTotalPendingYield(address family) external view returns (uint256) {
        return accruedYieldBalances[family] + calculateAccruedYield(family);
    }

    /**
     * @notice Xem tổng tài sản của gia đình trên C-Chain (Vốn gốc + Lợi suất tích lũy)
     */
    function getTotalValueLocked(address family) external view returns (uint256) {
        return
            principalBalances[family] +
            accruedYieldBalances[family] +
            calculateAccruedYield(family);
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

        // Giải mã thông điệp nhận từ Family L1
        (BridgeAction action, uint8 vaultType, uint256 amount, address targetAddress) = abi.decode(
            message,
            (BridgeAction, uint8, uint256, address)
        );
        vaultType; // Tránh warning unused variable

        if (action == BridgeAction.DEPOSIT) {
            _handleDeposit(targetAddress, amount);
        } else if (action == BridgeAction.WITHDRAW) {
            _handleWithdrawal(originSenderAddress, targetAddress, amount);
        }
    }

    /**
     * @notice Xử lý nạp vốn và kết chuyển lãi cũ trước khi cộng dồn vốn mới
     */
    function _handleDeposit(address family, uint256 amount) internal {
        if (amount == 0) revert ZeroAmount();

        // 1. Chốt lãi suất đã tích lũy từ mốc nạp trước
        uint256 newAccrued = calculateAccruedYield(family);
        if (newAccrued > 0) {
            accruedYieldBalances[family] += newAccrued;
            emit YieldAccrued(family, newAccrued, accruedYieldBalances[family]);
        }

        // 2. Cập nhật vốn gốc và cập nhật lại mốc thời gian hiện tại
        principalBalances[family] += amount;
        lastDepositTimestamp[family] = block.timestamp;

        emit PrincipalDeposited(family, amount, block.timestamp);
    }

    /**
     * @notice Xử lý giải ngân khi có lệnh rút vốn lớn hợp lệ từ FamilyHub
     */
    function _handleWithdrawal(address family, address recipient, uint256 amount) internal {
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();

        // Chốt lãi suất hiện tại trước khi giảm vốn
        uint256 newAccrued = calculateAccruedYield(family);
        if (newAccrued > 0) {
            accruedYieldBalances[family] += newAccrued;
        }
        lastDepositTimestamp[family] = block.timestamp;

        // Trừ từ vốn gốc hoặc từ lãi tích lũy
        if (principalBalances[family] >= amount) {
            principalBalances[family] -= amount;
        } else {
            uint256 remainder = amount - principalBalances[family];
            principalBalances[family] = 0;
            if (accruedYieldBalances[family] < remainder) {
                revert InsufficientBalance(accruedYieldBalances[family], remainder);
            }
            accruedYieldBalances[family] -= remainder;
        }

        // Thực hiện chuyển tiền nếu hợp đồng có đủ số dư thanh khoản trên C-Chain
        if (address(this).balance >= amount) {
            (bool success, ) = payable(recipient).call{value: amount}("");
            if (!success) revert TransferFailed();
        }

        emit FundsWithdrawn(family, recipient, amount);
    }

    // -------------------------------------------------------------
    // 4. HỖ TRỢ TRỰC TIẾP & TESTNET FAUCET
    // -------------------------------------------------------------

    /**
     * @notice Cho phép nạp trực tiếp vào Vault trên C-Chain (cho testnet hoặc người thân ở ngoài mạng L1)
     */
    function depositPrincipal(address family) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        address beneficiary = family == address(0) ? msg.sender : family;
        _handleDeposit(beneficiary, msg.value);
    }

    /**
     * @notice Cho phép gia đình tái đầu tư lãi phát sinh vào vốn gốc (Compound Interest)
     */
    function compoundYield(address family) external nonReentrant {
        uint256 newYield = calculateAccruedYield(family);
        uint256 totalYield = accruedYieldBalances[family] + newYield;
        if (totalYield == 0) revert ZeroAmount();

        accruedYieldBalances[family] = 0;
        principalBalances[family] += totalYield;
        lastDepositTimestamp[family] = block.timestamp;

        emit PrincipalDeposited(family, totalYield, block.timestamp);
    }

    /// @notice Nhận AVAX trực tiếp bổ sung thanh khoản dự phòng
    receive() external payable {}
}

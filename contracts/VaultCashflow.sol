// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ITeleporterMessenger.sol";

/**
 * @title VaultCashflow
 * @author Kinetix Team (UniHack - Avalanche Team1 Vietnam)
 * @notice Smart Contract chuyên biệt quản lý Tổng Kho Tài Sản & Dòng Tiền (Vault Treasury / Cashflow Core) trên Avalanche Family L1.
 * Đóng vai trò là "Cái Hũ Quản Lý Dòng Tiền" duy nhất:
 * 1. Độc quyền lưu giữ tài sản Native Token (AVAX Escrow) và quản lý số dư độc lập theo từng Hũ (`vaultId`).
 * 2. Phụ trách cơ chế Nạp tiền (`deposit`), tự động chia tách đệm thanh khoản L1 (bufferRatioBps) và vốn C-Chain.
 * 3. Phụ trách cơ chế Giải ngân (`executeWithdrawal`), chỉ duy nhất Controller (FamilyHub.sol) được phép phát lệnh.
 * 4. Tự động chuyển giao thông điệp Teleporter ICM sang FamilyYieldVault trên C-Chain (DEPOSIT và WITHDRAW).
 * 5. Tách biệt hoàn toàn tầng Quỹ Tiền (Treasury) khỏi tầng Quản Trị Quy Tắc (Policy / Governance).
 */
contract VaultCashflow is Ownable, Pausable, ReentrancyGuard {
    // -------------------------------------------------------------
    // ENUMS & STRUCTS
    // -------------------------------------------------------------

    /// @notice Loại hành động truyền qua cầu nối Teleporter
    enum BridgeAction {
        DEPOSIT,
        WITHDRAW
    }

    /// @notice Sổ cái tài chính của từng Hũ tiền
    struct VaultLedger {
        uint256 totalBalance;       // Tổng tài sản thực tế thuộc về Hũ này
        uint256 l1BufferBalance;    // Số dư đệm thanh khoản giữ tại Family L1 (0 gas)
        uint256 cChainPrincipal;    // Số vốn gốc đang sinh lời 8% APY trên Fuji C-Chain
        uint256 bufferRatioBps;     // Tỷ lệ giữ đệm L1 (1000 = 10%)
        bool isInitialized;         // Trạng thái đã khởi tạo hay chưa
    }

    // -------------------------------------------------------------
    // CUSTOM ERRORS
    // -------------------------------------------------------------
    error NotController();
    error ZeroAddress();
    error ZeroAmount();
    error VaultNotInitialized();
    error InsufficientVaultBalance(uint256 available, uint256 requested);
    error TransferFailed();

    // -------------------------------------------------------------
    // STATE VARIABLES
    // -------------------------------------------------------------

    /// @notice Hợp đồng điều khiển chính sách (FamilyHub.sol)
    address public controller;

    /// @notice Cấu hình tích hợp Avalanche Teleporter (ICM)
    ITeleporterMessenger public teleporterMessenger;
    bytes32 public cChainBlockchainId;
    address public yieldVaultAddress;

    /// @notice Sổ cái dòng tiền theo Hũ: vaultId => VaultLedger
    mapping(uint256 => VaultLedger) public ledgers;

    // -------------------------------------------------------------
    // EVENTS
    // -------------------------------------------------------------
    event ControllerUpdated(address indexed oldController, address indexed newController);
    event TeleporterConfigUpdated(address indexed messenger, bytes32 indexed cChainId, address indexed yieldVault);
    event VaultLedgerInitialized(uint256 indexed vaultId, uint256 bufferRatioBps);
    event FundsDeposited(
        uint256 indexed vaultId,
        address indexed depositor,
        uint256 totalAmount,
        uint256 toBuffer,
        uint256 toBridge
    );
    event FundsWithdrawn(
        uint256 indexed vaultId,
        address indexed recipient,
        uint256 amount,
        bool fullyFundedFromLocalBuffer
    );

    // -------------------------------------------------------------
    // MODIFIERS
    // -------------------------------------------------------------
    modifier onlyController() {
        if (msg.sender != controller && msg.sender != owner()) {
            revert NotController();
        }
        _;
    }

    // -------------------------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------------------------
    /**
     * @notice Khởi tạo kho dòng tiền VaultCashflow
     * @param _owner Người sở hữu quản trị tối cao
     * @param _controller Địa chỉ hợp đồng FamilyHub.sol (có thể cập nhật sau)
     * @param _teleporterMessenger Địa chỉ hợp đồng Avalanche Teleporter
     * @param _cChainBlockchainId Blockchain ID của Fuji C-Chain
     * @param _yieldVaultAddress Địa chỉ hợp đồng FamilyYieldVault trên C-Chain
     */
    constructor(
        address _owner,
        address _controller,
        address _teleporterMessenger,
        bytes32 _cChainBlockchainId,
        address _yieldVaultAddress
    ) Ownable(_owner) {
        if (_owner == address(0)) revert ZeroAddress();

        controller = _controller;
        teleporterMessenger = ITeleporterMessenger(_teleporterMessenger);
        cChainBlockchainId = _cChainBlockchainId;
        yieldVaultAddress = _yieldVaultAddress;
    }

    // -------------------------------------------------------------
    // 1. CẤU HÌNH & QUẢN TRỊ KHO TIỀN
    // -------------------------------------------------------------

    /**
     * @notice Cập nhật địa chỉ Controller (FamilyHub.sol)
     */
    function setController(address _newController) external onlyOwner {
        if (_newController == address(0)) revert ZeroAddress();
        address old = controller;
        controller = _newController;
        emit ControllerUpdated(old, _newController);
    }

    /**
     * @notice Cập nhật cấu hình Teleporter liên chuỗi
     */
    function setTeleporterConfig(
        address _messenger,
        bytes32 _cChainId,
        address _yieldVault
    ) external onlyOwner {
        teleporterMessenger = ITeleporterMessenger(_messenger);
        cChainBlockchainId = _cChainId;
        yieldVaultAddress = _yieldVault;
        emit TeleporterConfigUpdated(_messenger, _cChainId, _yieldVault);
    }

    /**
     * @notice Tạm dừng hoạt động nạp/rút khi có biến cố khẩn cấp
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Khôi phục hoạt động bình thường
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Khởi tạo sổ cái số dư cho một Hũ tiền mới (gọi bởi Controller khi tạo Hũ)
     */
    function initializeVaultLedger(
        uint256 vaultId,
        uint256 bufferRatioBps
    ) external onlyController {
        VaultLedger storage ledger = ledgers[vaultId];
        ledger.bufferRatioBps = bufferRatioBps;
        ledger.isInitialized = true;

        emit VaultLedgerInitialized(vaultId, bufferRatioBps);
    }

    // -------------------------------------------------------------
    // 2. CƠ CHẾ NẠP TIỀN TẬP TRUNG (UNIFIED DEPOSIT)
    // -------------------------------------------------------------

    /**
     * @notice Nạp Native AVAX vào Hũ, tự động chia tách đệm L1 và vốn gửi C-Chain sinh lời
     * @param vaultId Mã định danh Hũ tiền
     * @param depositor Địa chỉ người gửi tiền thực tế
     */
    function deposit(
        uint256 vaultId,
        address depositor
    ) external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert ZeroAmount();

        VaultLedger storage ledger = ledgers[vaultId];
        // Nếu chưa khởi tạo tường minh thì tự động kích hoạt với tỷ lệ đệm mặc định 10%
        if (!ledger.isInitialized) {
            ledger.bufferRatioBps = 1000;
            ledger.isInitialized = true;
        }

        // Tách số dư đệm L1 và vốn chuyển C-Chain không mất số lẻ làm tròn
        uint256 toBridge = (msg.value * (10000 - ledger.bufferRatioBps)) / 10000;
        uint256 toBuffer = msg.value - toBridge;

        ledger.l1BufferBalance += toBuffer;
        ledger.cChainPrincipal += toBridge;
        ledger.totalBalance += msg.value;

        emit FundsDeposited(vaultId, depositor, msg.value, toBuffer, toBridge);

        // Phát thông điệp Teleporter ICM sang FamilyYieldVault trên C-Chain
        if (
            toBridge > 0 &&
            address(teleporterMessenger) != address(0) &&
            yieldVaultAddress != address(0)
        ) {
            bytes memory payload = abi.encode(
                BridgeAction.DEPOSIT,
                vaultId,
                toBridge,
                depositor
            );

            TeleporterMessageInput memory messageInput = TeleporterMessageInput({
                destinationBlockchainID: cChainBlockchainId,
                destinationAddress: yieldVaultAddress,
                feeInfo: TeleporterFeeInfo({feeTokenAddress: address(0), amount: 0}),
                requiredGasLimit: 250000,
                allowedRelayerAddresses: new address[](0),
                message: payload
            });

            teleporterMessenger.sendCrossChainMessage(messageInput);
        }
    }

    // -------------------------------------------------------------
    // 3. CƠ CHẾ GIẢI NGÂN LÕI (UNIFIED WITHDRAWAL EXECUTION)
    // -------------------------------------------------------------

    /**
     * @notice Giải ngân Native AVAX từ Hũ về ví người nhận (Chỉ Controller có quyền gọi sau khi đã kiểm tra chính sách)
     * @param vaultId Mã Hũ tiền cần trích quỹ
     * @param recipient Địa chỉ ví thụ hưởng nhận tiền
     * @param amount Số tiền giải ngân
     * @return fullyFundedFromLocalBuffer Trả về true nếu đệm L1 tự trang trải đủ 100%
     */
    function executeWithdrawal(
        uint256 vaultId,
        address recipient,
        uint256 amount
    ) external nonReentrant whenNotPaused onlyController returns (bool fullyFundedFromLocalBuffer) {
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();

        VaultLedger storage ledger = ledgers[vaultId];
        if (amount > ledger.totalBalance) {
            revert InsufficientVaultBalance(ledger.totalBalance, amount);
        }

        // 1. Cập nhật trạng thái số dư nội bộ (Checks-Effects)
        ledger.totalBalance -= amount;

        if (ledger.l1BufferBalance >= amount) {
            ledger.l1BufferBalance -= amount;
            fullyFundedFromLocalBuffer = true;
        } else {
            uint256 availableLocal = ledger.l1BufferBalance;
            uint256 deficit = amount - availableLocal;

            ledger.l1BufferBalance = 0;
            ledger.cChainPrincipal = ledger.cChainPrincipal >= deficit
                ? ledger.cChainPrincipal - deficit
                : 0;
            fullyFundedFromLocalBuffer = false;

            // Bắn thông điệp Teleporter WITHDRAW sang C-Chain để khấu trừ vốn tương ứng
            if (
                deficit > 0 &&
                address(teleporterMessenger) != address(0) &&
                yieldVaultAddress != address(0)
            ) {
                bytes memory payload = abi.encode(
                    BridgeAction.WITHDRAW,
                    vaultId,
                    deficit,
                    recipient
                );

                TeleporterMessageInput memory messageInput = TeleporterMessageInput({
                    destinationBlockchainID: cChainBlockchainId,
                    destinationAddress: yieldVaultAddress,
                    feeInfo: TeleporterFeeInfo({feeTokenAddress: address(0), amount: 0}),
                    requiredGasLimit: 250000,
                    allowedRelayerAddresses: new address[](0),
                    message: payload
                });

                teleporterMessenger.sendCrossChainMessage(messageInput);
            }
        }

        // 2. Chuyển Native AVAX 0 gas trực tiếp cho người nhận (Interactions)
        (bool success, ) = payable(recipient).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit FundsWithdrawn(vaultId, recipient, amount, fullyFundedFromLocalBuffer);
        return fullyFundedFromLocalBuffer;
    }

    // -------------------------------------------------------------
    // 4. VIEW FUNCTIONS ĐỌC SỐ DƯ CHO DAPP
    // -------------------------------------------------------------

    function getVaultLedger(uint256 vaultId) external view returns (VaultLedger memory) {
        return ledgers[vaultId];
    }

    function getVaultBalances(
        uint256 vaultId
    )
        external
        view
        returns (
            uint256 total,
            uint256 l1Buffer,
            uint256 cChainPrincipal,
            uint256 bufferRatioBps
        )
    {
        VaultLedger storage ledger = ledgers[vaultId];
        return (
            ledger.totalBalance,
            ledger.l1BufferBalance,
            ledger.cChainPrincipal,
            ledger.bufferRatioBps
        );
    }

    /// @notice Nhận tiền gửi bổ sung thanh khoản dự phòng
    receive() external payable {}
}

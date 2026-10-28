// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/ITeleporterMessenger.sol";
import "./VaultCashflow.sol";

/**
 * @title FamilyHub
 * @author Kinetix Team (UniHack - Avalanche Team1 Vietnam)
 * @notice Hợp đồng quản trị tài chính đa không gian và Hũ động (Dynamic & Composable Multi-Space Vaults) trên Avalanche Family L1 (Gas = 0).
 * Kiến trúc Hũ Dòng Tiền Hợp Nhất (Unified Cashflow Engine):
 * 1. Lõi dòng tiền tập trung: Mọi Hũ đều nạp qua depositToVault và giải ngân qua _executeWithdrawal.
 * 2. Tự động chia tách tỷ lệ đệm thanh khoản cục bộ L1 (bufferRatioBps) và vốn gửi C-Chain sinh lời 8% APY.
 * 3. 4 Bộ Quy Tắc (RuleTemplate) đóng vai trò là các chính sách kích hoạt giải ngân khác nhau:
 *    - SHIELD (0): Rút nhỏ <= limit giải ngân tức thì; rút lớn cần M/N Guardians duyệt.
 *    - MILESTONE (1): Nhiệm vụ & Cột mốc (Chore-to-Earn - giải ngân thưởng khi task hoàn thành).
 *    - ROSCA (2): Góp vốn xoay vòng (Họ Hụi - giải ngân quỹ chu kỳ cho thành viên đến lượt).
 *    - SHARED_GOAL (3): Mục tiêu chung (Khóa giải ngân cho đến khi gom đủ targetGoalAmount + M/N duyệt).
 * 4. Đa chữ ký phân tầng (Tiered Multisig M/N) riêng biệt theo từng Hũ.
 * 5. Cơ chế Social Recovery khôi phục ví xã hội an toàn (hỗ trợ chuyển giao cả quyền creator).
 * 6. Cơ chế tạm dừng khẩn cấp (Pausable) bảo vệ tài sản gia đình khi có sự cố.
 */
contract FamilyHub is ReentrancyGuard, Pausable, ITeleporterReceiver {
    // -------------------------------------------------------------
    // ENUMS & STRUCTS
    // -------------------------------------------------------------

    /// @notice 4 Bộ Quy Tắc linh hoạt cho từng Hũ tiền
    enum RuleTemplate {
        SHIELD,      // 0: Bảo vệ & Trợ cấp (Rút nhỏ <= limit giải ngân tức thì; rút lớn cần M/N Guardians)
        MILESTONE,   // 1: Nhiệm vụ & Cột mốc (Chore-to-Earn - mở khóa thưởng khi hoàn thành task)
        ROSCA,       // 2: Góp vốn xoay vòng (Họ Hụi - đẩy C-Chain sinh lời, định kỳ nhận gốc + lãi)
        SHARED_GOAL  // 3: Mục tiêu chung (Góp tiền du lịch/mua sắm nhóm, đạt target mới mở khóa M/N)
    }

    /// @notice Loại hành động truyền qua cầu nối Teleporter
    enum BridgeAction {
        DEPOSIT,
        WITHDRAW
    }

    /// @notice Cấu trúc lưu trữ Hũ tiền động
    struct DynamicVault {
        uint256 vaultId;
        string name;
        address creator;
        RuleTemplate ruleType;
        uint256 totalBalance;       // Tổng tài sản trong Hũ
        uint256 l1BufferBalance;    // Số dư đệm giữ tại L1 để rút tức thì (<1s, 0 gas)
        uint256 cChainPrincipal;    // Số vốn đang gửi sinh lời bên Avalanche Fuji C-Chain
        uint256 bufferRatioBps;     // Tỷ lệ giữ lại L1 (VD: 1000 = 10% L1 / 90% C-Chain; 2000 = 20%)
        uint256 fastWithdrawLimit;  // Hạn mức rút nhanh không cần duyệt (áp dụng cho SHIELD)
        uint256 requiredApprovals;  // Số chữ ký Guardians cần thiết để duyệt lệnh rút lớn (M/N)
        address[] guardians;        // Danh sách ví có quyền ký duyệt trong Hũ này
        address[] beneficiaries;    // Danh sách người thụ hưởng / thành viên Hũ
        bool isActive;              // Trạng thái hoạt động
        // Cấu hình chính sách bổ sung cho từng loại Hũ:
        uint256 targetGoalAmount;        // Ngưỡng mục tiêu tiền cần gom (SHARED_GOAL)
        uint256 targetDeadline;          // Hạn chót mục tiêu (SHARED_GOAL)
        uint256 roscaRoundDuration;      // Chu kỳ mỗi vòng họ hụi tính bằng giây (ROSCA)
        uint256 roscaRoundContribution;  // Mức tiền mỗi người đóng mỗi kỳ (ROSCA)
        uint256 roscaCurrentRound;       // Chỉ số vòng hiện tại (ROSCA)
        uint256 roscaLastRoundTimestamp; // Thời điểm bắt đầu vòng hiện tại (ROSCA)
    }

    /// @notice Phiếu yêu cầu rút tiền lớn cần đa chữ ký
    struct WithdrawalRequest {
        uint256 requestId;
        uint256 vaultId;            // Gắn với Hũ tiền cụ thể
        address requester;          // Người yêu cầu rút tiền
        uint256 amount;             // Số tiền yêu cầu
        address recipient;          // Địa chỉ ví nhận tiền
        string reason;              // Mục đích rút tiền (hiển thị cho Guardians kiểm tra)
        uint256 approvalsCount;     // Số lượng Guardians đã ký duyệt
        uint256 deadline;           // Thời hạn hiệu lực của yêu cầu (48 giờ)
        bool executed;              // Trạng thái đã giải ngân hay chưa
    }

    /// @notice Nhiệm vụ việc nhà / cột mốc trong chương trình Chore-to-Earn
    struct Task {
        uint256 taskId;
        uint256 vaultId;            // Gắn với Hũ tiền cụ thể (RuleTemplate.MILESTONE)
        string title;               // Tên việc nhà hoặc cột mốc
        uint256 rewardAmount;       // Số tiền thưởng khi hoàn thành
        address assignee;           // Địa chỉ ví người thực hiện (con trẻ / thành viên)
        bool isCompleted;           // Đã báo cáo hoàn thành hay chưa
        bool isRewarded;            // Đã duyệt và chuyển thưởng hay chưa
    }

    /// @notice Phiếu yêu cầu khôi phục ví xã hội khi mất máy
    struct RecoveryRequest {
        uint256 vaultId;
        address oldWallet;
        address newWallet;
        uint256 approvalsCount;
        bool executed;
    }

    // -------------------------------------------------------------
    // CUSTOM ERRORS
    // -------------------------------------------------------------
    error NotFamilyAdmin();
    error NotVaultGuardian();
    error NotVaultBeneficiary();
    error ZeroAddress();
    error ZeroAmount();
    error VaultNotFound();
    error VaultInactive();
    error InvalidBufferRatio();
    error InvalidApprovalThreshold();
    error ExceedsFastLimit(uint256 amount, uint256 limit);
    error InsufficientLocalBuffer(uint256 available, uint256 requested);
    error InsufficientVaultBalance(uint256 available, uint256 requested);
    error RequestNotFound();
    error RequestAlreadyExecuted();
    error RequestExpired();
    error AlreadyApproved();
    error TaskNotFound();
    error TaskNotCompleted();
    error TaskAlreadyRewarded();
    error AssigneeMismatch();
    error OnlyTeleporterMessenger();
    error RecoveryAlreadyExecuted();
    error TransferFailed();
    error GoalNotReached(uint256 currentBalance, uint256 targetGoal);
    error RoscaRoundNotReady(uint256 timeRemaining);
    error InvalidRuleAction();

    // -------------------------------------------------------------
    // STATE VARIABLES
    // -------------------------------------------------------------

    /// @notice Người quản trị tối cao của Hub
    address public familyAdmin;

    /// @notice Bộ đếm tự tăng cho Hũ tiền động
    uint256 public vaultCounter;

    /// @notice Bộ đếm tự tăng cho yêu cầu rút tiền
    uint256 public requestCounter;

    /// @notice Bộ đếm tự tăng cho nhiệm vụ Chore-to-Earn
    uint256 public taskCounter;

    /// @notice Lưu trữ thông tin Hũ tiền động: vaultId => DynamicVault
    mapping(uint256 => DynamicVault) public vaults;

    /// @notice Danh sách Hũ mà một địa chỉ ví tham gia: userAddress => vaultId[]
    mapping(address => uint256[]) private _userVaults;

    /// @notice Kiểm tra quyền Guardian theo Hũ: vaultId => guardianAddress => bool
    mapping(uint256 => mapping(address => bool)) public isVaultGuardian;

    /// @notice Kiểm tra quyền Beneficiary theo Hũ: vaultId => beneficiaryAddress => bool
    mapping(uint256 => mapping(address => bool)) public isVaultBeneficiary;

    /// @notice Quản lý danh sách yêu cầu rút tiền: requestId => WithdrawalRequest
    mapping(uint256 => WithdrawalRequest) public withdrawalRequests;

    /// @notice Bản đồ chữ ký duyệt rút tiền: requestId => guardianAddress => bool
    mapping(uint256 => mapping(address => bool)) public hasApprovedRequest;

    /// @notice Quản lý danh sách nhiệm vụ Chore-to-Earn: taskId => Task
    mapping(uint256 => Task) public tasks;

    /// @notice Yêu cầu khôi phục ví xã hội: hash(vaultId, oldWallet, newWallet) => RecoveryRequest
    mapping(bytes32 => RecoveryRequest) public recoveryRequests;
    mapping(bytes32 => mapping(address => bool)) public hasApprovedRecovery;

    /// @notice Danh sách ví được cấp quyền tương tác mạng L1 khép kín
    mapping(address => bool) public isAllowlisted;

    /// @notice Cấu hình tích hợp Avalanche Teleporter
    ITeleporterMessenger public teleporterMessenger;
    bytes32 public cChainBlockchainId;
    address public yieldVaultAddress;

    /// @notice Hợp đồng chuyên biệt quản lý quỹ & dòng tiền (Vault Treasury / Cashflow Core)
    VaultCashflow public vaultCashflow;

    // -------------------------------------------------------------
    // EVENTS
    // -------------------------------------------------------------
    event VaultCreated(
        uint256 indexed vaultId,
        string name,
        address indexed creator,
        RuleTemplate ruleType,
        uint256 bufferRatioBps,
        uint256 requiredApprovals
    );

    event FundsDeposited(
        uint256 indexed vaultId,
        address indexed depositor,
        uint256 totalAmount,
        uint256 toBuffer,
        uint256 toBridge
    );

    event FastWithdrawalExecuted(
        uint256 indexed vaultId,
        address indexed recipient,
        uint256 amount
    );

    event WithdrawalRequested(
        uint256 indexed requestId,
        uint256 indexed vaultId,
        address indexed requester,
        uint256 amount,
        string reason,
        uint256 deadline
    );

    event WithdrawalApproved(
        uint256 indexed requestId,
        uint256 indexed vaultId,
        address indexed guardian,
        uint256 currentApprovals
    );

    event WithdrawalExecuted(
        uint256 indexed requestId,
        uint256 indexed vaultId,
        address indexed recipient,
        uint256 amount,
        bool fullyFundedFromLocalBuffer
    );

    event ChoreCreated(
        uint256 indexed taskId,
        uint256 indexed vaultId,
        string title,
        uint256 rewardAmount,
        address indexed assignee
    );

    event ChoreClaimed(uint256 indexed taskId, address indexed assignee);

    event ChoreRewarded(
        uint256 indexed taskId,
        uint256 indexed vaultId,
        address indexed assignee,
        uint256 rewardAmount
    );

    event MemberWalletRecovered(
        uint256 indexed vaultId,
        address indexed oldWallet,
        address indexed newWallet
    );

    event AllowlistStatusChanged(address indexed account, bool isAllowed);

    event GoalReached(uint256 indexed vaultId, uint256 currentBalance, uint256 targetGoalAmount);

    event RoscaRoundPaid(
        uint256 indexed vaultId,
        uint256 indexed roundIndex,
        address indexed recipient,
        uint256 payoutAmount
    );

    // -------------------------------------------------------------
    // MODIFIERS
    // -------------------------------------------------------------
    modifier onlyFamilyAdmin() {
        if (msg.sender != familyAdmin) revert NotFamilyAdmin();
        _;
    }

    modifier onlyVaultGuardian(uint256 vaultId) {
        if (!isVaultGuardian[vaultId][msg.sender] && msg.sender != familyAdmin) {
            revert NotVaultGuardian();
        }
        _;
    }

    modifier onlyVaultBeneficiary(uint256 vaultId) {
        if (
            !isVaultBeneficiary[vaultId][msg.sender] &&
            msg.sender != vaults[vaultId].creator &&
            msg.sender != familyAdmin
        ) {
            revert NotVaultBeneficiary();
        }
        _;
    }

    // -------------------------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------------------------
    /**
     * @notice Khởi tạo hợp đồng FamilyHub trên Avalanche Family L1
     * @param _admin Địa chỉ người quản trị
     * @param _teleporterMessenger Địa chỉ hợp đồng Teleporter Messenger
     * @param _cChainBlockchainId Mã Blockchain ID của C-Chain
     * @param _yieldVaultAddress Địa chỉ hợp đồng FamilyYieldVault trên C-Chain
     */
    constructor(
        address _admin,
        address _teleporterMessenger,
        bytes32 _cChainBlockchainId,
        address _yieldVaultAddress
    ) {
        if (_admin == address(0)) revert ZeroAddress();

        familyAdmin = _admin;
        isAllowlisted[_admin] = true;

        teleporterMessenger = ITeleporterMessenger(_teleporterMessenger);
        cChainBlockchainId = _cChainBlockchainId;
        yieldVaultAddress = _yieldVaultAddress;
    }

    // -------------------------------------------------------------
    // 1. CẤU HÌNH & QUẢN TRỊ TRUNG TÂM (EMERGENCY CONTROLS)
    // -------------------------------------------------------------

    /**
     * @notice Tạm dừng hoạt động hợp đồng khi có sự cố khẩn cấp
     */
    function pause() external onlyFamilyAdmin {
        _pause();
    }

    /**
     * @notice Khôi phục hoạt động hợp đồng
     */
    function unpause() external onlyFamilyAdmin {
        _unpause();
    }

    /**
     * @notice Cập nhật cấu hình cầu nối Teleporter và Vault C-Chain
     */
    function setTeleporterConfig(
        address _messenger,
        bytes32 _cChainId,
        address _vault
    ) external onlyFamilyAdmin {
        teleporterMessenger = ITeleporterMessenger(_messenger);
        cChainBlockchainId = _cChainId;
        yieldVaultAddress = _vault;
    }

    /**
     * @notice Thiết lập hợp đồng chuyên biệt quản lý quỹ & dòng tiền (VaultCashflow)
     */
    function setVaultCashflow(address _cashflow) external onlyFamilyAdmin {
        if (_cashflow == address(0)) revert ZeroAddress();
        vaultCashflow = VaultCashflow(payable(_cashflow));
        isAllowlisted[_cashflow] = true;
    }

    /**
     * @notice Cập nhật trạng thái Allowlist cho địa chỉ ví
     */
    function setAllowlistStatus(address account, bool status) external onlyFamilyAdmin {
        if (account == address(0)) revert ZeroAddress();
        isAllowlisted[account] = status;
        emit AllowlistStatusChanged(account, status);
    }

    // -------------------------------------------------------------
    // 2. KHỞI TẠO & QUẢN LÝ HŨ TIỀN ĐỘNG (DYNAMIC VAULTS)
    // -------------------------------------------------------------

    /**
     * @notice Khởi tạo Hũ tiền mới với Bộ Quy Tắc tùy biến (Chữ ký chuẩn 7 tham số tương thích 100%)
     */
    function createCustomVault(
        string calldata name,
        RuleTemplate ruleType,
        uint256 bufferRatioBps,
        uint256 fastWithdrawLimit,
        uint256 requiredApprovals,
        address[] calldata guardians,
        address[] calldata beneficiaries
    ) external returns (uint256 vaultId) {
        return createAdvancedVault(
            name,
            ruleType,
            bufferRatioBps,
            fastWithdrawLimit,
            requiredApprovals,
            guardians,
            beneficiaries,
            0, // targetGoalAmount mặc định
            0, // targetDeadline mặc định
            0, // roscaRoundDuration mặc định
            0  // roscaRoundContribution mặc định
        );
    }

    /**
     * @notice Khởi tạo Hũ tiền nâng cao hỗ trợ đầy đủ các tham số mục tiêu hoặc chu kỳ họ hụi
     */
    function createAdvancedVault(
        string calldata name,
        RuleTemplate ruleType,
        uint256 bufferRatioBps,
        uint256 fastWithdrawLimit,
        uint256 requiredApprovals,
        address[] calldata guardians,
        address[] calldata beneficiaries,
        uint256 targetGoalAmount,
        uint256 targetDeadline,
        uint256 roscaRoundDuration,
        uint256 roscaRoundContribution
    ) public returns (uint256 vaultId) {
        if (bytes(name).length == 0) revert ZeroAmount();
        if (bufferRatioBps > 10000) revert InvalidBufferRatio();
        if (guardians.length == 0) revert InvalidApprovalThreshold();
        if (requiredApprovals == 0 || requiredApprovals > guardians.length) {
            revert InvalidApprovalThreshold();
        }

        vaultCounter++;
        vaultId = vaultCounter;

        DynamicVault storage newVault = vaults[vaultId];
        newVault.vaultId = vaultId;
        newVault.name = name;
        newVault.creator = msg.sender;
        newVault.ruleType = ruleType;
        newVault.totalBalance = 0;
        newVault.l1BufferBalance = 0;
        newVault.cChainPrincipal = 0;
        newVault.bufferRatioBps = bufferRatioBps;
        newVault.fastWithdrawLimit = fastWithdrawLimit;
        newVault.requiredApprovals = requiredApprovals;
        newVault.guardians = guardians;
        newVault.beneficiaries = beneficiaries;
        newVault.isActive = true;

        newVault.targetGoalAmount = targetGoalAmount;
        newVault.targetDeadline = targetDeadline;
        newVault.roscaRoundDuration = roscaRoundDuration;
        newVault.roscaRoundContribution = roscaRoundContribution;
        newVault.roscaCurrentRound = 0;
        newVault.roscaLastRoundTimestamp = block.timestamp;

        // Đăng ký quyền Guardians và ghi nhận Hũ
        for (uint256 i = 0; i < guardians.length; i++) {
            address g = guardians[i];
            if (g == address(0)) revert ZeroAddress();
            isVaultGuardian[vaultId][g] = true;
            isAllowlisted[g] = true;
            _registerUserVault(g, vaultId);
        }

        // Đăng ký quyền Beneficiaries và ghi nhận Hũ
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            address b = beneficiaries[i];
            if (b == address(0)) revert ZeroAddress();
            isVaultBeneficiary[vaultId][b] = true;
            isAllowlisted[b] = true;
            _registerUserVault(b, vaultId);
        }

        // Đăng ký creator
        _registerUserVault(msg.sender, vaultId);

        // Khởi tạo sổ cái trên VaultCashflow nếu đã liên kết kho tiền
        if (address(vaultCashflow) != address(0)) {
            vaultCashflow.initializeVaultLedger(vaultId, bufferRatioBps);
        }

        emit VaultCreated(
            vaultId,
            name,
            msg.sender,
            ruleType,
            bufferRatioBps,
            requiredApprovals
        );

        return vaultId;
    }

    function _registerUserVault(address user, uint256 vaultId) internal {
        uint256[] storage uVaults = _userVaults[user];
        for (uint256 i = 0; i < uVaults.length; i++) {
            if (uVaults[i] == vaultId) return;
        }
        uVaults.push(vaultId);
    }

    // -------------------------------------------------------------
    // 3. NẠP TIỀN & ĐIỀU CHUYỂN VỐN (UNIFIED CASHFLOW DEPOSIT ENGINE)
    // -------------------------------------------------------------

    /**
     * @notice Nạp tiền tập trung vào Hũ và tự động tách đệm thanh khoản L1 / C-Chain theo bufferRatioBps
     * @param vaultId Mã Hũ tiền nạp
     */
    function depositToVault(uint256 vaultId) external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert ZeroAmount();
        DynamicVault storage vault = vaults[vaultId];
        if (!vault.isActive) revert VaultInactive();

        // Phân tách số dư đệm L1 và vốn sinh lời C-Chain chính xác tuyệt đối
        uint256 toBridge = (msg.value * (10000 - vault.bufferRatioBps)) / 10000;
        uint256 toBuffer = msg.value - toBridge;

        vault.l1BufferBalance += toBuffer;
        vault.cChainPrincipal += toBridge;
        vault.totalBalance += msg.value;

        // Nếu đã kết nối kho tiền chuyên biệt VaultCashflow -> chuyển tiếp dòng tiền quản lý tập trung
        if (address(vaultCashflow) != address(0)) {
            vaultCashflow.deposit{value: msg.value}(vaultId, msg.sender);
        } else {
            // Chế độ Standalone Fallback: Bắn thông điệp Teleporter sang C-Chain
            if (
                toBridge > 0 &&
                address(teleporterMessenger) != address(0) &&
                yieldVaultAddress != address(0)
            ) {
                bytes memory payload = abi.encode(
                    BridgeAction.DEPOSIT,
                    vaultId,
                    toBridge,
                    msg.sender
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

        emit FundsDeposited(vaultId, msg.sender, msg.value, toBuffer, toBridge);

        // Kiểm tra nếu là Hũ SHARED_GOAL vừa chạm mốc mục tiêu
        if (vault.ruleType == RuleTemplate.SHARED_GOAL && vault.targetGoalAmount > 0) {
            if (vault.totalBalance >= vault.targetGoalAmount) {
                emit GoalReached(vaultId, vault.totalBalance, vault.targetGoalAmount);
            }
        }
    }

    // -------------------------------------------------------------
    // 4. LÕI GIẢI NGÂN HỢP NHẤT (UNIFIED CASHFLOW WITHDRAWAL ENGINE)
    // -------------------------------------------------------------

    function _getVaultTotal(uint256 vaultId) internal view returns (uint256) {
        if (address(vaultCashflow) != address(0)) {
            (uint256 total, , , ) = vaultCashflow.getVaultBalances(vaultId);
            return total;
        }
        return vaults[vaultId].totalBalance;
    }

    function _getVaultL1Buffer(uint256 vaultId) internal view returns (uint256) {
        if (address(vaultCashflow) != address(0)) {
            (, uint256 l1Buf, , ) = vaultCashflow.getVaultBalances(vaultId);
            return l1Buf;
        }
        return vaults[vaultId].l1BufferBalance;
    }

    /**
     * @dev Hàm nội bộ duy nhất phụ trách mọi hành động giải ngân trong hệ thống
     * Bảo đảm: Kiểm tra khả năng chi trả -> Khấu trừ số dư an toàn -> Chuyển AVAX 0 gas -> Đồng bộ Teleporter C-Chain
     */
    function _executeWithdrawal(
        uint256 vaultId,
        address recipient,
        uint256 amount
    ) internal returns (bool fullyFundedFromLocalBuffer) {
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();

        uint256 currentTotal = _getVaultTotal(vaultId);
        if (amount > currentTotal) {
            revert InsufficientVaultBalance(currentTotal, amount);
        }

        DynamicVault storage vault = vaults[vaultId];

        // Cập nhật Checks-Effects-Interactions (CEI)
        if (vault.totalBalance >= amount) {
            vault.totalBalance -= amount;
        } else {
            vault.totalBalance = 0;
        }

        if (address(vaultCashflow) != address(0)) {
            // Cập nhật trạng thái đệm L1 & C-Chain nội bộ
            if (vault.l1BufferBalance >= amount) {
                vault.l1BufferBalance -= amount;
            } else {
                uint256 deficit = amount - vault.l1BufferBalance;
                vault.l1BufferBalance = 0;
                vault.cChainPrincipal = vault.cChainPrincipal >= deficit
                    ? vault.cChainPrincipal - deficit
                    : 0;
            }

            // Ủy thác toàn bộ việc trích quỹ và chuyển giao Native AVAX cho kho tiền chuyên biệt
            fullyFundedFromLocalBuffer = vaultCashflow.executeWithdrawal(vaultId, recipient, amount);
        } else {
            // Chế độ Standalone Fallback: Tự giải ngân từ số dư của FamilyHub
            if (vault.l1BufferBalance >= amount) {
                vault.l1BufferBalance -= amount;
                fullyFundedFromLocalBuffer = true;
            } else {
                uint256 availableLocal = vault.l1BufferBalance;
                uint256 deficit = amount - availableLocal;

                vault.l1BufferBalance = 0;
                vault.cChainPrincipal = vault.cChainPrincipal >= deficit
                    ? vault.cChainPrincipal - deficit
                    : 0;
                fullyFundedFromLocalBuffer = false;

                // Gửi thông điệp Teleporter sang C-Chain để giảm trạng thái vốn gốc tương ứng
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

            // Giải ngân 100% Native Token tại chỗ cho người nhận
            (bool success, ) = payable(recipient).call{value: amount}("");
            if (!success) revert TransferFailed();
        }

        return fullyFundedFromLocalBuffer;
    }

    // -------------------------------------------------------------
    // 5. CÁC CHÍNH SÁCH KÍCH HOẠT GIẢI NGÂN (COMPOSABLE POLICIES)
    // -------------------------------------------------------------

    // --- POLICY A: RÚT TIỀN NHANH (FAST WITHDRAWAL <= LIMIT, ÁP DỤNG CHO SHIELD) ---
    function fastWithdraw(
        uint256 vaultId,
        uint256 amount
    ) external nonReentrant whenNotPaused onlyVaultBeneficiary(vaultId) {
        DynamicVault storage vault = vaults[vaultId];
        if (!vault.isActive) revert VaultInactive();

        if (amount > vault.fastWithdrawLimit) {
            revert ExceedsFastLimit(amount, vault.fastWithdrawLimit);
        }

        // Rút nhanh bắt buộc phải có sẵn trong đệm L1 để đảm bảo tính tức thì
        uint256 currentL1 = _getVaultL1Buffer(vaultId);
        if (currentL1 < amount) {
            revert InsufficientLocalBuffer(currentL1, amount);
        }

        _executeWithdrawal(vaultId, msg.sender, amount);
        emit FastWithdrawalExecuted(vaultId, msg.sender, amount);
    }

    // --- POLICY B: ĐA CHỮ KÝ PHÂN TẦNG (TIERED MULTISIG M/N CHO LỆNH RÚT LỚN) ---
    function requestLargeWithdrawal(
        uint256 vaultId,
        uint256 amount,
        string calldata reason
    ) external whenNotPaused onlyVaultBeneficiary(vaultId) returns (uint256 requestId) {
        if (amount == 0) revert ZeroAmount();
        DynamicVault storage vault = vaults[vaultId];
        if (!vault.isActive) revert VaultInactive();
        uint256 total = _getVaultTotal(vaultId);
        if (amount > total) {
            revert InsufficientVaultBalance(total, amount);
        }

        // Nếu là Hũ SHARED_GOAL, chỉ cho phép tạo yêu cầu khi đã đạt mục tiêu hoặc hết hạn
        if (vault.ruleType == RuleTemplate.SHARED_GOAL && vault.targetGoalAmount > 0) {
            if (total < vault.targetGoalAmount && block.timestamp < vault.targetDeadline) {
                revert GoalNotReached(total, vault.targetGoalAmount);
            }
        }

        requestCounter++;
        requestId = requestCounter;

        uint256 deadline = block.timestamp + 48 hours;

        withdrawalRequests[requestId] = WithdrawalRequest({
            requestId: requestId,
            vaultId: vaultId,
            requester: msg.sender,
            amount: amount,
            recipient: msg.sender,
            reason: reason,
            approvalsCount: 0,
            deadline: deadline,
            executed: false
        });

        emit WithdrawalRequested(
            requestId,
            vaultId,
            msg.sender,
            amount,
            reason,
            deadline
        );

        return requestId;
    }

    function approveWithdrawal(uint256 requestId) external nonReentrant whenNotPaused {
        WithdrawalRequest storage req = withdrawalRequests[requestId];
        if (req.requestId == 0) revert RequestNotFound();
        if (req.executed) revert RequestAlreadyExecuted();
        if (block.timestamp > req.deadline) revert RequestExpired();

        uint256 vaultId = req.vaultId;
        if (!isVaultGuardian[vaultId][msg.sender] && msg.sender != familyAdmin) {
            revert NotVaultGuardian();
        }

        if (hasApprovedRequest[requestId][msg.sender]) revert AlreadyApproved();

        hasApprovedRequest[requestId][msg.sender] = true;
        req.approvalsCount++;

        emit WithdrawalApproved(requestId, vaultId, msg.sender, req.approvalsCount);

        DynamicVault storage vault = vaults[vaultId];
        if (req.approvalsCount >= vault.requiredApprovals) {
            req.executed = true;

            bool fullyFunded = _executeWithdrawal(vaultId, req.recipient, req.amount);
            emit WithdrawalExecuted(requestId, vaultId, req.recipient, req.amount, fullyFunded);
        }
    }

    // --- POLICY C: CHORE-TO-EARN (ÁP DỤNG CHO MILESTONE VAULTS) ---
    function createChore(
        uint256 vaultId,
        string calldata title,
        uint256 rewardAmount,
        address assignee
    ) external onlyVaultGuardian(vaultId) returns (uint256 taskId) {
        if (rewardAmount == 0) revert ZeroAmount();
        if (assignee == address(0)) revert ZeroAddress();
        DynamicVault storage vault = vaults[vaultId];
        if (!vault.isActive) revert VaultInactive();
        uint256 currentTotal = _getVaultTotal(vaultId);
        if (rewardAmount > currentTotal) revert InsufficientVaultBalance(currentTotal, rewardAmount);

        taskCounter++;
        taskId = taskCounter;

        tasks[taskId] = Task({
            taskId: taskId,
            vaultId: vaultId,
            title: title,
            rewardAmount: rewardAmount,
            assignee: assignee,
            isCompleted: false,
            isRewarded: false
        });

        emit ChoreCreated(taskId, vaultId, title, rewardAmount, assignee);
        return taskId;
    }

    function claimChoreCompleted(uint256 taskId) external {
        Task storage task = tasks[taskId];
        if (task.taskId == 0) revert TaskNotFound();
        if (msg.sender != task.assignee) revert AssigneeMismatch();

        task.isCompleted = true;
        emit ChoreClaimed(taskId, msg.sender);
    }

    function verifyAndRewardChore(uint256 taskId) external nonReentrant whenNotPaused {
        Task storage task = tasks[taskId];
        if (task.taskId == 0) revert TaskNotFound();
        if (!task.isCompleted) revert TaskNotCompleted();
        if (task.isRewarded) revert TaskAlreadyRewarded();

        uint256 vaultId = task.vaultId;
        if (!isVaultGuardian[vaultId][msg.sender] && msg.sender != familyAdmin) {
            revert NotVaultGuardian();
        }

        task.isRewarded = true;

        // Giải ngân thông qua hàm lõi hợp nhất
        _executeWithdrawal(vaultId, task.assignee, task.rewardAmount);
        emit ChoreRewarded(taskId, vaultId, task.assignee, task.rewardAmount);
    }

    // --- POLICY D: GÓP VỐN XOAY VÒNG HỌ HỤI (ÁP DỤNG CHO ROSCA VAULTS) ---
    /**
     * @notice Giải ngân quỹ kỳ cho thành viên đến lượt của Hũ ROSCA
     */
    function payoutRoscaRound(uint256 vaultId) external nonReentrant whenNotPaused {
        DynamicVault storage vault = vaults[vaultId];
        if (!vault.isActive) revert VaultInactive();
        if (vault.ruleType != RuleTemplate.ROSCA) revert InvalidRuleAction();

        // Kiểm tra thời gian đã tới kỳ giải ngân
        if (vault.roscaRoundDuration > 0) {
            uint256 nextRoundTime = vault.roscaLastRoundTimestamp + vault.roscaRoundDuration;
            if (block.timestamp < nextRoundTime) {
                revert RoscaRoundNotReady(nextRoundTime - block.timestamp);
            }
        }

        if (vault.beneficiaries.length == 0) revert ZeroAmount();

        // Xác định người thụ hưởng của kỳ này theo thứ tự xoay vòng
        uint256 turnIndex = vault.roscaCurrentRound % vault.beneficiaries.length;
        address roundRecipient = vault.beneficiaries[turnIndex];

        // Số tiền giải ngân của kỳ (mặc định lấy mức đóng * số thành viên, hoặc số dư khả dụng)
        uint256 currentTotal = _getVaultTotal(vaultId);
        uint256 payoutAmount = vault.roscaRoundContribution > 0
            ? vault.roscaRoundContribution * vault.beneficiaries.length
            : currentTotal;

        if (payoutAmount > currentTotal) {
            payoutAmount = currentTotal;
        }

        if (payoutAmount == 0) revert ZeroAmount();

        // Cập nhật vòng quay
        uint256 currentRound = vault.roscaCurrentRound;
        vault.roscaCurrentRound++;
        vault.roscaLastRoundTimestamp = block.timestamp;

        // Giải ngân qua hàm lõi
        _executeWithdrawal(vaultId, roundRecipient, payoutAmount);
        emit RoscaRoundPaid(vaultId, currentRound, roundRecipient, payoutAmount);
    }

    // -------------------------------------------------------------
    // 6. SOCIAL RECOVERY CHO THÀNH VIÊN THEO HŨ (BẢO VỆ CẢ CREATOR)
    // -------------------------------------------------------------

    /**
     * @notice Khôi phục ví xã hội khi thành viên bị mất máy, chuyển giao trọn vẹn quyền hạn
     */
    function recoverMemberWallet(
        uint256 vaultId,
        address oldWallet,
        address newWallet
    ) external onlyVaultGuardian(vaultId) {
        if (oldWallet == address(0) || newWallet == address(0)) revert ZeroAddress();
        DynamicVault storage vault = vaults[vaultId];
        if (!vault.isActive) revert VaultInactive();

        bytes32 reqHash = keccak256(abi.encodePacked(vaultId, oldWallet, newWallet));
        RecoveryRequest storage req = recoveryRequests[reqHash];

        if (req.executed) revert RecoveryAlreadyExecuted();

        if (req.vaultId == 0) {
            req.vaultId = vaultId;
            req.oldWallet = oldWallet;
            req.newWallet = newWallet;
        }

        if (hasApprovedRecovery[reqHash][msg.sender]) revert AlreadyApproved();
        hasApprovedRecovery[reqHash][msg.sender] = true;
        req.approvalsCount++;

        // Khi đủ số lượng Guardians của Hũ xác nhận
        if (req.approvalsCount >= vault.requiredApprovals) {
            req.executed = true;

            // 1. Chuyển giao vai trò Creator nếu ví bị mất là người tạo Hũ
            if (vault.creator == oldWallet) {
                vault.creator = newWallet;
            }

            // 2. Chuyển quyền Beneficiary nếu có
            if (isVaultBeneficiary[vaultId][oldWallet]) {
                isVaultBeneficiary[vaultId][oldWallet] = false;
                isVaultBeneficiary[vaultId][newWallet] = true;
                _registerUserVault(newWallet, vaultId);
            }

            // 3. Chuyển quyền Guardian nếu có
            if (isVaultGuardian[vaultId][oldWallet]) {
                isVaultGuardian[vaultId][oldWallet] = false;
                isVaultGuardian[vaultId][newWallet] = true;
                _registerUserVault(newWallet, vaultId);
            }

            isAllowlisted[newWallet] = true;
            emit MemberWalletRecovered(vaultId, oldWallet, newWallet);
        }
    }

    // -------------------------------------------------------------
    // 7. CALLBACK TELEPORTER (TIẾP NHẬN PHẢN HỒI TỪ C-CHAIN)
    // -------------------------------------------------------------

    function receiveTeleporterMessage(
        bytes32 /* originChainID */,
        address /* originSenderAddress */,
        bytes calldata /* message */
    ) external view override {
        if (address(teleporterMessenger) != address(0)) {
            if (msg.sender != address(teleporterMessenger)) revert OnlyTeleporterMessenger();
        }
    }

    // -------------------------------------------------------------
    // 8. GETTER VIEW FUNCTIONS CHO DAPP
    // -------------------------------------------------------------

    function getVault(uint256 vaultId) external view returns (DynamicVault memory) {
        DynamicVault memory vault = vaults[vaultId];
        if (address(vaultCashflow) != address(0)) {
            (uint256 total, uint256 l1Buf, uint256 cPrin, ) = vaultCashflow.getVaultBalances(vaultId);
            vault.totalBalance = total;
            vault.l1BufferBalance = l1Buf;
            vault.cChainPrincipal = cPrin;
        }
        return vault;
    }

    function getUserVaultIds(address user) external view returns (uint256[] memory) {
        return _userVaults[user];
    }

    function getVaultGuardians(uint256 vaultId) external view returns (address[] memory) {
        return vaults[vaultId].guardians;
    }

    function getVaultBeneficiaries(uint256 vaultId) external view returns (address[] memory) {
        return vaults[vaultId].beneficiaries;
    }

    function getVaultOverview(
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
        if (address(vaultCashflow) != address(0)) {
            return vaultCashflow.getVaultBalances(vaultId);
        }
        DynamicVault storage vault = vaults[vaultId];
        return (
            vault.totalBalance,
            vault.l1BufferBalance,
            vault.cChainPrincipal,
            vault.bufferRatioBps
        );
    }

    /// @notice Nhận AVAX trực tiếp bổ sung bộ đệm
    receive() external payable {}
}

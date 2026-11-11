// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/ITeleporterMessenger.sol";
import "./VaultCashflow.sol";

/**
 * @title FamilyHub
 * @notice T1 Fuji: AVAX cùng chain, SHIELD/goal dùng quorum, nhiệm vụ giữ chỗ vốn,
 * ROSCA đóng đủ kỳ. Bridge, ERC20 và real yield chưa được bật.
 */
contract FamilyHub is ReentrancyGuard, Pausable, ITeleporterReceiver {
    // -------------------------------------------------------------
    // ENUMS & STRUCTS
    // -------------------------------------------------------------

    /// @notice 4 Bộ Quy Tắc linh hoạt cho từng Hũ tiền
    enum RuleTemplate {
        SHIELD, // 0: Bảo vệ & Trợ cấp (Rút nhỏ <= limit giải ngân tức thì; rút lớn cần M/N Guardians)
        MILESTONE, // 1: Nhiệm vụ & Cột mốc (Chore-to-Earn - mở khóa thưởng khi hoàn thành task)
        ROSCA, // 2: Góp vốn xoay vòng (Họ Hụi - đóng đủ khoản rồi giải ngân theo kỳ)
        SHARED_GOAL // 3: Mục tiêu chung (Góp tiền du lịch/mua sắm nhóm, đạt target mới mở khóa M/N)
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
        uint256 totalBalance; // Tổng tài sản trong Hũ
        uint256 l1BufferBalance; // Số dư tài sản trên cùng chain Hub
        uint256 cChainPrincipal; // Luôn bằng 0 trong T1, giữ trường ABI tương thích
        uint256 bufferRatioBps; // Chính sách 0–10000 bps; số dư thực phụ thuộc tài sản đã nhận
        uint256 fastWithdrawLimit; // Hạn mức rút nhanh không cần duyệt (áp dụng cho SHIELD)
        uint256 requiredApprovals; // Số chữ ký Guardians cần thiết để duyệt lệnh rút lớn (M/N)
        address[] guardians; // Danh sách ví có quyền ký duyệt trong Hũ này
        address[] beneficiaries; // Danh sách người thụ hưởng / thành viên Hũ
        bool isActive; // Trạng thái hoạt động
        // Cấu hình chính sách bổ sung cho từng loại Hũ:
        uint256 targetGoalAmount; // Ngưỡng mục tiêu tiền cần gom (SHARED_GOAL)
        uint256 targetDeadline; // Hạn chót mục tiêu (SHARED_GOAL)
        uint256 roscaRoundDuration; // Chu kỳ mỗi vòng họ hụi tính bằng giây (ROSCA)
        uint256 roscaRoundContribution; // Mức tiền mỗi người đóng mỗi kỳ (ROSCA)
        uint256 roscaCurrentRound; // Chỉ số vòng hiện tại (ROSCA)
        uint256 roscaLastRoundTimestamp; // Thời điểm bắt đầu vòng hiện tại (ROSCA)
    }

    /// @notice Phiếu yêu cầu rút tiền lớn cần đa chữ ký
    struct WithdrawalRequest {
        uint256 requestId;
        uint256 vaultId; // Gắn với Hũ tiền cụ thể
        address requester; // Người yêu cầu rút tiền
        uint256 amount; // Số tiền yêu cầu
        address recipient; // Địa chỉ ví nhận tiền
        string reason; // Mục đích rút tiền (hiển thị cho Guardians kiểm tra)
        uint256 approvalsCount; // Số lượng Guardians đã ký duyệt
        uint256 deadline; // Thời hạn hiệu lực của yêu cầu (48 giờ)
        bool executed; // Trạng thái đã giải ngân hay chưa
    }

    /// @notice Nhiệm vụ việc nhà / cột mốc trong chương trình Chore-to-Earn
    struct Task {
        uint256 taskId;
        uint256 vaultId; // Gắn với Hũ tiền cụ thể (RuleTemplate.MILESTONE)
        string title; // Tên việc nhà hoặc cột mốc
        uint256 rewardAmount; // Số tiền thưởng khi hoàn thành
        address assignee; // Địa chỉ ví người thực hiện (con trẻ / thành viên)
        bool isCompleted; // Đã báo cáo hoàn thành hay chưa
        bool isRewarded; // Đã duyệt và chuyển thưởng hay chưa
    }

    /// @notice Phiếu yêu cầu khôi phục ví xã hội khi mất máy
    struct RecoveryRequest {
        uint256 vaultId;
        address oldWallet;
        address newWallet;
        uint256 approvalsCount;
        bool executed;
    }

    /// @notice Đề nghị thêm một thành viên workspace đã allowlist vào Hũ.
    struct MembershipChangeRequest {
        uint256 vaultId;
        address member;
        bool guardianRole;
        uint256 epoch;
        uint256 approvalsCount;
        uint256 deadline;
        bool executed;
    }

    // -------------------------------------------------------------
    // CUSTOM ERRORS
    // -------------------------------------------------------------
    error NotAllowlisted();
    error DuplicateMember();
    error ConfigurationLocked();
    error FeatureDisabled();
    error StaleAuthorization();
    error InvalidRecovery();
    error IncompleteRoscaRound();
    error RoscaCycleEnded();
    error TaskCancelled();
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
    error ExceedsDailyLimit(uint256 requested, uint256 remainingToday);
    error RoscaAlreadyContributed();
    error RoscaContributionMismatch(uint256 provided, uint256 required);
    error InvalidMemberAddition();
    error MembershipLimitReached();

    // -------------------------------------------------------------
    // STATE VARIABLES
    // -------------------------------------------------------------

    /// @notice Người quản trị tối cao của Hub
    string public constant deploymentVersion = "2.1.0-t1";
    bool public constant crossChainEnabled = false;
    bool public constant yieldEnabled = false;
    address public familyAdmin;
    mapping(uint256 => uint256) public membershipEpoch;
    mapping(uint256 => uint256) public requestEpoch;
    mapping(uint256 => uint256) public reservedRewards;
    mapping(uint256 => bool) public cancelledTasks;
    mapping(uint256 => mapping(address => address)) public recoveredWallets;
    mapping(uint256 => mapping(uint256 => uint256)) public taskApprovalCount;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public taskApprovals;
    event ChoreApproved(uint256 indexed taskId, address indexed guardian, uint256 approvals);
    event ChoreCancelled(uint256 indexed taskId);
    event MembershipEpochChanged(uint256 indexed vaultId, uint256 epoch);
    event VaultMemberAdditionApproved(
        uint256 indexed vaultId,
        bytes32 indexed proposalId,
        address indexed member,
        bool guardianRole,
        uint256 epoch,
        address approver,
        uint256 approvalsCount,
        uint256 requiredApprovals,
        uint256 deadline
    );
    event VaultMemberAdded(
        uint256 indexed vaultId,
        bytes32 indexed proposalId,
        address indexed member,
        bool guardianRole,
        uint256 guardianCount,
        uint256 requiredApprovals,
        uint256 epoch
    );

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
    mapping(uint256 => Task) private _tasks;

    /// @notice Yêu cầu khôi phục ví xã hội: hash(vaultId, oldWallet, newWallet) => RecoveryRequest
    mapping(bytes32 => RecoveryRequest) public recoveryRequests;
    mapping(bytes32 => mapping(address => bool)) public hasApprovedRecovery;
    mapping(bytes32 => MembershipChangeRequest) public membershipChangeRequests;
    mapping(bytes32 => mapping(address => bool)) public hasApprovedMembershipChange;

    /// @notice Danh sách ví được cấp quyền tương tác mạng L1 khép kín
    mapping(address => bool) public isAllowlisted;

    /// @notice Cấu hình tích hợp Avalanche Teleporter
    ITeleporterMessenger public teleporterMessenger;
    bytes32 public cChainBlockchainId;
    address public yieldVaultAddress;

    /// @notice Hợp đồng chuyên biệt quản lý quỹ & dòng tiền (Vault Treasury / Cashflow Core)
    VaultCashflow public vaultCashflow;

    /// @notice Hợp đồng Trusted Forwarder EIP-2771
    address public trustedForwarder;

    /// @notice Domain Separator chuẩn EIP-712
    bytes32 public DOMAIN_SEPARATOR;

    /// @notice Typehash định nghĩa cấu trúc xác nhận rút tiền EIP-712
    bytes32 public constant WITHDRAWAL_APPROVAL_TYPEHASH = keccak256(
        "WithdrawalApproval(uint256 requestId,uint256 vaultId,address recipient,uint256 amount,uint256 nonce)"
    );

    /// @notice Theo dõi số tiền đã rút nhanh trong ngày: vaultId => dayIndex => amount
    mapping(uint256 => mapping(uint256 => uint256)) public dailyFastWithdrawSpent;

    /// @notice Hạn mức rút nhanh tối đa trong 1 ngày (mặc định = fastWithdrawLimit * 2 nếu chưa đặt)
    mapping(uint256 => uint256) public vaultDailyLimit;

    /// @notice Theo dõi thành viên đã đóng hụi: vaultId => roundIndex => member => bool
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasContributedRosca;

    /// @notice Đếm số người đã đóng hụi trong round: vaultId => roundIndex => count
    mapping(uint256 => mapping(uint256 => uint256)) public roscaRoundContributionsCount;

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

    event TrustedForwarderUpdated(address indexed oldForwarder, address indexed newForwarder);
    event DailyLimitUpdated(uint256 indexed vaultId, uint256 newDailyLimit);
    event RoscaRoundContributed(
        uint256 indexed vaultId,
        uint256 indexed roundIndex,
        address indexed contributor,
        uint256 amount
    );
    event TokenDepositedToVault(
        uint256 indexed vaultId,
        address indexed token,
        address indexed depositor,
        uint256 amount
    );
    event TokenFastWithdrawn(
        uint256 indexed vaultId,
        address indexed token,
        address indexed recipient,
        uint256 amount
    );

    // -------------------------------------------------------------
    // MODIFIERS
    // -------------------------------------------------------------
    modifier onlyFamilyAdmin() {
        if (_msgSender() != familyAdmin) revert NotFamilyAdmin();
        _;
    }

    modifier onlyVaultGuardian(uint256 vaultId) {
        if (!isVaultGuardian[vaultId][_msgSender()]) {
            revert NotVaultGuardian();
        }
        _;
    }

    modifier onlyVaultBeneficiary(uint256 vaultId) {
        if (!isVaultBeneficiary[vaultId][_msgSender()]) revert NotVaultBeneficiary();
        _;
    }

    modifier onlyAllowed() {
        if (!isAllowlisted[_msgSender()]) revert NotAllowlisted();
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

        if (
            _teleporterMessenger != address(0) ||
            _cChainBlockchainId != bytes32(0) ||
            _yieldVaultAddress != address(0)
        ) {
            if (
                _teleporterMessenger.code.length == 0 ||
                _cChainBlockchainId == bytes32(0) ||
                _yieldVaultAddress == address(0)
            ) revert ZeroAddress();
        }
        familyAdmin = _admin;
        isAllowlisted[_admin] = true;

        teleporterMessenger = ITeleporterMessenger(_teleporterMessenger);
        cChainBlockchainId = _cChainBlockchainId;
        yieldVaultAddress = _yieldVaultAddress;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("FamilyHub")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    // -------------------------------------------------------------
    // 0. CƠ CHẾ ERC-2771 TRUSTED FORWARDER CHO META-TRANSACTIONS
    // -------------------------------------------------------------

    /**
     * @notice Thiết lập địa chỉ Trusted Forwarder EIP-2771
     */
    function setTrustedForwarder(address _forwarder) external onlyFamilyAdmin {
        if (vaultCounter != 0 || trustedForwarder != address(0)) revert ConfigurationLocked();
        if (_forwarder.code.length == 0) revert ZeroAddress();
        address old = trustedForwarder;
        trustedForwarder = _forwarder;
        if (_forwarder != address(0)) {
            isAllowlisted[_forwarder] = true;
        }
        emit TrustedForwarderUpdated(old, _forwarder);
    }

    /**
     * @notice Kiểm tra địa chỉ có phải là Trusted Forwarder hay không
     */
    function isTrustedForwarder(address forwarder) public view returns (bool) {
        return forwarder == trustedForwarder && trustedForwarder != address(0);
    }

    /**
     * @notice Xác định người gửi giao dịch thực tế (hỗ trợ ERC-2771 calldata extraction)
     */
    function _msgSender() internal view virtual override returns (address) {
        if (isTrustedForwarder(msg.sender) && msg.data.length >= 20) {
            return address(bytes20(msg.data[msg.data.length - 20:]));
        }
        return msg.sender;
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
     * @notice Cấu hình đích ICM trước khi tạo hũ; không thay đổi nơi giữ tài sản đã nạp
     */
    function setTeleporterConfig(
        address messenger,
        bytes32 remoteId,
        address remoteVault
    ) external onlyFamilyAdmin {
        if (vaultCounter != 0) revert ConfigurationLocked();
        if (messenger.code.length == 0 || remoteId == bytes32(0) || remoteVault == address(0))
            revert ZeroAddress();
        teleporterMessenger = ITeleporterMessenger(messenger);
        cChainBlockchainId = remoteId;
        yieldVaultAddress = remoteVault;
    }

    /**
     * @notice Thiết lập hợp đồng chuyên biệt quản lý quỹ & dòng tiền (VaultCashflow)
     */
    function setVaultCashflow(address cashflow) external onlyFamilyAdmin {
        // Liên kết trước khi có bất kỳ hũ nào để không tạo ledger thứ hai.
        if (vaultCounter != 0 || address(vaultCashflow) != address(0)) revert ConfigurationLocked();
        if (cashflow.code.length == 0) revert ZeroAddress();
        VaultCashflow next = VaultCashflow(payable(cashflow));
        if (
            next.controller() != address(this) ||
            next.initializedVaults() != 0 ||
            next.totalLiabilities() != 0
        ) revert ConfigurationLocked();
        vaultCashflow = next;
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
        return
            createAdvancedVault(
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
                0 // roscaRoundContribution mặc định
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
    ) public whenNotPaused onlyAllowed returns (uint256 vaultId) {
        if (bytes(name).length == 0) revert ZeroAmount();
        if (bufferRatioBps > 10000) revert InvalidBufferRatio();
        if (fastWithdrawLimit > type(uint256).max / 2) revert InvalidRuleAction();
        if (guardians.length == 0) revert InvalidApprovalThreshold();
        if (requiredApprovals == 0 || requiredApprovals > guardians.length) {
            revert InvalidApprovalThreshold();
        }

        if (beneficiaries.length == 0 || guardians.length > 32 || beneficiaries.length > 64)
            revert InvalidApprovalThreshold();
        for (uint256 i; i < guardians.length; i++) {
            if (guardians[i] == address(0)) revert ZeroAddress();
            if (!isAllowlisted[guardians[i]]) revert NotAllowlisted();
            for (uint256 j; j < i; j++) if (guardians[i] == guardians[j]) revert DuplicateMember();
        }
        for (uint256 i; i < beneficiaries.length; i++) {
            if (beneficiaries[i] == address(0)) revert ZeroAddress();
            if (!isAllowlisted[beneficiaries[i]]) revert NotAllowlisted();
            for (uint256 j; j < i; j++)
                if (beneficiaries[i] == beneficiaries[j]) revert DuplicateMember();
        }
        if (
            ruleType == RuleTemplate.ROSCA &&
            (roscaRoundDuration == 0 || roscaRoundContribution == 0)
        ) revert InvalidRuleAction();
        if (
            ruleType == RuleTemplate.SHARED_GOAL &&
            (targetGoalAmount == 0 || targetDeadline <= block.timestamp)
        ) revert InvalidRuleAction();
        if (ruleType != RuleTemplate.SHIELD && fastWithdrawLimit != 0) revert InvalidRuleAction();
        vaultCounter++;
        vaultId = vaultCounter;

        DynamicVault storage newVault = vaults[vaultId];
        newVault.vaultId = vaultId;
        newVault.name = name;
        newVault.creator = _msgSender();
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

            _registerUserVault(g, vaultId);
        }

        // Đăng ký quyền Beneficiaries và ghi nhận Hũ
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            address b = beneficiaries[i];
            if (b == address(0)) revert ZeroAddress();
            isVaultBeneficiary[vaultId][b] = true;

            _registerUserVault(b, vaultId);
        }

        // Đăng ký creator
        _registerUserVault(_msgSender(), vaultId);

        // Khởi tạo sổ cái trên VaultCashflow nếu đã liên kết kho tiền
        if (address(vaultCashflow) != address(0)) {
            vaultCashflow.initializeVaultLedger(vaultId, bufferRatioBps);
        }

        emit VaultCreated(vaultId, name, _msgSender(), ruleType, bufferRatioBps, requiredApprovals);

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
     * @notice Nạp AVAX vào hũ đã tồn tại, ghi nhận toàn bộ tài sản tại Fuji
     * @param vaultId Mã Hũ tiền nạp
     */
    function depositToVault(
        uint256 vaultId
    ) external payable nonReentrant whenNotPaused onlyAllowed {
        DynamicVault storage vault = vaults[vaultId];
        if (vault.vaultId == 0) revert VaultNotFound();
        if (!vault.isActive) revert VaultInactive();
        if (vault.ruleType == RuleTemplate.ROSCA) revert InvalidRuleAction();
        _depositLocal(vaultId, _msgSender(), msg.value);
    }

    /// @dev Chỉ ghi tài sản có msg.value thực nhận; T1 không có remote principal.
    function _depositLocal(uint256 vaultId, address depositor, uint256 amount) internal {
        if (amount == 0) revert ZeroAmount();
        DynamicVault storage vault = vaults[vaultId];
        vault.totalBalance += amount;
        vault.l1BufferBalance += amount;
        if (address(vaultCashflow) != address(0))
            vaultCashflow.deposit{value: amount}(vaultId, depositor);
        emit FundsDeposited(vaultId, depositor, amount, amount, 0);
        if (
            vault.ruleType == RuleTemplate.SHARED_GOAL &&
            vault.totalBalance >= vault.targetGoalAmount
        ) {
            emit GoalReached(vaultId, vault.totalBalance, vault.targetGoalAmount);
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
     * Bảo đảm: kiểm khả dụng sau reservation, trừ sổ cái rồi chi một lần tại Fuji
     */
    function _executeWithdrawal(
        uint256 vaultId,
        address recipient,
        uint256 amount
    ) internal returns (bool) {
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();
        uint256 available = _getVaultTotal(vaultId) - reservedRewards[vaultId];
        if (amount > available) revert InsufficientVaultBalance(available, amount);
        DynamicVault storage vault = vaults[vaultId];
        vault.totalBalance -= amount;
        vault.l1BufferBalance -= amount;
        if (address(vaultCashflow) != address(0)) {
            vaultCashflow.executeWithdrawal(vaultId, recipient, amount);
        } else {
            (bool success, ) = payable(recipient).call{value: amount}("");
            if (!success) revert TransferFailed();
        }
        return true;
    }

    // -------------------------------------------------------------
    // 5. CÁC CHÍNH SÁCH KÍCH HOẠT GIẢI NGÂN (COMPOSABLE POLICIES)
    // -------------------------------------------------------------

    // --- POLICY A: RÚT TIỀN NHANH (FAST WITHDRAWAL <= LIMIT, ÁP DỤNG CHO SHIELD) ---

    /**
     * @notice Thiết lập hạn mức rút nhanh tối đa trong 1 ngày cho Hũ SHIELD
     */
    function setVaultDailyLimit(uint256, uint256) external pure {
        // Hạn mức T1 cố định khi tạo hũ; không có bypass nâng hạn mức bằng một Guardian.
        revert ConfigurationLocked();
    }

    function fastWithdraw(
        uint256 vaultId,
        uint256 amount
    ) external nonReentrant whenNotPaused onlyAllowed onlyVaultBeneficiary(vaultId) {
        DynamicVault storage vault = vaults[vaultId];
        if (!vault.isActive) revert VaultInactive();

        if (vault.ruleType != RuleTemplate.SHIELD) revert InvalidRuleAction();
        if (amount > vault.fastWithdrawLimit) {
            revert ExceedsFastLimit(amount, vault.fastWithdrawLimit);
        }

        // Kiểm tra Daily Spending Limit chống drain liên tục
        uint256 currentDay = block.timestamp / 1 days;
        uint256 dailyLimit =
            vaultDailyLimit[vaultId] > 0 ? vaultDailyLimit[vaultId] : (vault.fastWithdrawLimit * 2);
        uint256 spentToday = dailyFastWithdrawSpent[vaultId][currentDay];

        if (spentToday + amount > dailyLimit) {
            uint256 remainingToday = dailyLimit > spentToday ? dailyLimit - spentToday : 0;
            revert ExceedsDailyLimit(amount, remainingToday);
        }
        dailyFastWithdrawSpent[vaultId][currentDay] += amount;

        // Rút nhanh bắt buộc phải có sẵn trong đệm L1 để đảm bảo tính tức thì
        uint256 currentL1 = _getVaultL1Buffer(vaultId);
        if (currentL1 < amount) {
            revert InsufficientLocalBuffer(currentL1, amount);
        }

        _executeWithdrawal(vaultId, _msgSender(), amount);
        emit FastWithdrawalExecuted(vaultId, _msgSender(), amount);
    }

    // --- POLICY B: ĐA CHỮ KÝ PHÂN TẦNG (TIERED MULTISIG M/N CHO LỆNH RÚT LỚN) ---
    function requestLargeWithdrawal(
        uint256 vaultId,
        uint256 amount,
        string calldata reason
    ) external whenNotPaused onlyAllowed onlyVaultBeneficiary(vaultId) returns (uint256 requestId) {
        if (amount == 0) revert ZeroAmount();
        DynamicVault storage vault = vaults[vaultId];
        if (!vault.isActive) revert VaultInactive();
        if (vault.ruleType != RuleTemplate.SHIELD && vault.ruleType != RuleTemplate.SHARED_GOAL)
            revert InvalidRuleAction();
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

        requestEpoch[requestId] = membershipEpoch[vaultId];
        uint256 deadline = block.timestamp + 48 hours;

        withdrawalRequests[requestId] = WithdrawalRequest({
            requestId: requestId,
            vaultId: vaultId,
            requester: _msgSender(),
            amount: amount,
            recipient: _msgSender(),
            reason: reason,
            approvalsCount: 0,
            deadline: deadline,
            executed: false
        });

        emit WithdrawalRequested(requestId, vaultId, _msgSender(), amount, reason, deadline);

        return requestId;
    }

    function approveWithdrawal(uint256 requestId) external nonReentrant whenNotPaused onlyAllowed {
        WithdrawalRequest storage req = withdrawalRequests[requestId];
        if (req.requestId == 0) revert RequestNotFound();
        if (req.executed) revert RequestAlreadyExecuted();
        if (requestEpoch[requestId] != membershipEpoch[req.vaultId]) revert StaleAuthorization();
        DynamicVault storage policyVault = vaults[req.vaultId];
        if (
            policyVault.ruleType == RuleTemplate.SHARED_GOAL &&
            _getVaultTotal(req.vaultId) < policyVault.targetGoalAmount &&
            block.timestamp < policyVault.targetDeadline
        ) revert GoalNotReached(_getVaultTotal(req.vaultId), policyVault.targetGoalAmount);
        if (block.timestamp > req.deadline) revert RequestExpired();

        uint256 vaultId = req.vaultId;
        if (!isVaultGuardian[vaultId][_msgSender()]) {
            revert NotVaultGuardian();
        }

        if (hasApprovedRequest[requestId][_msgSender()]) revert AlreadyApproved();

        hasApprovedRequest[requestId][_msgSender()] = true;
        req.approvalsCount++;

        emit WithdrawalApproved(requestId, vaultId, _msgSender(), req.approvalsCount);

        DynamicVault storage vault = vaults[vaultId];
        if (req.approvalsCount >= vault.requiredApprovals) {
            req.executed = true;

            bool fullyFunded = _executeWithdrawal(vaultId, req.recipient, req.amount);
            emit WithdrawalExecuted(requestId, vaultId, req.recipient, req.amount, fullyFunded);
        }
    }

    /**
     * @notice Giải ngân lệnh rút lớn bằng danh sách chữ ký số EIP-712 off-chain của Guardians
     * @param requestId Mã định danh phiếu yêu cầu rút tiền
     * @param signatures Mảng chữ ký EIP-712 thu thập từ các Guardians
     */
    function executeWithdrawalWithSignatures(
        uint256 requestId,
        bytes[] calldata signatures
    ) external nonReentrant whenNotPaused onlyAllowed {
        WithdrawalRequest storage req = withdrawalRequests[requestId];
        if (req.requestId == 0) revert RequestNotFound();
        if (req.executed) revert RequestAlreadyExecuted();
        if (requestEpoch[requestId] != membershipEpoch[req.vaultId]) revert StaleAuthorization();
        DynamicVault storage policyVault = vaults[req.vaultId];
        if (
            policyVault.ruleType == RuleTemplate.SHARED_GOAL &&
            _getVaultTotal(req.vaultId) < policyVault.targetGoalAmount &&
            block.timestamp < policyVault.targetDeadline
        ) revert GoalNotReached(_getVaultTotal(req.vaultId), policyVault.targetGoalAmount);
        if (block.timestamp > req.deadline) revert RequestExpired();

        uint256 vaultId = req.vaultId;
        DynamicVault storage vault = vaults[vaultId];

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        WITHDRAWAL_APPROVAL_TYPEHASH,
                        requestId,
                        vaultId,
                        req.recipient,
                        req.amount,
                        requestId
                    )
                )
            )
        );

        for (uint256 i = 0; i < signatures.length; i++) {
            address signer = _recoverSigner(digest, signatures[i]);
            if (signer == address(0)) continue;
            if (!isVaultGuardian[vaultId][signer] || !isAllowlisted[signer]) continue;
            if (!hasApprovedRequest[requestId][signer]) {
                hasApprovedRequest[requestId][signer] = true;
                req.approvalsCount++;
                emit WithdrawalApproved(requestId, vaultId, signer, req.approvalsCount);
            }
        }

        if (req.approvalsCount < vault.requiredApprovals) {
            revert InvalidApprovalThreshold();
        }

        req.executed = true;
        bool fullyFunded = _executeWithdrawal(vaultId, req.recipient, req.amount);
        emit WithdrawalExecuted(requestId, vaultId, req.recipient, req.amount, fullyFunded);
    }

    function _recoverSigner(
        bytes32 digest,
        bytes calldata signature
    ) internal pure returns (address) {
        (address signer, ECDSA.RecoverError err, ) = ECDSA.tryRecover(digest, signature);
        return err == ECDSA.RecoverError.NoError ? signer : address(0);
    }

    // --- POLICY C: CHORE-TO-EARN (ÁP DỤNG CHO MILESTONE VAULTS) ---
    function createChore(
        uint256 vaultId,
        string calldata title,
        uint256 rewardAmount,
        address assignee
    ) external whenNotPaused onlyAllowed onlyVaultGuardian(vaultId) returns (uint256 taskId) {
        DynamicVault storage vault = vaults[vaultId];
        if (!vault.isActive) revert VaultInactive();
        if (vault.ruleType != RuleTemplate.MILESTONE) revert InvalidRuleAction();
        if (rewardAmount == 0 || bytes(title).length == 0) revert ZeroAmount();
        if (!isVaultBeneficiary[vaultId][assignee] || isVaultGuardian[vaultId][assignee])
            revert AssigneeMismatch();
        uint256 available = _getVaultTotal(vaultId) - reservedRewards[vaultId];
        if (rewardAmount > available) revert InsufficientVaultBalance(available, rewardAmount);
        reservedRewards[vaultId] += rewardAmount;
        taskId = ++taskCounter;
        _tasks[taskId] = Task(taskId, vaultId, title, rewardAmount, assignee, false, false);
        emit ChoreCreated(taskId, vaultId, title, rewardAmount, assignee);
    }

    function claimChoreCompleted(uint256 taskId) external whenNotPaused onlyAllowed {
        Task storage task = _tasks[taskId];
        if (task.taskId == 0) revert TaskNotFound();
        if (cancelledTasks[taskId]) revert TaskCancelled();
        if (task.isRewarded) revert TaskAlreadyRewarded();
        if (task.isCompleted) revert AlreadyApproved();
        task.assignee = _resolveWallet(task.vaultId, task.assignee);
        if (_msgSender() != task.assignee) revert AssigneeMismatch();
        task.isCompleted = true;
        emit ChoreClaimed(taskId, _msgSender());
    }

    function verifyAndRewardChore(uint256 taskId) external nonReentrant whenNotPaused onlyAllowed {
        Task storage task = _tasks[taskId];
        if (task.taskId == 0) revert TaskNotFound();
        if (cancelledTasks[taskId]) revert TaskCancelled();
        if (task.isRewarded) revert TaskAlreadyRewarded();
        if (!task.isCompleted) revert TaskNotCompleted();
        uint256 vaultId = task.vaultId;
        if (!isVaultGuardian[vaultId][_msgSender()]) revert NotVaultGuardian();
        task.assignee = _resolveWallet(vaultId, task.assignee);
        if (_msgSender() == task.assignee) revert AssigneeMismatch();
        uint256 epoch = membershipEpoch[vaultId];
        if (taskApprovals[taskId][epoch][_msgSender()]) revert AlreadyApproved();
        taskApprovals[taskId][epoch][_msgSender()] = true;
        uint256 count = ++taskApprovalCount[taskId][epoch];
        emit ChoreApproved(taskId, _msgSender(), count);
        if (count < vaults[vaultId].requiredApprovals) return;
        task.isRewarded = true;
        reservedRewards[vaultId] -= task.rewardAmount;
        _executeWithdrawal(vaultId, task.assignee, task.rewardAmount);
        emit ChoreRewarded(taskId, vaultId, task.assignee, task.rewardAmount);
    }

    /// @notice Hủy nhiệm vụ chưa chi chỉ giải phóng reservation, không chi tiền.
    function cancelChore(uint256 taskId) external whenNotPaused onlyAllowed {
        Task storage task = _tasks[taskId];
        if (task.taskId == 0) revert TaskNotFound();
        if (!isVaultGuardian[task.vaultId][_msgSender()]) revert NotVaultGuardian();
        if (task.isRewarded) revert TaskAlreadyRewarded();
        if (cancelledTasks[taskId]) revert TaskCancelled();
        cancelledTasks[taskId] = true;
        reservedRewards[task.vaultId] -= task.rewardAmount;
        emit ChoreCancelled(taskId);
    }

    // --- POLICY D: GÓP VỐN XOAY VÒNG HỌ HỤI (ÁP DỤNG CHO ROSCA VAULTS) ---

    /**
     * @notice Thành viên đóng hụi theo kỳ cho Hũ ROSCA
     */
    function contributeRoscaRound(
        uint256 vaultId
    ) external payable nonReentrant whenNotPaused onlyAllowed onlyVaultBeneficiary(vaultId) {
        DynamicVault storage vault = vaults[vaultId];
        if (!vault.isActive) revert VaultInactive();
        if (vault.ruleType != RuleTemplate.ROSCA) revert InvalidRuleAction();
        uint256 round = vault.roscaCurrentRound;
        if (round >= vault.beneficiaries.length) revert RoscaCycleEnded();
        if (hasContributedRosca[vaultId][round][_msgSender()]) revert RoscaAlreadyContributed();
        if (msg.value != vault.roscaRoundContribution)
            revert RoscaContributionMismatch(msg.value, vault.roscaRoundContribution);
        hasContributedRosca[vaultId][round][_msgSender()] = true;
        roscaRoundContributionsCount[vaultId][round]++;
        _depositLocal(vaultId, _msgSender(), msg.value);
        emit RoscaRoundContributed(vaultId, round, _msgSender(), msg.value);
    }

    /**
     * @notice Giải ngân quỹ kỳ cho thành viên đến lượt của Hũ ROSCA
     */
    function payoutRoscaRound(uint256 vaultId) external nonReentrant whenNotPaused onlyAllowed {
        DynamicVault storage vault = vaults[vaultId];
        if (!vault.isActive) revert VaultInactive();
        if (vault.ruleType != RuleTemplate.ROSCA) revert InvalidRuleAction();
        uint256 round = vault.roscaCurrentRound;
        if (round >= vault.beneficiaries.length) revert RoscaCycleEnded();
        uint256 next = vault.roscaLastRoundTimestamp + vault.roscaRoundDuration;
        if (block.timestamp < next) revert RoscaRoundNotReady(next - block.timestamp);
        if (roscaRoundContributionsCount[vaultId][round] != vault.beneficiaries.length)
            revert IncompleteRoscaRound();
        address recipient = vault.beneficiaries[round];
        uint256 payout = vault.roscaRoundContribution * vault.beneficiaries.length;
        vault.roscaCurrentRound++;
        vault.roscaLastRoundTimestamp = block.timestamp;
        _executeWithdrawal(vaultId, recipient, payout);
        emit RoscaRoundPaid(vaultId, round, recipient, payout);
    }

    // -------------------------------------------------------------
    // 5. QUẢN LÝ DÒNG TIỀN TOKEN ERC-20 (USDC TOKEN VAULT)
    // -------------------------------------------------------------

    /**
     * @notice Nạp token ERC-20 (như USDC) vào Hũ tiền thông qua VaultCashflow
     */
    function depositTokenToVault(uint256, address, uint256) external pure {
        revert FeatureDisabled();
    }

    /**
     * @notice Rút nhanh token ERC-20 (áp dụng cho Beneficiary)
     */
    function fastWithdrawToken(uint256, address, uint256) external pure {
        revert FeatureDisabled();
    }

    // -------------------------------------------------------------
    // 6. THÊM THÀNH VIÊN VÀO HŨ ĐANG CÓ
    // -------------------------------------------------------------

    /**
     * @notice Guardian phê duyệt thành viên đã allowlist bằng quorum hiện tại của Hũ.
     * @dev Không thêm Beneficiary vào ROSCA vì việc đó sẽ đổi thứ tự nhận tiền.
     */
    function approveVaultMemberAddition(
        uint256 vaultId,
        address member,
        bool guardianRole,
        bytes32 proposalId
    ) external whenNotPaused onlyAllowed onlyVaultGuardian(vaultId) {
        DynamicVault storage vault = vaults[vaultId];
        if (!vault.isActive) revert VaultInactive();
        if (member == address(0)) revert ZeroAddress();
        if (proposalId == bytes32(0)) revert InvalidMemberAddition();
        if (!isAllowlisted[member]) revert NotAllowlisted();
        if (
            member == vault.creator ||
            isVaultGuardian[vaultId][member] ||
            isVaultBeneficiary[vaultId][member]
        ) revert DuplicateMember();
        if (guardianRole && vault.guardians.length >= 32) revert MembershipLimitReached();
        if (!guardianRole && vault.beneficiaries.length >= 64) revert MembershipLimitReached();
        if (!guardianRole && vault.ruleType == RuleTemplate.ROSCA) revert FeatureDisabled();

        uint256 epoch = membershipEpoch[vaultId];
        bytes32 key = keccak256(abi.encode(vaultId, member, guardianRole, epoch, proposalId));
        MembershipChangeRequest storage request = membershipChangeRequests[key];
        if (request.vaultId == 0) {
            request.vaultId = vaultId;
            request.member = member;
            request.guardianRole = guardianRole;
            request.epoch = epoch;
            request.deadline = block.timestamp + 48 hours;
        } else if (request.executed) {
            revert RequestAlreadyExecuted();
        } else if (block.timestamp > request.deadline) {
            revert RequestExpired();
        }
        if (hasApprovedMembershipChange[key][_msgSender()]) revert AlreadyApproved();

        hasApprovedMembershipChange[key][_msgSender()] = true;
        uint256 approvals = ++request.approvalsCount;
        uint256 required = vault.requiredApprovals;
        emit VaultMemberAdditionApproved(
            vaultId,
            proposalId,
            member,
            guardianRole,
            epoch,
            _msgSender(),
            approvals,
            required,
            request.deadline
        );
        if (approvals < required) return;

        request.executed = true;
        if (guardianRole) {
            uint256 previousGuardianCount = vault.guardians.length;
            vault.guardians.push(member);
            isVaultGuardian[vaultId][member] = true;
            _registerUserVault(member, vaultId);
            vault.requiredApprovals =
                (required * (previousGuardianCount + 1) + previousGuardianCount - 1) /
                previousGuardianCount;
        } else {
            vault.beneficiaries.push(member);
            isVaultBeneficiary[vaultId][member] = true;
            _registerUserVault(member, vaultId);
        }

        membershipEpoch[vaultId]++;
        emit MembershipEpochChanged(vaultId, membershipEpoch[vaultId]);
        emit VaultMemberAdded(
            vaultId,
            proposalId,
            member,
            guardianRole,
            vault.guardians.length,
            vault.requiredApprovals,
            membershipEpoch[vaultId]
        );
    }

    /** @notice Trả về trạng thái phê duyệt của đề nghị trong epoch thành viên hiện tại. */
    function membershipChangeStatus(
        uint256 vaultId,
        address member,
        bool guardianRole,
        bytes32 proposalId
    )
        external
        view
        returns (
            uint256 approvalsCount,
            uint256 requiredApprovals,
            uint256 deadline,
            bool executed,
            bool approvedByCaller,
            uint256 epoch
        )
    {
        epoch = membershipEpoch[vaultId];
        bytes32 key = keccak256(abi.encode(vaultId, member, guardianRole, epoch, proposalId));
        MembershipChangeRequest storage request = membershipChangeRequests[key];
        return (
            request.approvalsCount,
            vaults[vaultId].requiredApprovals,
            request.deadline,
            request.executed,
            hasApprovedMembershipChange[key][_msgSender()],
            epoch
        );
    }

    // -------------------------------------------------------------
    // 7. SOCIAL RECOVERY CHO THÀNH VIÊN THEO HŨ (BẢO VỆ CẢ CREATOR)
    // -------------------------------------------------------------

    /**
     * @notice Khôi phục ví xã hội khi thành viên bị mất máy, chuyển giao trọn vẹn quyền hạn
     */
    function recoverMemberWallet(
        uint256 vaultId,
        address oldWallet,
        address newWallet
    ) external whenNotPaused onlyAllowed onlyVaultGuardian(vaultId) {
        DynamicVault storage vault = vaults[vaultId];
        if (!vault.isActive) revert VaultInactive();
        if (newWallet == address(0) || oldWallet == address(0)) revert ZeroAddress();
        if (recoveredWallets[vaultId][newWallet] != address(0)) revert InvalidRecovery();
        if (
            oldWallet == newWallet ||
            isVaultGuardian[vaultId][newWallet] ||
            isVaultBeneficiary[vaultId][newWallet] ||
            vault.creator == newWallet
        ) revert InvalidRecovery();
        if (
            !isVaultGuardian[vaultId][oldWallet] &&
            !isVaultBeneficiary[vaultId][oldWallet] &&
            vault.creator != oldWallet
        ) revert InvalidRecovery();
        uint256 epoch = membershipEpoch[vaultId];
        bytes32 key = keccak256(abi.encode(vaultId, oldWallet, newWallet, epoch));
        RecoveryRequest storage req = recoveryRequests[key];
        if (hasApprovedRecovery[key][_msgSender()]) revert AlreadyApproved();
        if (req.vaultId == 0) {
            req.vaultId = vaultId;
            req.oldWallet = oldWallet;
            req.newWallet = newWallet;
        }
        hasApprovedRecovery[key][_msgSender()] = true;
        if (++req.approvalsCount < vault.requiredApprovals) return;
        req.executed = true;
        if (vault.creator == oldWallet) vault.creator = newWallet;
        if (isVaultGuardian[vaultId][oldWallet]) {
            isVaultGuardian[vaultId][oldWallet] = false;
            isVaultGuardian[vaultId][newWallet] = true;
            for (uint256 i; i < vault.guardians.length; i++)
                if (vault.guardians[i] == oldWallet) vault.guardians[i] = newWallet;
        }
        if (isVaultBeneficiary[vaultId][oldWallet]) {
            isVaultBeneficiary[vaultId][oldWallet] = false;
            isVaultBeneficiary[vaultId][newWallet] = true;
            for (uint256 i; i < vault.beneficiaries.length; i++)
                if (vault.beneficiaries[i] == oldWallet) vault.beneficiaries[i] = newWallet;
            uint256 round = vault.roscaCurrentRound;
            if (hasContributedRosca[vaultId][round][oldWallet]) {
                hasContributedRosca[vaultId][round][oldWallet] = false;
                hasContributedRosca[vaultId][round][newWallet] = true;
            }
        }
        // Tránh vòng lặp task không giới hạn: resolve ví assignee khi đọc/claim/chi qua mapping.
        recoveredWallets[vaultId][oldWallet] = newWallet;
        isAllowlisted[newWallet] = true;
        _registerUserVault(newWallet, vaultId);
        membershipEpoch[vaultId]++;
        emit MembershipEpochChanged(vaultId, membershipEpoch[vaultId]);
        emit MemberWalletRecovered(vaultId, oldWallet, newWallet);
    }

    // -------------------------------------------------------------
    // 8. CALLBACK TELEPORTER (TIẾP NHẬN PHẢN HỒI TỪ C-CHAIN)
    // -------------------------------------------------------------

    function receiveTeleporterMessage(bytes32, address, bytes calldata) external pure override {
        revert FeatureDisabled();
    }

    /// @dev Chuỗi recovery hữu hạn; ví đã thu hồi không được dùng lại làm ví đích.
    function _resolveWallet(uint256 vaultId, address wallet) internal view returns (address) {
        while (recoveredWallets[vaultId][wallet] != address(0))
            wallet = recoveredWallets[vaultId][wallet];
        return wallet;
    }

    // -------------------------------------------------------------
    // 9. GETTER VIEW FUNCTIONS CHO DAPP
    // -------------------------------------------------------------

    /// @notice Getter giữ định dạng ABI cũ nhưng luôn trả assignee sau recovery.
    function tasks(
        uint256 taskId
    )
        external
        view
        returns (
            uint256 id,
            uint256 vaultId,
            string memory title,
            uint256 rewardAmount,
            address assignee,
            bool isCompleted,
            bool isRewarded
        )
    {
        Task storage task = _tasks[taskId];
        return (
            task.taskId,
            task.vaultId,
            task.title,
            task.rewardAmount,
            _resolveWallet(task.vaultId, task.assignee),
            task.isCompleted,
            task.isRewarded
        );
    }

    function getVault(uint256 vaultId) external view returns (DynamicVault memory) {
        DynamicVault memory vault = vaults[vaultId];
        if (address(vaultCashflow) != address(0)) {
            (uint256 total, uint256 l1Buf, uint256 cPrin, ) = vaultCashflow.getVaultBalances(
                vaultId
            );
            vault.totalBalance = total;
            vault.l1BufferBalance = l1Buf;
            vault.cChainPrincipal = cPrin;
        }
        return vault;
    }

    function getUserVaultIds(address user) external view returns (uint256[] memory) {
        uint256[] storage stored = _userVaults[user];
        uint256[] memory result = new uint256[](stored.length);
        uint256 count;
        for (uint256 i; i < stored.length; i++) {
            uint256 id = stored[i];
            if (
                vaults[id].creator == user ||
                isVaultGuardian[id][user] ||
                isVaultBeneficiary[id][user]
            ) result[count++] = id;
        }
        assembly ("memory-safe") {
            mstore(result, count)
        }
        return result;
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
        returns (uint256 total, uint256 l1Buffer, uint256 cChainPrincipal, uint256 bufferRatioBps)
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

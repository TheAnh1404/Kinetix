// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ITeleporterMessenger.sol";

/**
 * @title FamilyHub
 * @author Kinetix Team (UniHack - Avalanche Team1 Vietnam)
 * @notice Hợp đồng quản trị tài chính đa không gian và Hũ động (Dynamic & Composable Multi-Space Vaults) trên Avalanche Family L1 (Gas = 0).
 * Cung cấp:
 * 1. Khởi tạo không giới hạn số lượng Hũ tiền động (DynamicVault) với ID tự tăng.
 * 2. Hỗ trợ 4 Bộ Quy Tắc (RuleTemplate): SHIELD (Bảo vệ), MILESTONE (Nhiệm vụ), ROSCA (Hụi họ), SHARED_GOAL (Mục tiêu chung).
 * 3. Tùy chỉnh linh hoạt tỷ lệ đệm thanh khoản L1 / C-Chain (bufferRatioBps).
 * 4. Đa chữ ký phân tầng (Tiered Multisig M/N) riêng biệt cho từng Hũ tiền.
 * 5. Hệ thống nhiệm vụ Chore-to-Earn và Social Recovery theo từng Hũ.
 */
contract FamilyHub is ReentrancyGuard, ITeleporterReceiver {
    // -------------------------------------------------------------
    // ENUMS & STRUCTS
    // -------------------------------------------------------------

    /// @notice 4 Bộ Quy Tắc linh hoạt cho từng Hũ tiền
    enum RuleTemplate {
        SHIELD,      // 0: Bảo vệ & Trợ cấp (Rút nhỏ <= limit giải ngân tức thì; rút lớn cần M/N Guardians)
        MILESTONE,   // 1: Nhiệm vụ & Cột mốc (Chore-to-Earn - mở khóa thưởng khi hoàn thành task)
        ROSCA,       // 2: Góp vốn xoay vòng (Họ Hụi - đẩy C-Chain sinh lời, định kỳ nhận gốc + lãi)
        SHARED_GOAL  // 3: Mục tiêu chung (Góp tiền du lịch/mua sắm nhóm, cần M/N mở khóa)
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
    // 1. CẤU HÌNH & QUẢN TRỊ TRUNG TÂM
    // -------------------------------------------------------------

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
     * @notice Khởi tạo Hũ tiền mới với Bộ Quy Tắc tùy biến
     * @param name Tên Hũ tiền (VD: "Hũ Báo Hiếu", "Hũ Lì Xì", "Quỹ Du Lịch")
     * @param ruleType 1 trong 4 Bộ Quy Tắc (SHIELD, MILESTONE, ROSCA, SHARED_GOAL)
     * @param bufferRatioBps Tỷ lệ đệm giữ lại L1 (basis points: 1000 = 10%, tối đa 10000 = 100%)
     * @param fastWithdrawLimit Hạn mức rút nhanh không cần duyệt (áp dụng cho SHIELD)
     * @param requiredApprovals Số chữ ký duyệt tối thiểu M/N khi rút tiền lớn
     * @param guardians Danh sách ví bảo hộ / duyệt chi
     * @param beneficiaries Danh sách ví người thụ hưởng
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

        // Đăng ký quyền Guardians và lưu vào danh sách Hũ của từng Guardian
        for (uint256 i = 0; i < guardians.length; i++) {
            address g = guardians[i];
            if (g == address(0)) revert ZeroAddress();
            isVaultGuardian[vaultId][g] = true;
            isAllowlisted[g] = true;
            _registerUserVault(g, vaultId);
        }

        // Đăng ký quyền Beneficiaries và lưu vào danh sách Hũ
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            address b = beneficiaries[i];
            if (b == address(0)) revert ZeroAddress();
            isVaultBeneficiary[vaultId][b] = true;
            isAllowlisted[b] = true;
            _registerUserVault(b, vaultId);
        }

        // Đăng ký creator
        _registerUserVault(msg.sender, vaultId);

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
            if (uVaults[i] == vaultId) return; // Đã có trong danh sách
        }
        uVaults.push(vaultId);
    }

    // -------------------------------------------------------------
    // 3. NẠP TIỀN VÀ ĐIỀU CHUYỂN VỐN (DEPOSIT & TELEPORTER BRIDGE)
    // -------------------------------------------------------------

    /**
     * @notice Nạp tiền vào Hũ và tự động tách đệm thanh khoản L1 / C-Chain theo bufferRatioBps
     * @param vaultId Mã Hũ tiền nạp
     */
    function depositToVault(uint256 vaultId) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        DynamicVault storage vault = vaults[vaultId];
        if (!vault.isActive) revert VaultInactive();

        // Tính toán phần giữ lại L1 và phần chuyển C-Chain không mất số dư làm tròn
        uint256 toBridge = (msg.value * (10000 - vault.bufferRatioBps)) / 10000;
        uint256 toBuffer = msg.value - toBridge;

        vault.l1BufferBalance += toBuffer;
        vault.cChainPrincipal += toBridge;
        vault.totalBalance += msg.value;

        emit FundsDeposited(vaultId, msg.sender, msg.value, toBuffer, toBridge);

        // Gửi thông điệp Teleporter sang C-Chain nếu có phần chuyển tiếp
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

    // -------------------------------------------------------------
    // 4. RÚT TIỀN NHANH (FAST WITHDRAWAL <= LIMIT, 0 GAS)
    // -------------------------------------------------------------

    /**
     * @notice Rút tiền nhanh từ bộ đệm L1 dành cho Beneficiary (áp dụng mạnh mẽ cho hũ SHIELD)
     * @param vaultId Mã Hũ tiền
     * @param amount Số tiền cần rút
     */
    function fastWithdraw(
        uint256 vaultId,
        uint256 amount
    ) external nonReentrant onlyVaultBeneficiary(vaultId) {
        if (amount == 0) revert ZeroAmount();
        DynamicVault storage vault = vaults[vaultId];
        if (!vault.isActive) revert VaultInactive();

        if (amount > vault.fastWithdrawLimit) {
            revert ExceedsFastLimit(amount, vault.fastWithdrawLimit);
        }

        if (vault.l1BufferBalance < amount) {
            revert InsufficientLocalBuffer(vault.l1BufferBalance, amount);
        }

        vault.l1BufferBalance -= amount;
        vault.totalBalance -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit FastWithdrawalExecuted(vaultId, msg.sender, amount);
    }

    // -------------------------------------------------------------
    // 5. ĐA CHỮ KÝ PHÂN TẦNG CHO HŨ (TIERED MULTISIG M/N)
    // -------------------------------------------------------------

    /**
     * @notice Khởi tạo phiếu yêu cầu rút tiền lớn vượt hạn mức nhanh
     * @param vaultId Mã Hũ tiền
     * @param amount Số tiền muốn rút
     * @param reason Mục đích rút tiền
     */
    function requestLargeWithdrawal(
        uint256 vaultId,
        uint256 amount,
        string calldata reason
    ) external onlyVaultBeneficiary(vaultId) returns (uint256 requestId) {
        if (amount == 0) revert ZeroAmount();
        DynamicVault storage vault = vaults[vaultId];
        if (!vault.isActive) revert VaultInactive();
        if (amount > vault.totalBalance) {
            revert InsufficientVaultBalance(vault.totalBalance, amount);
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

    /**
     * @notice Guardian ký duyệt yêu cầu rút tiền lớn của Hũ
     * @param requestId Mã định danh yêu cầu
     */
    function approveWithdrawal(uint256 requestId) external nonReentrant {
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

        // Đủ số chữ ký quy định M/N -> Tự động giải ngân
        DynamicVault storage vault = vaults[vaultId];
        if (req.approvalsCount >= vault.requiredApprovals) {
            req.executed = true;

            // Kiểm tra số dư đệm L1 tại chỗ
            if (vault.l1BufferBalance >= req.amount) {
                vault.l1BufferBalance -= req.amount;
                vault.totalBalance -= req.amount;

                (bool success, ) = payable(req.recipient).call{value: req.amount}("");
                if (!success) revert TransferFailed();

                emit WithdrawalExecuted(requestId, vaultId, req.recipient, req.amount, true);
            } else {
                // Đệm L1 không đủ: giải ngân hết đệm L1 có sẵn và phát lệnh Teleporter rút phần thiếu từ C-Chain
                uint256 availableLocal = vault.l1BufferBalance;
                uint256 deficit = req.amount - availableLocal;

                vault.l1BufferBalance = 0;
                vault.cChainPrincipal = vault.cChainPrincipal >= deficit
                    ? vault.cChainPrincipal - deficit
                    : 0;
                vault.totalBalance = vault.totalBalance >= req.amount
                    ? vault.totalBalance - req.amount
                    : 0;

                if (availableLocal > 0) {
                    (bool success, ) = payable(req.recipient).call{value: availableLocal}("");
                    if (!success) revert TransferFailed();
                }

                // Gửi thông điệp Teleporter sang C-Chain để rút phần thiếu về ví người nhận
                if (
                    address(teleporterMessenger) != address(0) &&
                    yieldVaultAddress != address(0)
                ) {
                    bytes memory payload = abi.encode(
                        BridgeAction.WITHDRAW,
                        vaultId,
                        deficit,
                        req.recipient
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

                emit WithdrawalExecuted(requestId, vaultId, req.recipient, req.amount, false);
            }
        }
    }

    // -------------------------------------------------------------
    // 6. NHIỆM VỤ CHORE-TO-EARN (ÁP DỤNG CHO MILESTONE VAULTS)
    // -------------------------------------------------------------

    /**
     * @notice Tạo nhiệm vụ việc nhà hoặc cột mốc mới gắn với Hũ
     */
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
        if (rewardAmount > vault.totalBalance) revert InsufficientVaultBalance(vault.totalBalance, rewardAmount);

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

    /**
     * @notice Người được giao nhiệm vụ báo cáo đã hoàn thành
     */
    function claimChoreCompleted(uint256 taskId) external {
        Task storage task = tasks[taskId];
        if (task.taskId == 0) revert TaskNotFound();
        if (msg.sender != task.assignee) revert AssigneeMismatch();

        task.isCompleted = true;
        emit ChoreClaimed(taskId, msg.sender);
    }

    /**
     * @notice Guardian duyệt và chuyển tiền thưởng nhiệm vụ
     */
    function verifyAndRewardChore(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        if (task.taskId == 0) revert TaskNotFound();
        if (!task.isCompleted) revert TaskNotCompleted();
        if (task.isRewarded) revert TaskAlreadyRewarded();

        uint256 vaultId = task.vaultId;
        if (!isVaultGuardian[vaultId][msg.sender] && msg.sender != familyAdmin) {
            revert NotVaultGuardian();
        }

        DynamicVault storage vault = vaults[vaultId];
        if (vault.l1BufferBalance < task.rewardAmount) {
            revert InsufficientLocalBuffer(vault.l1BufferBalance, task.rewardAmount);
        }

        task.isRewarded = true;
        vault.l1BufferBalance -= task.rewardAmount;
        vault.totalBalance -= task.rewardAmount;

        (bool success, ) = payable(task.assignee).call{value: task.rewardAmount}("");
        if (!success) revert TransferFailed();

        emit ChoreRewarded(taskId, vaultId, task.assignee, task.rewardAmount);
    }

    // -------------------------------------------------------------
    // 7. SOCIAL RECOVERY CHO THÀNH VIÊN THEO HŨ
    // -------------------------------------------------------------

    /**
     * @notice Khôi phục ví xã hội khi thành viên bị mất máy, cần đủ chữ ký Guardians của Hũ
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

            // Chuyển quyền Beneficiary nếu có
            if (isVaultBeneficiary[vaultId][oldWallet]) {
                isVaultBeneficiary[vaultId][oldWallet] = false;
                isVaultBeneficiary[vaultId][newWallet] = true;
                _registerUserVault(newWallet, vaultId);
            }

            // Chuyển quyền Guardian nếu có
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
    // 8. CALLBACK TELEPORTER (TIẾP NHẬN PHẢN HỒI TỪ C-CHAIN)
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
    // 9. GETTER VIEW FUNCTIONS CHO DAPP
    // -------------------------------------------------------------

    /**
     * @notice Lấy thông tin chi tiết của 1 Hũ tiền
     */
    function getVault(uint256 vaultId) external view returns (DynamicVault memory) {
        return vaults[vaultId];
    }

    /**
     * @notice Lấy danh sách ID các Hũ mà một người dùng tham gia
     */
    function getUserVaultIds(address user) external view returns (uint256[] memory) {
        return _userVaults[user];
    }

    /**
     * @notice Lấy danh sách Guardians của Hũ
     */
    function getVaultGuardians(uint256 vaultId) external view returns (address[] memory) {
        return vaults[vaultId].guardians;
    }

    /**
     * @notice Lấy danh sách Beneficiaries của Hũ
     */
    function getVaultBeneficiaries(uint256 vaultId) external view returns (address[] memory) {
        return vaults[vaultId].beneficiaries;
    }

    /**
     * @notice Tổng quan nhanh số dư của Hũ
     */
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

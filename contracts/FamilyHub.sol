// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ITeleporterMessenger.sol";

/**
 * @title FamilyHub
 * @author Kinetix Team (UniHack - Avalanche Team1 Vietnam)
 * @notice Hợp đồng quản trị tài chính gia đình đa thế hệ trên Avalanche Family L1 (Gas = 0).
 * Cung cấp:
 * 1. Quản lý phân quyền gia đình và Social Recovery (khôi phục ví khi mất máy bằng >= 2 chữ ký con cái).
 * 2. Quản lý 3 hũ tài chính: Hưu trí (RetirementShield), Tiết kiệm con trẻ (KidsSavings), Tương trợ họ hàng (FamilyROSCA).
 * 3. Cơ chế đệm thanh khoản 10/90: 10% giữ tại L1 rút tức thì, 90% gửi sang Fuji C-Chain sinh lời ~8% APY.
 * 4. Đa chữ ký phân tầng chống lừa đảo người cao tuổi (Tiered Anti-Scam Multisig):
 *    - Rút <= 50 USDC: Giải ngân tức thì từ bộ đệm L1.
 *    - Rút > 50 USDC: Đưa vào hàng đợi, cần >= 2/3 chữ ký Guardians (các con) mới giải ngân.
 * 5. Cơ chế giáo dục tài chính trẻ em (Chore-to-Earn): Làm việc nhà nhận thưởng từ quỹ KidsSavings.
 */
contract FamilyHub is ReentrancyGuard, ITeleporterReceiver {
    // -------------------------------------------------------------
    // ENUMS & STRUCTS
    // -------------------------------------------------------------

    /// @notice 3 Hũ tài chính của gia đình
    enum VaultType {
        RetirementShield, // Hũ 1: Báo hiếu & Hưu trí (ông bà)
        KidsSavings, // Hũ 2: Lì xì & Tiết kiệm con trẻ
        FamilyROSCA // Hũ 3: Quỹ tương trợ họ hàng
    }

    /// @notice Loại hành động truyền qua cầu nối Teleporter
    enum BridgeAction {
        DEPOSIT,
        WITHDRAW
    }

    /// @notice Phiếu yêu cầu rút tiền lớn cần đa chữ ký
    struct WithdrawalRequest {
        uint256 requestId; // Mã định danh yêu cầu
        address requester; // Người yêu cầu rút tiền
        VaultType vaultType; // Hũ tài chính rút tiền
        uint256 amount; // Số tiền yêu cầu
        address recipient; // Địa chỉ ví nhận tiền
        string reason; // Mục đích rút tiền (hiển thị cho con cái kiểm tra)
        uint256 approvalsCount; // Số lượng Guardians đã ký duyệt
        uint256 deadline; // Thời hạn hiệu lực của yêu cầu (ví dụ: 48 giờ)
        bool executed; // Trạng thái đã giải ngân hay chưa
    }

    /// @notice Nhiệm vụ việc nhà trong chương trình Chore-to-Earn
    struct Task {
        uint256 taskId; // Mã định danh nhiệm vụ
        string title; // Tên việc nhà (dọn phòng, rửa bát, đạt điểm 10)
        uint256 rewardAmount; // Số tiền thưởng khi hoàn thành
        address kidAddress; // Địa chỉ ví của con
        bool isCompleted; // Con đã báo cáo hoàn thành hay chưa
        bool isRewarded; // Bố mẹ đã duyệt và chuyển thưởng hay chưa
    }

    /// @notice Phiếu yêu cầu khôi phục ví xã hội khi mất máy
    struct RecoveryRequest {
        address oldWallet; // Ví cũ của người thân (bị mất máy)
        address newWallet; // Ví mới cần cấp quyền thay thế
        uint256 approvalsCount; // Số lượng Guardians đã xác nhận
        bool executed; // Đã thực thi đổi ví chưa
    }

    // -------------------------------------------------------------
    // CUSTOM ERRORS (Tối ưu bytecode & tiết kiệm gas)
    // -------------------------------------------------------------
    error NotFamilyAdmin();
    error NotGuardian();
    error NotAuthorizedMember();
    error ZeroAddress();
    error ZeroAmount();
    error ExceedsFastLimit(uint256 amount, uint256 limit);
    error InsufficientLocalBuffer(uint256 available, uint256 requested);
    error RequestNotFound();
    error RequestAlreadyExecuted();
    error RequestExpired();
    error AlreadyApproved();
    error MinimumGuardiansRequired();
    error InvalidGuardianCount();
    error TaskNotFound();
    error TaskNotCompleted();
    error TaskAlreadyRewarded();
    error KidAddressMismatch();
    error OnlyTeleporterMessenger();
    error RecoveryAlreadyExecuted();

    // -------------------------------------------------------------
    // STATE VARIABLES
    // -------------------------------------------------------------

    /// @notice Địa chỉ người quản trị gia đình (Bố/Mẹ)
    address public familyAdmin;

    /// @notice Hạn mức rút tiền nhanh an toàn (Mặc định: 50 ether tương đương 50 USDC testnet)
    uint256 public fastWithdrawLimit = 50 ether;

    /// @notice Số lượng chữ ký Guardian tối thiểu để giải ngân yêu cầu lớn (Mặc định: 2 trên tổng 3)
    uint256 public constant REQUIRED_APPROVALS = 2;

    /// @notice Danh sách địa chỉ Guardians (các con trưởng thành)
    address[] public guardiansList;

    /// @notice Mapping kiểm tra trạng thái Guardian
    mapping(address => bool) public isGuardian;

    /// @notice Mapping kiểm tra thành viên hợp lệ trong gia đình
    mapping(address => bool) public isFamilyMember;

    /// @notice Số dư đệm thanh khoản 10% tại chỗ trên Family L1 theo từng hũ
    mapping(VaultType => uint256) public localBufferBalances;

    /// @notice Số dư vốn 90% đã chuyển tiếp sang Avalanche C-Chain Vault
    mapping(VaultType => uint256) public remoteYieldBalances;

    /// @notice Quản lý các yêu cầu rút tiền lớn: requestId => WithdrawalRequest
    mapping(uint256 => WithdrawalRequest) public withdrawalRequests;
    uint256 public withdrawalRequestCount;

    /// @notice Kiểm tra một Guardian đã ký duyệt request chưa: requestId => guardian => bool
    mapping(uint256 => mapping(address => bool)) public hasApprovedRequest;

    /// @notice Quản lý nhiệm vụ Chore-to-Earn: taskId => Task
    mapping(uint256 => Task) public chores;
    uint256 public choreCount;

    /// @notice Quản lý yêu cầu khôi phục ví xã hội: recoveryId => RecoveryRequest
    mapping(bytes32 => RecoveryRequest) public recoveryRequests;
    mapping(bytes32 => mapping(address => bool)) public hasApprovedRecovery;

    /// @notice Cấu hình tích hợp Avalanche Teleporter
    ITeleporterMessenger public teleporterMessenger;
    bytes32 public cChainBlockchainId;
    address public yieldVaultAddress;

    // -------------------------------------------------------------
    // EVENTS (Thông báo cho Web3 Client & Frontend)
    // -------------------------------------------------------------
    event FamilyAdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    event MemberUpdated(address indexed member, bool status);

    event FundsDeposited(
        VaultType indexed vaultType,
        address indexed depositor,
        uint256 totalAmount,
        uint256 toBuffer,
        uint256 toBridge
    );

    event FastWithdrawalExecuted(
        VaultType indexed vaultType,
        address indexed recipient,
        uint256 amount
    );

    event WithdrawalRequested(
        uint256 indexed requestId,
        address indexed requester,
        VaultType indexed vaultType,
        uint256 amount,
        address recipient,
        string reason,
        uint256 deadline
    );

    event WithdrawalApproved(
        uint256 indexed requestId,
        address indexed guardian,
        uint256 currentApprovals
    );

    event WithdrawalExecuted(
        uint256 indexed requestId,
        address indexed recipient,
        uint256 amount,
        bool fullyFundedFromLocalBuffer
    );

    event ChoreCreated(
        uint256 indexed taskId,
        string title,
        uint256 rewardAmount,
        address indexed kidAddress
    );
    event ChoreClaimed(uint256 indexed taskId, address indexed kidAddress);
    event ChoreRewarded(uint256 indexed taskId, address indexed kidAddress, uint256 rewardAmount);

    event WalletRecoveryProposed(
        bytes32 indexed recoveryId,
        address indexed oldWallet,
        address indexed newWallet
    );
    event WalletRecoveryApproved(
        bytes32 indexed recoveryId,
        address indexed guardian,
        uint256 approvalsCount
    );
    event WalletRecovered(address indexed oldWallet, address indexed newWallet);

    // -------------------------------------------------------------
    // MODIFIERS
    // -------------------------------------------------------------
    modifier onlyFamilyAdmin() {
        if (msg.sender != familyAdmin) revert NotFamilyAdmin();
        _;
    }

    modifier onlyGuardian() {
        if (!isGuardian[msg.sender]) revert NotGuardian();
        _;
    }

    modifier onlyAuthorizedMember() {
        if (!isFamilyMember[msg.sender] && msg.sender != familyAdmin && !isGuardian[msg.sender]) {
            revert NotAuthorizedMember();
        }
        _;
    }

    // -------------------------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------------------------
    /**
     * @notice Khởi tạo hợp đồng FamilyHub trên Family L1
     * @param _admin Địa chỉ Bố/Mẹ quản trị
     * @param _initialGuardians Danh sách tối thiểu 3 người con bảo hộ
     * @param _teleporterMessenger Địa chỉ hợp đồng Teleporter Messenger (nếu có)
     * @param _cChainBlockchainId Mã Blockchain ID của C-Chain
     * @param _yieldVaultAddress Địa chỉ hợp đồng FamilyYieldVault trên C-Chain
     */
    constructor(
        address _admin,
        address[] memory _initialGuardians,
        address _teleporterMessenger,
        bytes32 _cChainBlockchainId,
        address _yieldVaultAddress
    ) {
        if (_admin == address(0)) revert ZeroAddress();
        if (_initialGuardians.length < 3) revert MinimumGuardiansRequired();

        familyAdmin = _admin;
        isFamilyMember[_admin] = true;

        for (uint256 i = 0; i < _initialGuardians.length; i++) {
            address g = _initialGuardians[i];
            if (g == address(0)) revert ZeroAddress();
            if (isGuardian[g]) revert InvalidGuardianCount();

            isGuardian[g] = true;
            isFamilyMember[g] = true;
            guardiansList.push(g);
            emit GuardianAdded(g);
        }

        teleporterMessenger = ITeleporterMessenger(_teleporterMessenger);
        cChainBlockchainId = _cChainBlockchainId;
        yieldVaultAddress = _yieldVaultAddress;
    }

    // -------------------------------------------------------------
    // 1. QUẢN TRỊ THÀNH VIÊN & SOCIAL RECOVERY
    // -------------------------------------------------------------

    /**
     * @notice Thiết lập địa chỉ người quản trị gia đình mới
     */
    function setFamilyAdmin(address _newAdmin) external onlyFamilyAdmin {
        if (_newAdmin == address(0)) revert ZeroAddress();
        address oldAdmin = familyAdmin;
        familyAdmin = _newAdmin;
        isFamilyMember[_newAdmin] = true;
        emit FamilyAdminChanged(oldAdmin, _newAdmin);
    }

    /**
     * @notice Cập nhật trạng thái thành viên gia đình (ví dụ: đăng ký ví ông bà, con nhỏ)
     */
    function setMemberStatus(address member, bool status) external onlyFamilyAdmin {
        if (member == address(0)) revert ZeroAddress();
        isFamilyMember[member] = status;
        emit MemberUpdated(member, status);
    }

    /**
     * @notice Thay đổi hạn mức rút tiền nhanh an toàn
     */
    function setFastWithdrawLimit(uint256 newLimit) external onlyFamilyAdmin {
        fastWithdrawLimit = newLimit;
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
     * @notice Khôi phục ví xã hội (Social Recovery) khi người thân bị mất điện thoại
     * Yêu cầu tối thiểu >= 2 Guardians xác nhận để đổi ví cũ sang ví mới
     */
    function recoverMemberWallet(address oldWallet, address newWallet) external onlyGuardian {
        if (oldWallet == address(0) || newWallet == address(0)) revert ZeroAddress();
        bytes32 recoveryId = keccak256(abi.encodePacked(oldWallet, newWallet));

        RecoveryRequest storage req = recoveryRequests[recoveryId];
        if (req.executed) revert RecoveryAlreadyExecuted();

        if (req.oldWallet == address(0)) {
            req.oldWallet = oldWallet;
            req.newWallet = newWallet;
            emit WalletRecoveryProposed(recoveryId, oldWallet, newWallet);
        }

        if (hasApprovedRecovery[recoveryId][msg.sender]) revert AlreadyApproved();
        hasApprovedRecovery[recoveryId][msg.sender] = true;
        req.approvalsCount++;

        emit WalletRecoveryApproved(recoveryId, msg.sender, req.approvalsCount);

        // Đạt >= 2 chữ ký phê duyệt: Hoàn tất chuyển đổi ví
        if (req.approvalsCount >= REQUIRED_APPROVALS) {
            req.executed = true;

            // Chuyển quyền thành viên
            isFamilyMember[oldWallet] = false;
            isFamilyMember[newWallet] = true;

            // Nếu ví cũ là Guardian thì đổi vị trí
            if (isGuardian[oldWallet]) {
                isGuardian[oldWallet] = false;
                isGuardian[newWallet] = true;
                for (uint256 i = 0; i < guardiansList.length; i++) {
                    if (guardiansList[i] == oldWallet) {
                        guardiansList[i] = newWallet;
                        break;
                    }
                }
            }

            // Nếu ví cũ là Admin
            if (familyAdmin == oldWallet) {
                familyAdmin = newWallet;
            }

            emit WalletRecovered(oldWallet, newWallet);
        }
    }

    // -------------------------------------------------------------
    // 2. CƠ CHẾ NẠP TIỀN & ĐỆM THANH KHOẢN 10/90
    // -------------------------------------------------------------

    /**
     * @notice Nạp tiền vào hũ tài chính gia đình
     * Phân bổ: 10% giữ tại L1 (Liquid Buffer), 90% gửi C-Chain sinh lời ~8% APY
     * Tính toán chuẩn xác tránh thất thoát số dư do làm tròn
     * @param vaultType Loại hũ tài chính muốn nạp
     */
    function depositToVault(VaultType vaultType) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

        // Tính toán phân bổ không làm tròn số học (No rounding loss)
        uint256 toBridge = (msg.value * 90) / 100;
        uint256 toBuffer = msg.value - toBridge;

        localBufferBalances[vaultType] += toBuffer;
        remoteYieldBalances[vaultType] += toBridge;

        emit FundsDeposited(vaultType, msg.sender, msg.value, toBuffer, toBridge);

        // Gửi thông điệp Teleporter sang Avalanche Fuji C-Chain nếu đã cấu hình
        if (address(teleporterMessenger) != address(0) && yieldVaultAddress != address(0)) {
            bytes memory payload = abi.encode(
                BridgeAction.DEPOSIT,
                vaultType,
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
    // 3. ĐA CHỮ KÝ PHÂN TẦNG CHỐNG LỪA ĐẢO (TIERED MULTISIG)
    // -------------------------------------------------------------

    /**
     * @notice Rút tiền nhỏ nhanh chóng (Fast Withdrawal)
     * Thao tác 1 chạm dành cho ông bà, giải ngân tức thì từ bộ đệm 10% tại chỗ (< 1s, 0 gas fee)
     * @param vaultType Hũ tài chính cần rút
     * @param amount Số tiền muốn rút
     * @param recipient Địa chỉ ví nhận tiền
     */
    function fastWithdraw(
        VaultType vaultType,
        uint256 amount,
        address payable recipient
    ) external nonReentrant onlyAuthorizedMember {
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();

        // Kiểm tra ngưỡng an toàn chống lừa đảo
        if (amount > fastWithdrawLimit) {
            revert ExceedsFastLimit(amount, fastWithdrawLimit);
        }

        // Kiểm tra số dư bộ đệm tại chỗ
        if (localBufferBalances[vaultType] < amount) {
            revert InsufficientLocalBuffer(localBufferBalances[vaultType], amount);
        }

        // Cập nhật số dư trước khi chuyển tiền (Mô hình Checks-Effects-Interactions)
        localBufferBalances[vaultType] -= amount;

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "L1 Fast Transfer Failed");

        emit FastWithdrawalExecuted(vaultType, recipient, amount);
    }

    /**
     * @notice Khởi tạo yêu cầu rút tiền lớn (> 50 USDC hoặc vượt bộ đệm)
     * Đưa vào danh sách chờ xác thực đa chữ ký từ các con
     * @param vaultType Hũ tài chính
     * @param amount Số tiền cần rút
     * @param recipient Địa chỉ ví nhận
     * @param reason Lý do rút tiền (Ví dụ: "Viện phí", "Sửa nhà", "Mua quà")
     */
    function requestLargeWithdrawal(
        VaultType vaultType,
        uint256 amount,
        address recipient,
        string calldata reason
    ) external onlyAuthorizedMember returns (uint256) {
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();

        withdrawalRequestCount++;
        uint256 requestId = withdrawalRequestCount;
        uint256 deadline = block.timestamp + 48 hours;

        withdrawalRequests[requestId] = WithdrawalRequest({
            requestId: requestId,
            requester: msg.sender,
            vaultType: vaultType,
            amount: amount,
            recipient: recipient,
            reason: reason,
            approvalsCount: 0,
            deadline: deadline,
            executed: false
        });

        emit WithdrawalRequested(
            requestId,
            msg.sender,
            vaultType,
            amount,
            recipient,
            reason,
            deadline
        );

        return requestId;
    }

    /**
     * @notice Ký duyệt yêu cầu rút tiền lớn (Dành cho Guardians - các con)
     * Khi đạt đủ >= 2/3 chữ ký, hợp đồng tự động thực thi giải ngân
     * @param requestId Mã yêu cầu rút tiền
     */
    function approveWithdrawal(uint256 requestId) external onlyGuardian nonReentrant {
        WithdrawalRequest storage req = withdrawalRequests[requestId];
        if (req.amount == 0) revert RequestNotFound();
        if (req.executed) revert RequestAlreadyExecuted();
        if (block.timestamp > req.deadline) revert RequestExpired();
        if (hasApprovedRequest[requestId][msg.sender]) revert AlreadyApproved();

        hasApprovedRequest[requestId][msg.sender] = true;
        req.approvalsCount++;

        emit WithdrawalApproved(requestId, msg.sender, req.approvalsCount);

        // Đạt tối thiểu 2/3 chữ ký: Tự động giải ngân ngay lập tức
        if (req.approvalsCount >= REQUIRED_APPROVALS) {
            _executeWithdrawal(req);
        }
    }

    /**
     * @notice Hàm nội bộ thực thi giải ngân sau khi đủ chữ ký đa bảo hộ
     */
    function _executeWithdrawal(WithdrawalRequest storage req) internal {
        req.executed = true;

        uint256 vaultLocal = localBufferBalances[req.vaultType];
        bool fullyFunded = false;

        if (vaultLocal >= req.amount) {
            // Trường hợp 1: Bộ đệm địa phương đủ tiền chi trả
            localBufferBalances[req.vaultType] -= req.amount;
            fullyFunded = true;

            (bool success, ) = payable(req.recipient).call{value: req.amount}("");
            require(success, "L1 Buffer Payout Failed");
        } else {
            // Trường hợp 2: Bộ đệm không đủ, chi trả toàn bộ phần có sẵn + yêu cầu rút từ C-Chain
            uint256 partialFromLocal = vaultLocal;
            uint256 neededFromRemote = req.amount - partialFromLocal;

            if (partialFromLocal > 0) {
                localBufferBalances[req.vaultType] = 0;
                (bool successLocal, ) = payable(req.recipient).call{value: partialFromLocal}("");
                require(successLocal, "L1 Partial Buffer Payout Failed");
            }

            if (remoteYieldBalances[req.vaultType] >= neededFromRemote) {
                remoteYieldBalances[req.vaultType] -= neededFromRemote;
            } else {
                remoteYieldBalances[req.vaultType] = 0;
            }

            // Gửi thông điệp Teleporter sang C-Chain để rút phần thiếu về ví người nhận
            if (address(teleporterMessenger) != address(0) && yieldVaultAddress != address(0)) {
                bytes memory payload = abi.encode(
                    BridgeAction.WITHDRAW,
                    req.vaultType,
                    neededFromRemote,
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
        }

        emit WithdrawalExecuted(req.requestId, req.recipient, req.amount, fullyFunded);
    }

    // -------------------------------------------------------------
    // 4. CHƯƠNG TRÌNH GIÁO DỤC TÀI CHÍNH (CHORE-TO-EARN)
    // -------------------------------------------------------------

    /**
     * @notice Bố mẹ tạo nhiệm vụ việc nhà cho con
     * @param title Tên việc nhà (ví dụ: "Dọn dẹp phòng ngủ cuối tuần")
     * @param rewardAmount Tiền thưởng khi hoàn thành (trích từ hũ KidsSavings)
     * @param kidAddress Ví nhận thưởng của con
     */
    function createChore(
        string calldata title,
        uint256 rewardAmount,
        address kidAddress
    ) external onlyFamilyAdmin returns (uint256) {
        if (rewardAmount == 0) revert ZeroAmount();
        if (kidAddress == address(0)) revert ZeroAddress();

        choreCount++;
        uint256 taskId = choreCount;

        chores[taskId] = Task({
            taskId: taskId,
            title: title,
            rewardAmount: rewardAmount,
            kidAddress: kidAddress,
            isCompleted: false,
            isRewarded: false
        });

        // Tự động cấp quyền thành viên cho con nếu chưa có
        if (!isFamilyMember[kidAddress]) {
            isFamilyMember[kidAddress] = true;
        }

        emit ChoreCreated(taskId, title, rewardAmount, kidAddress);
        return taskId;
    }

    /**
     * @notice Con nhỏ nộp báo cáo hoàn thành nhiệm vụ
     * @param taskId Mã nhiệm vụ
     */
    function claimChoreCompleted(uint256 taskId) external {
        Task storage task = chores[taskId];
        if (task.rewardAmount == 0) revert TaskNotFound();
        if (msg.sender != task.kidAddress) revert KidAddressMismatch();
        require(!task.isCompleted, "Chore already claimed");

        task.isCompleted = true;
        emit ChoreClaimed(taskId, msg.sender);
    }

    /**
     * @notice Bố mẹ xác nhận và trả thưởng từ hũ KidsSavings
     * @param taskId Mã nhiệm vụ
     */
    function verifyAndRewardChore(uint256 taskId) external onlyFamilyAdmin nonReentrant {
        Task storage task = chores[taskId];
        if (task.rewardAmount == 0) revert TaskNotFound();
        if (!task.isCompleted) revert TaskNotCompleted();
        if (task.isRewarded) revert TaskAlreadyRewarded();

        // Kiểm tra số dư đệm trong hũ Tiết kiệm con trẻ
        if (localBufferBalances[VaultType.KidsSavings] < task.rewardAmount) {
            revert InsufficientLocalBuffer(
                localBufferBalances[VaultType.KidsSavings],
                task.rewardAmount
            );
        }

        task.isRewarded = true;
        localBufferBalances[VaultType.KidsSavings] -= task.rewardAmount;

        (bool success, ) = payable(task.kidAddress).call{value: task.rewardAmount}("");
        require(success, "Chore Reward Transfer Failed");

        emit ChoreRewarded(taskId, task.kidAddress, task.rewardAmount);
    }

    // -------------------------------------------------------------
    // 5. CALLBACK TELEPORTER (TIẾP NHẬN THÔNG ĐIỆP TỪ C-CHAIN)
    // -------------------------------------------------------------

    /**
     * @notice Tiếp nhận thông điệp phản hồi từ Avalanche Fuji C-Chain
     */
    function receiveTeleporterMessage(
        bytes32 /* originChainID */,
        address /* originSenderAddress */,
        bytes calldata /* message */
    ) external view override {
        // Kiểm tra bảo mật nguồn gửi nếu messenger được cấu hình
        if (address(teleporterMessenger) != address(0)) {
            if (msg.sender != address(teleporterMessenger)) revert OnlyTeleporterMessenger();
        }
    }

    // -------------------------------------------------------------
    // VIEW HELPERS
    // -------------------------------------------------------------

    /**
     * @notice Lấy danh sách toàn bộ Guardians
     */
    function getGuardians() external view returns (address[] memory) {
        return guardiansList;
    }

    /**
     * @notice Lấy thông tin tổng quan số dư 3 hũ tài chính
     */
    function getVaultOverview(
        VaultType vaultType
    ) external view returns (uint256 localBuffer, uint256 remoteYield, uint256 total) {
        localBuffer = localBufferBalances[vaultType];
        remoteYield = remoteYieldBalances[vaultType];
        total = localBuffer + remoteYield;
    }

    /// @notice Cho phép nhận AVAX trực tiếp bổ sung ngân sách
    receive() external payable {}
}

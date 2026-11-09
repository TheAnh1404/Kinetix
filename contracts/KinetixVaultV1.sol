// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IKinetixVault} from "./interfaces/IKinetixVault.sol";
import {IKinetixVaultFactory} from "./interfaces/IKinetixVaultFactory.sol";

/**
 * @title KinetixVaultV1
 * @notice Smart contract đại diện cho từng Hũ tiền độc lập trong Kinetix OS (EIP-1167 Clone).
 * @dev Mỗi Hũ tiền tự giữ AVAX, tự quản lý sổ cái accountedVaultBalance, cách ly rủi ro tài chính,
 * tuân thủ bất biến: address(this).balance >= accountedVaultBalance.
 */
contract KinetixVaultV1 is IKinetixVault, ReentrancyGuard, Pausable {
    // -------------------------------------------------------------
    // KHỞI TẠO & CẤU HÌNH CỐT LÕI (CORE CONFIGURATION)
    // -------------------------------------------------------------

    /// @notice Cờ kiểm tra trạng thái khởi tạo (ngăn tái khởi tạo)
    bool private _initialized;

    /// @notice Địa chỉ Factory tạo ra clone này
    address public override factory;

    /// @notice Địa chỉ người tạo hũ
    address public override creator;

    /// @notice Bộ quy tắc tài chính của Hũ (SHIELD, MILESTONE, ROSCA, SHARED_GOAL)
    RuleTemplate public override ruleTemplate;

    /// @notice Số lượng chữ ký Guardians tối thiểu để duyệt chi lớn (M trong M/N)
    uint256 public override requiredApprovals;

    /// @notice Hạn mức rút nhanh tức thì cho một lần giao dịch (SHIELD)
    uint256 public override fastWithdrawLimit;

    /// @notice Hạn mức rút nhanh cộng dồn tối đa mỗi ngày (24 giờ)
    uint256 public dailyFastLimit;

    /// @notice Số tiền đã rút nhanh trong ngày hiện tại
    uint256 public currentDayWithdrawn;

    /// @notice Chỉ số ngày của lần rút nhanh gần nhất (block.timestamp / 1 days)
    uint256 public lastWithdrawDay;

    /// @notice Số tiền mục tiêu cần đạt (SHARED_GOAL)
    uint256 public override targetGoalAmount;

    /// @notice Hạn chót hoàn thành mục tiêu (SHARED_GOAL)
    uint256 public override targetDeadline;

    /// @notice Số tiền mỗi thành viên phải đóng trong mỗi kỳ góp vốn (ROSCA)
    uint256 public override roscaRoundContribution;

    /// @notice Thời lượng giữa các kỳ góp vốn tính bằng giây (ROSCA)
    uint256 public override roscaRoundDuration;

    /// @notice Kỳ góp vốn hiện tại (ROSCA, bắt đầu từ 0)
    uint256 public override roscaCurrentRound;

    /// @notice Danh sách thành viên tham gia góp vốn vòng tròn (ROSCA)
    address[] public roscaMembers;

    /// @notice Epoch quyền thành viên (tăng khi thêm/bớt Guardian để vô hiệu chữ ký cũ)
    uint256 public override membershipEpoch;

    // -------------------------------------------------------------
    // SỔ CÁI TÀI CHÍNH & BỘ ĐỆM GIỮ CHỖ (FINANCIAL ACCOUNTING)
    // -------------------------------------------------------------

    /// @notice Tổng số dư AVAX được ghi nhận chính thức thuộc về Hũ
    uint256 public override accountedVaultBalance;

    /// @notice Số tiền đang bị khóa giữ chỗ (cho yêu cầu M/N pending hoặc nhiệm vụ trẻ chưa duyệt)
    uint256 public override reservedBalance;

    // -------------------------------------------------------------
    // PHÂN QUYỀN THÀNH VIÊN (MEMBERSHIP MAPPINGS)
    // -------------------------------------------------------------

    address[] private _guardians;
    address[] private _beneficiaries;

    mapping(address => bool) public override isGuardian;
    mapping(address => bool) public override isBeneficiary;

    // -------------------------------------------------------------
    // YÊU CẦU RÚT TIỀN ĐA CHỮ KÝ (M/N WITHDRAWAL REQUESTS)
    // -------------------------------------------------------------

    uint256 public withdrawalRequestCount;
    mapping(uint256 => WithdrawalRequest) public withdrawalRequests;
    mapping(uint256 => mapping(address => bool)) public hasApprovedWithdrawal;

    // -------------------------------------------------------------
    // NHIỆM VỤ VIỆC NHÀ (CHORE-TO-EARN TASKS)
    // -------------------------------------------------------------

    uint256 public choreCount;
    mapping(uint256 => ChoreTask) public chores;
    mapping(uint256 => mapping(address => bool)) public hasApprovedChore;

    // -------------------------------------------------------------
    // GÓP VỐN XOAY VÒNG (ROSCA ROUNDS)
    // -------------------------------------------------------------

    /// @dev round => member => bool đã góp tiền kỳ này
    mapping(uint256 => mapping(address => bool)) public roscaContributed;
    /// @dev round => số lượng thành viên đã góp
    mapping(uint256 => uint256) public roscaRoundContributionsCount;

    // -------------------------------------------------------------
    // MODIFIERS
    // -------------------------------------------------------------

    modifier onlyGuardian() {
        if (!isGuardian[msg.sender]) revert NotGuardian();
        _;
    }

    modifier onlyBeneficiary() {
        if (!isBeneficiary[msg.sender]) revert NotBeneficiary();
        _;
    }

    // -------------------------------------------------------------
    // CONSTRUCTOR & INITIALIZER
    // -------------------------------------------------------------

    /**
     * @notice Khóa bản thiết kế gốc (implementation) ngay khi deploy để không ai chiếm quyền khởi tạo
     */
    constructor() {
        _initialized = true;
    }

    /**
     * @notice Khởi tạo clone EIP-1167 từ KinetixVaultFactoryV1
     * @dev Chỉ được gọi đúng một lần bởi Factory trong cùng transaction tạo clone.
     */
    function initialize(
        address _factory,
        address _creator,
        RuleTemplate _ruleTemplate,
        uint256 _requiredApprovals,
        uint256 _fastWithdrawLimit,
        uint256 _targetGoalAmount,
        uint256 _targetDeadline,
        uint256 _roscaRoundContribution,
        uint256 _roscaRoundDuration,
        address[] calldata initialGuardians,
        address[] calldata initialBeneficiaries
    ) external {
        if (_initialized) revert AlreadyInitialized();
        _initialized = true;

        if (_factory == address(0) || _creator == address(0)) revert ZeroAddress();
        if (initialGuardians.length == 0) revert ZeroAddress();
        if (_requiredApprovals == 0 || _requiredApprovals > initialGuardians.length) {
            revert QuorumNotMet(_requiredApprovals, initialGuardians.length);
        }

        factory = _factory;
        creator = _creator;
        ruleTemplate = _ruleTemplate;
        requiredApprovals = _requiredApprovals;
        fastWithdrawLimit = _fastWithdrawLimit;
        dailyFastLimit = _fastWithdrawLimit * 2; // Mặc định hạn mức ngày gấp đôi hạn mức một lần
        targetGoalAmount = _targetGoalAmount;
        targetDeadline = _targetDeadline;
        roscaRoundContribution = _roscaRoundContribution;
        roscaRoundDuration = _roscaRoundDuration;
        membershipEpoch = 1;

        // Đăng ký danh sách người bảo hộ (Guardians)
        for (uint256 i = 0; i < initialGuardians.length; i++) {
            address g = initialGuardians[i];
            if (g == address(0)) revert ZeroAddress();
            if (isGuardian[g]) revert DuplicateMember();
            isGuardian[g] = true;
            _guardians.push(g);
        }

        // Đăng ký danh sách người thụ hưởng (Beneficiaries)
        for (uint256 i = 0; i < initialBeneficiaries.length; i++) {
            address b = initialBeneficiaries[i];
            if (b == address(0)) revert ZeroAddress();
            if (isBeneficiary[b]) revert DuplicateMember();
            isBeneficiary[b] = true;
            _beneficiaries.push(b);
        }

        // Nếu là mô hình ROSCA, mặc định các Guardians là thành viên của vòng tròn góp vốn
        if (_ruleTemplate == RuleTemplate.ROSCA) {
            roscaMembers = _guardians;
        }

        emit Initialized(_factory, _ruleTemplate, _creator);
    }

    // -------------------------------------------------------------
    // NẠP TIỀN VÀO HŨ (DEPOSIT)
    // -------------------------------------------------------------

    /**
     * @notice Nạp trực tiếp native AVAX vào Hũ tiền
     * @dev Ghi nhận tức thì vào accountedVaultBalance và phát sự kiện Deposited kèm số dư sau nạp.
     */
    function deposit() external payable override nonReentrant whenNotPaused {
        if (msg.value == 0) revert ZeroAmount();
        accountedVaultBalance += msg.value;
        emit Deposited(msg.sender, msg.value, accountedVaultBalance);
    }

    /**
     * @notice Nhận tiền chuyển giao nội bộ từ một Hũ Kinetix hợp lệ khác
     * @dev Chỉ chấp nhận lời gọi từ một địa chỉ Vault đã được Factory xác thực.
     */
    function depositFromVault(
        address sourceVault,
        bytes32 transferId
    ) external payable override nonReentrant whenNotPaused {
        if (!IKinetixVaultFactory(factory).isVault(msg.sender)) revert InvalidTargetVault();
        if (sourceVault != msg.sender) revert InvalidTargetVault();
        if (msg.value == 0) revert ZeroAmount();

        accountedVaultBalance += msg.value;
        emit VaultTransferIn(sourceVault, msg.value, transferId);
        emit Deposited(sourceVault, msg.value, accountedVaultBalance);
    }

    // -------------------------------------------------------------
    // RÚT TIỀN TỨC THÌ (SHIELD FAST WITHDRAWAL)
    // -------------------------------------------------------------

    /**
     * @notice Rút nhanh tức thì trong hạn mức an toàn dành cho người thụ hưởng (SHIELD)
     * @param amount Số lượng AVAX cần rút
     * @param recipient Địa chỉ ví nhận tiền
     */
    function withdrawFast(
        uint256 amount,
        address payable recipient
    ) external override nonReentrant whenNotPaused {
        if (ruleTemplate != RuleTemplate.SHIELD) revert InvalidTemplate();
        if (!isBeneficiary[msg.sender] && !isGuardian[msg.sender]) revert NotBeneficiary();
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (amount > fastWithdrawLimit) revert ExceedsFastWithdrawLimit(amount, fastWithdrawLimit);

        // Kiểm tra ngân sách cộng dồn trong ngày
        uint256 today = block.timestamp / 1 days;
        if (today > lastWithdrawDay) {
            currentDayWithdrawn = 0;
            lastWithdrawDay = today;
        }

        if (currentDayWithdrawn + amount > dailyFastLimit) {
            revert ExceedsDailyLimit(amount, dailyFastLimit - currentDayWithdrawn);
        }

        // Kiểm tra số dư khả dụng (trừ đi phần tiền đang bị giữ chỗ)
        uint256 avail = availableBalance();
        if (amount > avail) revert InsufficientAvailableBalance(amount, avail);

        // Cập nhật trạng thái trước khi chuyển tiền (Checks-Effects-Interactions)
        currentDayWithdrawn += amount;
        accountedVaultBalance -= amount;

        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit FastWithdrawalExecuted(msg.sender, recipient, amount, accountedVaultBalance);
    }

    // -------------------------------------------------------------
    // RÚT TIỀN LỚN CẦN M/N GUARDIANS DUYỆT (MULTISIG FLOW)
    // -------------------------------------------------------------

    /**
     * @notice Tạo yêu cầu rút tiền lớn cần sự phê duyệt của M/N Guardians
     * @dev Tiền yêu cầu sẽ được khóa ngay vào reservedBalance để đảm bảo luôn đủ thanh khoản chi trả.
     */
    function requestWithdrawal(
        uint256 amount,
        address payable recipient,
        bytes32 memoHash
    ) external override returns (uint256 requestId) {
        if (!isGuardian[msg.sender] && !isBeneficiary[msg.sender]) revert Unauthorized();
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 avail = availableBalance();
        if (amount > avail) revert InsufficientAvailableBalance(amount, avail);

        // Khóa tiền giữ chỗ
        reservedBalance += amount;

        requestId = ++withdrawalRequestCount;
        WithdrawalRequest storage req = withdrawalRequests[requestId];
        req.id = requestId;
        req.recipient = recipient;
        req.amount = amount;
        req.deadline = block.timestamp + 48 hours;
        req.epoch = membershipEpoch;
        req.memoHash = memoHash;

        // Nếu người tạo là Guardian, tự động ghi nhận phiếu duyệt đầu tiên
        if (isGuardian[msg.sender]) {
            req.approvalsCount = 1;
            hasApprovedWithdrawal[requestId][msg.sender] = true;
            emit WithdrawalApproved(requestId, msg.sender, 1, requiredApprovals);
            req.status = (1 >= requiredApprovals) ? RequestStatus.APPROVED : RequestStatus.PENDING;
        } else {
            req.approvalsCount = 0;
            req.status = RequestStatus.PENDING;
        }

        emit WithdrawalRequested(requestId, recipient, amount, req.deadline, memoHash);
    }

    /**
     * @notice Guardian ký duyệt yêu cầu rút tiền on-chain
     * @param requestId Mã định danh yêu cầu
     */
    function approveWithdrawal(uint256 requestId) external override {
        if (!isGuardian[msg.sender]) revert NotGuardian();
        WithdrawalRequest storage req = withdrawalRequests[requestId];
        if (req.id == 0) revert RequestNotFound();
        if (req.status != RequestStatus.PENDING) revert InvalidState();
        if (block.timestamp > req.deadline) revert RequestExpired();
        if (req.epoch != membershipEpoch) revert InvalidState();
        if (hasApprovedWithdrawal[requestId][msg.sender]) revert AlreadyApproved();

        hasApprovedWithdrawal[requestId][msg.sender] = true;
        req.approvalsCount++;

        emit WithdrawalApproved(requestId, msg.sender, req.approvalsCount, requiredApprovals);

        if (req.approvalsCount >= requiredApprovals) {
            req.status = RequestStatus.APPROVED;
        }
    }

    /**
     * @notice Thực thi giải ngân yêu cầu rút tiền đã được phê duyệt đủ M/N
     * @param requestId Mã định danh yêu cầu
     */
    function executeWithdrawal(uint256 requestId) external override nonReentrant whenNotPaused {
        WithdrawalRequest storage req = withdrawalRequests[requestId];
        if (req.id == 0) revert RequestNotFound();
        if (req.status == RequestStatus.EXECUTED) revert RequestAlreadyExecuted();
        if (
            req.status != RequestStatus.APPROVED &&
            (req.status != RequestStatus.PENDING || req.approvalsCount < requiredApprovals)
        ) {
            revert RequestNotApproved();
        }
        if (block.timestamp > req.deadline) revert RequestExpired();
        if (req.epoch != membershipEpoch) revert InvalidState();

        uint256 amount = req.amount;
        address payable recipient = req.recipient;

        if (accountedVaultBalance < amount || reservedBalance < amount) revert InsufficientFunds();

        // Checks-Effects-Interactions: Cập nhật sổ cái trước khi chuyển tiền
        req.status = RequestStatus.EXECUTED;
        reservedBalance -= amount;
        accountedVaultBalance -= amount;

        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit WithdrawalExecuted(requestId, recipient, amount, accountedVaultBalance);
    }

    /**
     * @notice Hủy yêu cầu rút tiền hoặc giải phóng khoản giữ chỗ nếu yêu cầu quá hạn 48h
     */
    function cancelWithdrawal(uint256 requestId) external override {
        WithdrawalRequest storage req = withdrawalRequests[requestId];
        if (req.id == 0) revert RequestNotFound();
        if (req.status != RequestStatus.PENDING && req.status != RequestStatus.APPROVED)
            revert InvalidState();

        bool isExpired = (block.timestamp > req.deadline) || (req.epoch != membershipEpoch);
        if (!isGuardian[msg.sender] && !isExpired && msg.sender != req.recipient)
            revert Unauthorized();

        req.status = isExpired ? RequestStatus.EXPIRED : RequestStatus.CANCELLED;
        reservedBalance -= req.amount;

        emit WithdrawalCancelled(requestId);
    }

    // -------------------------------------------------------------
    // NHIỆM VỤ VIỆC NHÀ (MILESTONE CHORE-TO-EARN)
    // -------------------------------------------------------------

    /**
     * @notice Guardian tạo nhiệm vụ việc nhà kèm quỹ thưởng được giữ chỗ on-chain
     */
    function createChore(
        uint256 reward,
        address assignee,
        bytes32 memoHash
    ) external override returns (uint256 taskId) {
        if (ruleTemplate != RuleTemplate.MILESTONE) revert InvalidTemplate();
        if (!isGuardian[msg.sender]) revert NotGuardian();
        if (assignee == address(0)) revert ZeroAddress();
        if (reward == 0) revert ZeroAmount();

        uint256 avail = availableBalance();
        if (reward > avail) revert InsufficientAvailableBalance(reward, avail);

        reservedBalance += reward;

        taskId = ++choreCount;
        ChoreTask storage task = chores[taskId];
        task.id = taskId;
        task.assignee = assignee;
        task.reward = reward;
        task.approvalsCount = 0;
        task.memoHash = memoHash;
        task.status = ChoreStatus.CREATED;

        emit ChoreCreated(taskId, assignee, reward, memoHash);
    }

    /**
     * @notice Trẻ em báo cáo hoàn thành nhiệm vụ việc nhà
     */
    function claimChore(uint256 taskId) external override {
        ChoreTask storage task = chores[taskId];
        if (task.id == 0) revert RequestNotFound();
        if (task.status != ChoreStatus.CREATED) revert InvalidState();
        if (msg.sender != task.assignee) revert NotAssignee();

        task.status = ChoreStatus.CLAIMED;
        emit ChoreClaimed(taskId, task.assignee);
    }

    /**
     * @notice Guardian xác nhận và giải ngân tiền thưởng cho con
     */
    function approveChore(uint256 taskId) external override nonReentrant whenNotPaused {
        if (!isGuardian[msg.sender]) revert NotGuardian();
        ChoreTask storage task = chores[taskId];
        if (task.id == 0) revert RequestNotFound();
        if (task.status != ChoreStatus.CLAIMED) revert InvalidState();
        if (msg.sender == task.assignee) revert Unauthorized(); // Không cho tự duyệt nhiệm vụ của chính mình
        if (hasApprovedChore[taskId][msg.sender]) revert AlreadyApproved();

        hasApprovedChore[taskId][msg.sender] = true;
        task.approvalsCount++;

        emit ChoreApproved(taskId, msg.sender, task.approvalsCount, requiredApprovals);

        if (task.approvalsCount >= requiredApprovals) {
            task.status = ChoreStatus.PAID;
            uint256 reward = task.reward;
            reservedBalance -= reward;
            accountedVaultBalance -= reward;

            (bool success, ) = payable(task.assignee).call{value: reward}("");
            if (!success) revert TransferFailed();

            emit ChorePaid(taskId, task.assignee, reward, accountedVaultBalance);
        }
    }

    /**
     * @notice Hủy nhiệm vụ việc nhà và giải phóng khoản thưởng đã giữ chỗ
     */
    function cancelChore(uint256 taskId) external override {
        if (!isGuardian[msg.sender]) revert NotGuardian();
        ChoreTask storage task = chores[taskId];
        if (task.id == 0) revert RequestNotFound();
        if (task.status != ChoreStatus.CREATED && task.status != ChoreStatus.CLAIMED)
            revert InvalidState();

        task.status = ChoreStatus.CANCELLED;
        reservedBalance -= task.reward;

        emit ChoreCancelled(taskId);
    }

    // -------------------------------------------------------------
    // GÓP VỐN XOAY VÒNG (ROSCA ROUNDS)
    // -------------------------------------------------------------

    /**
     * @notice Đóng góp tiền định kỳ cho kỳ góp vốn hiện tại
     */
    function contributeRosca() external payable override nonReentrant whenNotPaused {
        if (ruleTemplate != RuleTemplate.ROSCA) revert InvalidTemplate();
        if (!isGuardian[msg.sender] && !isBeneficiary[msg.sender]) revert Unauthorized();
        if (msg.value != roscaRoundContribution) {
            revert RoscaContributionMismatch(msg.value, roscaRoundContribution);
        }
        if (roscaContributed[roscaCurrentRound][msg.sender]) revert RoscaAlreadyContributed();

        roscaContributed[roscaCurrentRound][msg.sender] = true;
        roscaRoundContributionsCount[roscaCurrentRound]++;
        accountedVaultBalance += msg.value;

        emit RoscaContributed(roscaCurrentRound, msg.sender, msg.value);
        emit Deposited(msg.sender, msg.value, accountedVaultBalance);
    }

    /**
     * @notice Giải ngân toàn bộ quỹ góp của kỳ hiện tại cho người nhận được xếp lịch
     */
    function payoutRoscaRound() external override nonReentrant whenNotPaused {
        if (ruleTemplate != RuleTemplate.ROSCA) revert InvalidTemplate();
        if (roscaMembers.length == 0) revert InvalidState();

        uint256 totalMembers = roscaMembers.length;
        if (roscaRoundContributionsCount[roscaCurrentRound] < totalMembers) {
            revert RoscaRoundNotReady();
        }

        address scheduledRecipient = roscaMembers[roscaCurrentRound % totalMembers];
        uint256 payoutAmount = roscaRoundContribution * totalMembers;

        if (accountedVaultBalance < payoutAmount) revert InsufficientFunds();

        uint256 paidRound = roscaCurrentRound;
        roscaCurrentRound++;
        accountedVaultBalance -= payoutAmount;

        (bool success, ) = payable(scheduledRecipient).call{value: payoutAmount}("");
        if (!success) revert TransferFailed();

        emit RoscaRoundPaid(paidRound, scheduledRecipient, payoutAmount, accountedVaultBalance);
    }

    // -------------------------------------------------------------
    // MỤC TIÊU CHUNG (SHARED GOAL WITHDRAWAL)
    // -------------------------------------------------------------

    /**
     * @notice Thực thi rút tiền từ Hũ Mục Tiêu Chung khi đã cán đích hoặc hết hạn thời gian
     */
    function executeGoalWithdrawal(uint256 requestId) external override nonReentrant whenNotPaused {
        if (ruleTemplate != RuleTemplate.SHARED_GOAL) revert InvalidTemplate();
        WithdrawalRequest storage req = withdrawalRequests[requestId];
        if (req.id == 0) revert RequestNotFound();
        if (
            req.status != RequestStatus.APPROVED &&
            (req.status != RequestStatus.PENDING || req.approvalsCount < requiredApprovals)
        ) {
            revert RequestNotApproved();
        }
        if (req.epoch != membershipEpoch) revert InvalidState();

        // Kiểm tra điều kiện: Cán đích mục tiêu HOẶC đã quá hạn thời gian
        bool goalAchieved = (accountedVaultBalance + req.amount >= targetGoalAmount);
        bool deadlinePassed = (targetDeadline > 0 && block.timestamp >= targetDeadline);
        if (!goalAchieved && !deadlinePassed) {
            revert GoalNotReached(accountedVaultBalance + req.amount, targetGoalAmount);
        }

        uint256 amount = req.amount;
        address payable recipient = req.recipient;

        req.status = RequestStatus.EXECUTED;
        reservedBalance -= amount;
        accountedVaultBalance -= amount;

        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit WithdrawalExecuted(requestId, recipient, amount, accountedVaultBalance);
    }

    // -------------------------------------------------------------
    // CHUYỂN GIAO TIỀN GIỮA CÁC HŨ NỘI BỘ (INTER-VAULT TRANSFER)
    // -------------------------------------------------------------

    /**
     * @notice Chuyển AVAX từ Hũ này sang một Hũ Kinetix hợp lệ khác cùng Factory
     */
    function executeVaultTransfer(
        address destinationVault,
        uint256 amount,
        bytes32 transferId
    ) external override nonReentrant whenNotPaused {
        if (!isGuardian[msg.sender]) revert NotGuardian();
        if (destinationVault == address(0) || destinationVault == address(this))
            revert InvalidTargetVault();
        if (!IKinetixVaultFactory(factory).isVault(destinationVault)) revert InvalidTargetVault();
        if (amount == 0) revert ZeroAmount();

        uint256 avail = availableBalance();
        if (amount > avail) revert InsufficientAvailableBalance(amount, avail);

        accountedVaultBalance -= amount;

        IKinetixVault(destinationVault).depositFromVault{value: amount}(address(this), transferId);

        emit VaultTransferOut(destinationVault, amount, transferId);
    }

    // -------------------------------------------------------------
    // QUẢN TRỊ THÀNH VIÊN VÀ TẠM DỪNG (ADMINISTRATION & PAUSE)
    // -------------------------------------------------------------

    function pause() external onlyGuardian {
        _pause();
    }

    function unpause() external onlyGuardian {
        _unpause();
    }

    function addGuardian(address guardian) external onlyGuardian {
        if (guardian == address(0)) revert ZeroAddress();
        if (isGuardian[guardian]) revert DuplicateMember();

        isGuardian[guardian] = true;
        _guardians.push(guardian);
        membershipEpoch++;

        emit MemberAdded(guardian, true, membershipEpoch);
        emit MembershipEpochChanged(membershipEpoch);
    }

    function removeGuardian(address guardian) external onlyGuardian {
        if (!isGuardian[guardian]) revert Unauthorized();
        if (_guardians.length <= requiredApprovals) {
            revert QuorumNotMet(_guardians.length - 1, requiredApprovals);
        }

        isGuardian[guardian] = false;
        for (uint256 i = 0; i < _guardians.length; i++) {
            if (_guardians[i] == guardian) {
                _guardians[i] = _guardians[_guardians.length - 1];
                _guardians.pop();
                break;
            }
        }
        membershipEpoch++;

        emit MemberRemoved(guardian, true, membershipEpoch);
        emit MembershipEpochChanged(membershipEpoch);
    }

    function addBeneficiary(address beneficiary) external onlyGuardian {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (isBeneficiary[beneficiary]) revert DuplicateMember();

        isBeneficiary[beneficiary] = true;
        _beneficiaries.push(beneficiary);

        emit MemberAdded(beneficiary, false, membershipEpoch);
    }

    function removeBeneficiary(address beneficiary) external onlyGuardian {
        if (!isBeneficiary[beneficiary]) revert Unauthorized();

        isBeneficiary[beneficiary] = false;
        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            if (_beneficiaries[i] == beneficiary) {
                _beneficiaries[i] = _beneficiaries[_beneficiaries.length - 1];
                _beneficiaries.pop();
                break;
            }
        }

        emit MemberRemoved(beneficiary, false, membershipEpoch);
    }

    // -------------------------------------------------------------
    // HÀM XEM THÔNG TIN (VIEW FUNCTIONS)
    // -------------------------------------------------------------

    /**
     * @notice Tính toán số dư khả dụng thực tế của Hũ (Số dư sổ cái trừ các khoản đã giữ chỗ)
     */
    function availableBalance() public view override returns (uint256) {
        if (accountedVaultBalance < reservedBalance) return 0;
        return accountedVaultBalance - reservedBalance;
    }

    function getGuardians() external view override returns (address[] memory) {
        return _guardians;
    }

    function getBeneficiaries() external view override returns (address[] memory) {
        return _beneficiaries;
    }

    function getWithdrawalRequest(
        uint256 requestId
    ) external view override returns (WithdrawalRequest memory) {
        return withdrawalRequests[requestId];
    }

    function getChoreTask(uint256 taskId) external view override returns (ChoreTask memory) {
        return chores[taskId];
    }

    // -------------------------------------------------------------
    // CHẶN GỬI TIỀN TRỰC TIẾP KHÔNG QUA HÀM DEPOSIT (AVOID SURPLUS RISK)
    // -------------------------------------------------------------

    receive() external payable {
        revert("Kinetix: use deposit() to send AVAX");
    }

    fallback() external payable {
        revert("Kinetix: direct call not allowed");
    }
}

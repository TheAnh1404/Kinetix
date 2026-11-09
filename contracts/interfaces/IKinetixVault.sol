// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/**
 * @title IKinetixVault
 * @notice Giao diện chuẩn mực cho Smart Contract Hũ Tiền Kinetix V1 (EIP-1167 Clone).
 * @dev Định nghĩa toàn bộ Enums, Structs, Events và Custom Errors của hệ thống Hũ tiền độc lập.
 */
interface IKinetixVault {
    // -------------------------------------------------------------
    // ENUMS
    // -------------------------------------------------------------

    /// @notice 4 Bộ quy tắc tài chính của Hũ Kinetix
    enum RuleTemplate {
        SHIELD, // 0: Hũ An Sinh (Rút nhanh tức thì trong hạn mức, rút lớn cần M/N)
        MILESTONE, // 1: Nhiệm Vụ & Việc Nhà (Chore-to-Earn, quỹ thưởng giữ chỗ on-chain)
        ROSCA, // 2: Góp Vốn Xoay Vòng (Định kỳ góp vốn, nhận tiền theo lượt cố định)
        SHARED_GOAL // 3: Mục Tiêu Chung (Tích lũy đến khi đạt mục tiêu hoặc hết hạn)
    }

    /// @notice Trạng thái của một yêu cầu rút tiền
    enum RequestStatus {
        PENDING, // Đang chờ Guardians ký duyệt
        APPROVED, // Đã đủ M/N chữ ký, sẵn sàng giải ngân
        EXECUTED, // Đã giải ngân thành công tới ví người nhận
        CANCELLED, // Đã bị hủy bởi người tạo hoặc Guardian
        EXPIRED // Đã quá hạn 48 giờ mà chưa thực thi
    }

    /// @notice Trạng thái của nhiệm vụ việc nhà (Chore Task)
    enum ChoreStatus {
        CREATED, // Đã tạo và giữ chỗ quỹ thưởng
        CLAIMED, // Con trẻ đã báo cáo hoàn thành nhiệm vụ
        APPROVED, // Guardian đã xác nhận kết quả
        PAID, // Tiền thưởng đã chuyển vào ví con
        CANCELLED // Nhiệm vụ bị hủy, quỹ thưởng được hoàn về số dư khả dụng
    }

    // -------------------------------------------------------------
    // STRUCTS
    // -------------------------------------------------------------

    /// @notice Cấu trúc lưu trữ yêu cầu rút tiền lớn cần M/N chữ ký
    struct WithdrawalRequest {
        uint256 id;
        address payable recipient;
        uint256 amount;
        uint256 approvalsCount;
        uint256 deadline;
        uint256 epoch;
        bytes32 memoHash;
        RequestStatus status;
    }

    /// @notice Cấu trúc lưu trữ nhiệm vụ việc nhà có thưởng
    struct ChoreTask {
        uint256 id;
        address assignee;
        uint256 reward;
        uint256 approvalsCount;
        bytes32 memoHash;
        ChoreStatus status;
    }

    /// @notice Cấu trúc thông tin một kỳ góp vốn ROSCA
    struct RoscaRoundInfo {
        uint256 round;
        address scheduledRecipient;
        uint256 contributionAmount;
        uint256 totalContributed;
        uint256 contributionsCount;
        bool isPaid;
    }

    // -------------------------------------------------------------
    // CUSTOM ERRORS (Tối ưu gas theo chuẩn EIP-6093)
    // -------------------------------------------------------------

    error AlreadyInitialized();
    error NotInitialized();
    error Unauthorized();
    error NotGuardian();
    error NotBeneficiary();
    error NotAssignee();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientFunds();
    error InsufficientAvailableBalance(uint256 requested, uint256 available);
    error ExceedsFastWithdrawLimit(uint256 requested, uint256 limit);
    error ExceedsDailyLimit(uint256 requested, uint256 remainingToday);
    error RequestNotFound();
    error RequestExpired();
    error RequestAlreadyExecuted();
    error RequestNotApproved();
    error AlreadyApproved();
    error InvalidState();
    error InvalidTemplate();
    error TransferFailed();
    error InvalidTargetVault();
    error QuorumNotMet(uint256 current, uint256 required);
    error RoscaAlreadyContributed();
    error RoscaContributionMismatch(uint256 provided, uint256 required);
    error RoscaRoundNotReady();
    error RoscaAllRoundsCompleted();
    error GoalNotReached(uint256 current, uint256 target);
    error DeadlineNotPassed(uint256 current, uint256 deadline);
    error DeadlinePassed();
    error DuplicateMember();
    error MembershipLimitReached();

    // -------------------------------------------------------------
    // EVENTS (Lịch sử bất biến on-chain)
    // -------------------------------------------------------------

    event Initialized(
        address indexed factory,
        RuleTemplate indexed template,
        address indexed creator
    );
    event Deposited(address indexed depositor, uint256 amount, uint256 balanceAfter);
    event FastWithdrawalExecuted(
        address indexed beneficiary,
        address indexed recipient,
        uint256 amount,
        uint256 balanceAfter
    );
    event WithdrawalRequested(
        uint256 indexed requestId,
        address indexed recipient,
        uint256 amount,
        uint256 deadline,
        bytes32 memoHash
    );
    event WithdrawalApproved(
        uint256 indexed requestId,
        address indexed guardian,
        uint256 approvalsCount,
        uint256 requiredApprovals
    );
    event WithdrawalExecuted(
        uint256 indexed requestId,
        address indexed recipient,
        uint256 amount,
        uint256 balanceAfter
    );
    event WithdrawalCancelled(uint256 indexed requestId);
    event ChoreCreated(
        uint256 indexed taskId,
        address indexed assignee,
        uint256 reward,
        bytes32 memoHash
    );
    event ChoreClaimed(uint256 indexed taskId, address indexed assignee);
    event ChoreApproved(
        uint256 indexed taskId,
        address indexed guardian,
        uint256 approvalsCount,
        uint256 requiredApprovals
    );
    event ChorePaid(
        uint256 indexed taskId,
        address indexed assignee,
        uint256 reward,
        uint256 balanceAfter
    );
    event ChoreCancelled(uint256 indexed taskId);
    event RoscaContributed(uint256 indexed round, address indexed contributor, uint256 amount);
    event RoscaRoundPaid(
        uint256 indexed round,
        address indexed recipient,
        uint256 amount,
        uint256 balanceAfter
    );
    event VaultTransferOut(address indexed destinationVault, uint256 amount, bytes32 transferId);
    event VaultTransferIn(address indexed sourceVault, uint256 amount, bytes32 transferId);
    event MemberAdded(address indexed member, bool guardianRole, uint256 epoch);
    event MemberRemoved(address indexed member, bool guardianRole, uint256 epoch);
    event MembershipEpochChanged(uint256 newEpoch);

    // -------------------------------------------------------------
    // FUNCTION SIGNATURES
    // -------------------------------------------------------------

    function deposit() external payable;
    function depositFromVault(address sourceVault, bytes32 transferId) external payable;
    function withdrawFast(uint256 amount, address payable recipient) external;
    function requestWithdrawal(
        uint256 amount,
        address payable recipient,
        bytes32 memoHash
    ) external returns (uint256 requestId);
    function approveWithdrawal(uint256 requestId) external;
    function executeWithdrawal(uint256 requestId) external;
    function cancelWithdrawal(uint256 requestId) external;
    function createChore(
        uint256 reward,
        address assignee,
        bytes32 memoHash
    ) external returns (uint256 taskId);
    function claimChore(uint256 taskId) external;
    function approveChore(uint256 taskId) external;
    function cancelChore(uint256 taskId) external;
    function contributeRosca() external payable;
    function payoutRoscaRound() external;
    function executeGoalWithdrawal(uint256 requestId) external;
    function executeVaultTransfer(
        address destinationVault,
        uint256 amount,
        bytes32 transferId
    ) external;

    // View Functions
    function accountedVaultBalance() external view returns (uint256);
    function reservedBalance() external view returns (uint256);
    function availableBalance() external view returns (uint256);
    function ruleTemplate() external view returns (RuleTemplate);
    function factory() external view returns (address);
    function creator() external view returns (address);
    function requiredApprovals() external view returns (uint256);
    function fastWithdrawLimit() external view returns (uint256);
    function targetGoalAmount() external view returns (uint256);
    function targetDeadline() external view returns (uint256);
    function roscaRoundContribution() external view returns (uint256);
    function roscaRoundDuration() external view returns (uint256);
    function roscaCurrentRound() external view returns (uint256);
    function membershipEpoch() external view returns (uint256);
    function isGuardian(address member) external view returns (bool);
    function isBeneficiary(address member) external view returns (bool);
    function getGuardians() external view returns (address[] memory);
    function getBeneficiaries() external view returns (address[] memory);
    function getWithdrawalRequest(
        uint256 requestId
    ) external view returns (WithdrawalRequest memory);
    function getChoreTask(uint256 taskId) external view returns (ChoreTask memory);
}

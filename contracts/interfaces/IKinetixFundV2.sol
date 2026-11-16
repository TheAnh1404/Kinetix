// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/**
 * @title IKinetixFundV2
 * @author Kinetix
 * @notice Quỹ AVAX độc lập; quyền tổ chức và danh tính nhóm được quản lý ngoài chain.
 * @dev Các ID chỉ có nghĩa trong chain và địa chỉ quỹ tương ứng. Không tương thích ABI V1.
 */
interface IKinetixFundV2 {
    enum FundKind {
        OPERATING,
        GOAL
    }
    enum Status {
        NONE,
        PENDING,
        APPROVED,
        EXECUTED,
        CANCELLED,
        REJECTED,
        EXPIRED,
        INVALIDATED
    }
    enum Action {
        POLICY,
        PAUSE,
        RESUME,
        CLOSE,
        SURPLUS
    }

    struct Policy {
        uint256 quorum;
        uint256 transactionLimit;
        uint256 dailyLimit;
    }

    struct Member {
        address account;
        uint8 permissions;
        uint256 dailyAllowance;
    }

    struct InitParams {
        FundKind kind;
        uint256 goalTarget;
        uint256 goalDeadline;
        bytes32 termsHash;
        Policy policy;
        Member[] members;
    }

    struct Expense {
        address proposer;
        address recipient;
        uint256 amount;
        uint256 deadline;
        uint256 epoch;
        uint256 approvals;
        bytes32 memoHash;
        Status status;
    }

    struct Governance {
        Action action;
        address proposer;
        address recipient;
        uint256 amount;
        uint256 deadline;
        uint256 epoch;
        uint256 approvals;
        uint256 readyAt;
        bytes32 commitment;
        Status status;
    }

    error Unauthorized();
    error AlreadyInitialized();
    error InvalidConfiguration();
    error InvalidRecipient();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidState();
    error AlreadyVoted();
    error SelfApproval();
    error InsufficientAvailableBalance();
    error SpendingLimitExceeded();
    error FundUnavailable();
    error GoalLocked();
    error TransferFailed();
    error TimelockNotElapsed();
    error DirectTransferDisabled();

    event Initialized(
        address indexed factory,
        address indexed creator,
        FundKind kind,
        bytes32 termsHash
    );
    event Deposited(address indexed contributor, uint256 amount, bytes32 indexed referenceHash);
    event GoalReached(uint256 balance);
    event GoalRefunded(address indexed contributor, uint256 amount);
    event ExpenseProposed(
        uint256 indexed id,
        address indexed proposer,
        address indexed recipient,
        uint256 amount,
        uint256 deadline,
        uint256 epoch,
        bytes32 memoHash
    );
    event ExpenseApproved(uint256 indexed id, address indexed approver, uint256 approvals);
    event ExpenseFinalized(uint256 indexed id, Status status);
    event LimitedPayment(
        address indexed spender,
        address indexed recipient,
        uint256 amount,
        bytes32 memoHash
    );
    event GovernanceProposed(
        uint256 indexed id,
        Action action,
        address indexed proposer,
        uint256 epoch,
        bytes32 commitment
    );
    event GovernanceApproved(
        uint256 indexed id,
        address indexed approver,
        uint256 approvals,
        uint256 readyAt
    );
    event GovernanceFinalized(uint256 indexed id, Status status);
    event PolicyApplied(uint256 indexed epoch, uint256 quorum, bytes32 termsHash);
    event MemberConfigured(
        uint256 indexed epoch,
        address indexed account,
        uint8 permissions,
        uint256 dailyAllowance
    );
    event PauseChanged(bool paused);
    event FundClosed();
    event SurplusPaid(address indexed recipient, uint256 amount);

    /// @notice Khởi tạo nguyên tử qua factory; implementation bị khóa trong constructor.
    /// @param creator Địa chỉ tạo quỹ, không có quyền ngầm.
    /// @param params Cấu hình tài chính và thành viên.
    function initialize(address creator, InitParams calldata params) external;
    /// @notice Góp AVAX; referenceHash không được chứa dữ liệu cá nhân dạng rõ.
    /// @param referenceHash Tham chiếu off-chain, không dùng làm khóa idempotency.
    function deposit(bytes32 referenceHash) external payable;
    /// @notice Đề nghị chi cố định, giữ chỗ tiền đến khi thực thi/hủy/hết hạn/đổi policy.
    /// @param recipient Người nhận cố định.
    /// @param amount Số wei trả.
    /// @param deadline Thời điểm hết hiệu lực Unix seconds.
    /// @param memoHash Commitment nội dung off-chain.
    function proposeExpense(
        address recipient,
        uint256 amount,
        uint256 deadline,
        bytes32 memoHash
    ) external returns (uint256);
    /// @notice Duyệt một lần; người nhận không được bỏ phiếu cho khoản trả cho mình.
    /// @param id ID nội bộ trong quỹ này.
    function approveExpense(uint256 id) external;
    /// @notice Bất kỳ ai có thể thực thi khoản đủ duyệt, còn hiệu lực.
    /// @param id ID nội bộ trong quỹ này.
    function executeExpense(uint256 id) external;
    /// @notice Người đề nghị tự hủy khoản chưa thực thi.
    /// @param id ID nội bộ trong quỹ này.
    function cancelExpense(uint256 id) external;
    /// @notice Một người duyệt độc lập được từ chối khoản đang chờ, kể cả đã đủ phiếu.
    /// @param id ID nội bộ trong quỹ này.
    function rejectExpense(uint256 id) external;
    /// @notice Bất kỳ ai ghi nhận hết hạn hoặc vô hiệu hóa, không giải phóng tiền hai lần.
    /// @param id ID nội bộ trong quỹ này.
    function settleExpense(uint256 id) external;
    /// @notice Chi quỹ hoạt động trong hạn mức giao dịch, thành viên và tổng ngày UTC.
    /// @param recipient Địa chỉ nhận tiền.
    /// @param amount Số wei trả.
    /// @param memoHash Commitment nội dung off-chain.
    function spend(address recipient, uint256 amount, bytes32 memoHash) external;
    /// @notice Hoàn đúng tiền đã góp cho chính người gửi nếu mục tiêu thất bại khi hết hạn.
    function refundFailedGoal() external;
    /// @notice Đề xuất thay toàn bộ policy/thành viên; cần quorum cũ và timelock.
    /// @param policy Quorum và hạn mức mới.
    /// @param members Danh sách quyền thay thế toàn bộ.
    /// @param termsHash Commitment điều khoản mới.
    function proposePolicy(
        Policy calldata policy,
        Member[] calldata members,
        bytes32 termsHash
    ) external returns (uint256);
    /// @notice Đề xuất pause/resume/close hoặc trả surplus; không có quyền admin đơn phương.
    /// @param action Loại thao tác governance, không dùng POLICY ở đây.
    /// @param recipient Người nhận surplus, zero với thao tác khác.
    /// @param amount Số wei surplus, zero với thao tác khác.
    /// @param memoHash Tham chiếu nội dung đề xuất.
    function proposeAction(
        Action action,
        address recipient,
        uint256 amount,
        bytes32 memoHash
    ) external returns (uint256);
    /// @notice Duyệt governance theo epoch hiện tại; surplus loại phiếu người nhận.
    /// @param id ID nội bộ trong quỹ này.
    function approveGovernance(uint256 id) external;
    /// @notice Thực thi governance đã đủ phiếu và đủ thời gian chờ.
    /// @param id ID nội bộ trong quỹ này.
    function executeGovernance(uint256 id) external;
    /// @notice Người đề xuất hủy hoặc người duyệt độc lập từ chối governance.
    /// @param id ID nội bộ trong quỹ này.
    function cancelGovernance(uint256 id) external;
    /// @notice Ghi nhận proposal governance hết hạn hoặc mất hiệu lực.
    /// @param id ID nội bộ trong quỹ này.
    function settleGovernance(uint256 id) external;
    /// @notice Số dư ghi nhận chưa giữ chỗ; không bao gồm AVAX bị ép gửi.
    function availableBalance() external view returns (uint256);
    /// @notice Địa chỉ zero biểu thị native asset, không phải ERC20.
    function asset() external pure returns (address);
    /// @notice Trạng thái hiệu lực đã tính epoch, deadline và số phiếu.
    /// @param id ID nội bộ trong quỹ này.
    function getExpense(uint256 id) external view returns (Expense memory);
    /// @notice Trạng thái governance hiệu lực và thời điểm sớm nhất được thực thi.
    /// @param id ID nội bộ trong quỹ này.
    function getGovernance(uint256 id) external view returns (Governance memory);
    /// @notice Policy và danh sách thành viên hiện hành, tối đa 32 địa chỉ.
    function getConfiguration() external view returns (Policy memory, Member[] memory);
    /// @notice Nội dung policy proposal để client/indexer đối chiếu commitment.
    /// @param id ID nội bộ trong quỹ này.
    function getProposedPolicy(
        uint256 id
    ) external view returns (Policy memory, Member[] memory, bytes32);
}

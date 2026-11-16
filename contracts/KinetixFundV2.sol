// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IKinetixFundV2} from "./interfaces/IKinetixFundV2.sol";

/**
 * @title KinetixFundV2
 * @author Kinetix
 * @notice Quỹ nhóm độc lập cho vận hành và mục tiêu, chỉ giữ native AVAX.
 * @dev Không upgrade, không owner rút tiền và không gọi hợp đồng tùy ý bằng calldata.
 */
contract KinetixFundV2 is IKinetixFundV2, ReentrancyGuard {
    /// @notice Phiên bản contract, độc lập với T1/V1.
    uint256 public constant VERSION = 2;
    /// @notice Bit quyền đề nghị chi.
    uint8 public constant PROPOSE = 1;
    /// @notice Bit quyền duyệt và tham gia governance.
    uint8 public constant APPROVE = 2;
    /// @notice Bit quyền chi trong hạn mức quỹ hoạt động.
    uint8 public constant SPEND = 4;
    /// @notice Giới hạn vòng lặp cấu hình và chi phí gas.
    uint256 public constant MAX_MEMBERS = 32;
    /// @notice Thời gian chờ sau khi governance đủ phiếu.
    uint256 public constant POLICY_DELAY = 1 days;
    /// @notice Thời hạn đề xuất từ lúc tạo, không phải timelock.
    uint256 public constant GOVERNANCE_LIFETIME = 7 days;
    /// @notice Thời hạn tối đa của đề nghị chi.
    uint256 public constant MAX_EXPENSE_LIFETIME = 30 days;

    address private immutable _DEPLOYMENT_FACTORY;
    bool private _initialized;
    /// @notice Factory đã khởi tạo quỹ nguyên tử.
    address public factory;
    /// @notice Người tạo để đối chiếu nguồn gốc, không có quyền ngầm.
    address public creator;
    /// @notice Loại quỹ cố định lúc tạo.
    FundKind public kind;
    /// @notice Số wei mục tiêu bất biến; zero với quỹ hoạt động.
    uint256 public goalTarget;
    /// @notice Hạn nhận góp mục tiêu, tính bằng Unix seconds.
    uint256 public goalDeadline;
    /// @notice Cờ thành công giữ nguyên sau khi số dư đạt mục tiêu.
    bool public goalReached;
    /// @notice Trạng thái dừng các luồng nhận và trả tiền.
    bool public paused;
    /// @notice Đã đóng vĩnh viễn; chỉ xử lý surplus còn được phép.
    bool public closed;
    /// @notice Commitment của điều khoản đã được biểu quyết.
    bytes32 public termsHash;
    /// @notice Phiên bản quyền; tăng để vô hiệu hóa phiếu cũ.
    uint256 public policyEpoch;
    /// @notice Tổng native asset ghi sổ và còn thuộc quỹ.
    uint256 public accountedBalance;
    /// @notice Phần giữ chỗ trong accountedBalance của epoch hiện tại.
    uint256 public reservedBalance;
    /// @notice Số ID đề nghị chi đã tạo.
    uint256 public expenseCount;
    /// @notice Số ID governance đã tạo.
    uint256 public governanceCount;

    Policy private _policy;
    Member[] private _members;
    /// @notice Bitmask khả năng của mỗi địa chỉ trong quỹ.
    mapping(address => uint8) public permissions;
    /// @notice Hạn mức ngày của thành viên được cấp SPEND.
    mapping(address => uint256) public dailyAllowance;
    /// @notice Tổng đã góp; chỉ giảm khi hoàn mục tiêu thất bại, không phải số dư cá nhân.
    mapping(address => uint256) public contributions;
    /// @notice Tổng chi nhanh theo ngày UTC của cả quỹ.
    mapping(uint256 => uint256) public dailySpent;
    /// @notice Tổng chi nhanh theo thành viên và ngày UTC.
    mapping(address => mapping(uint256 => uint256)) public memberDailySpent;
    mapping(uint256 => Expense) private _expenses;
    /// @notice Phiếu đã sử dụng theo ID đề nghị và địa chỉ.
    mapping(uint256 => mapping(address => bool)) public expenseVotes;
    mapping(uint256 => Governance) private _governance;
    /// @notice Phiếu đã sử dụng theo ID governance và địa chỉ.
    mapping(uint256 => mapping(address => bool)) public governanceVotes;
    mapping(uint256 => Policy) private _proposedPolicies;
    mapping(uint256 => Member[]) private _proposedMembers;
    mapping(uint256 => bytes32) private _proposedTerms;
    /// @notice Nonce làm mất hiệu lực lệnh pause/resume cũ.
    uint256 public pauseNonce;
    mapping(uint256 => uint256) private _proposalPauseNonce;

    constructor() {
        _DEPLOYMENT_FACTORY = msg.sender;
        _initialized = true;
    }

    /// @inheritdoc IKinetixFundV2
    function initialize(address initialCreator, InitParams calldata params) external override {
        if (_initialized) revert AlreadyInitialized();
        if (msg.sender != _DEPLOYMENT_FACTORY || initialCreator == address(0))
            revert Unauthorized();
        _validatePolicy(params.policy, params.members);
        if (params.termsHash == bytes32(0)) revert InvalidConfiguration();
        if (params.kind == FundKind.GOAL) {
            if (params.goalTarget == 0 || params.goalDeadline <= block.timestamp)
                revert InvalidConfiguration();
            if (params.policy.transactionLimit != 0 || params.policy.dailyLimit != 0)
                revert InvalidConfiguration();
        } else if (params.goalTarget != 0 || params.goalDeadline != 0)
            revert InvalidConfiguration();
        _initialized = true;
        factory = msg.sender;
        creator = initialCreator;
        kind = params.kind;
        goalTarget = params.goalTarget;
        goalDeadline = params.goalDeadline;
        _applyPolicy(params.policy, params.members, params.termsHash);
        emit Initialized(factory, creator, kind, termsHash);
    }

    /// @dev Gửi tiền phải qua deposit để có định danh khoản góp; forced ETH không ghi sổ.
    receive() external payable {
        revert DirectTransferDisabled();
    }

    /// @inheritdoc IKinetixFundV2
    function deposit(bytes32 referenceHash) external payable override nonReentrant {
        _requireOpen();
        if (msg.value == 0) revert InvalidAmount();
        if (kind == FundKind.GOAL && block.timestamp >= goalDeadline) revert InvalidDeadline();
        accountedBalance += msg.value;
        contributions[msg.sender] += msg.value;
        if (kind == FundKind.GOAL && !goalReached && accountedBalance >= goalTarget) {
            goalReached = true;
            emit GoalReached(accountedBalance);
        }
        emit Deposited(msg.sender, msg.value, referenceHash);
        _checkAccounting();
    }

    /// @inheritdoc IKinetixFundV2
    function proposeExpense(
        address recipient,
        uint256 amount,
        uint256 deadline,
        bytes32 memoHash
    ) external override nonReentrant returns (uint256 id) {
        _requireOpen();
        _requirePermission(PROPOSE);
        _requireGoalUnlocked();
        _validatePayment(recipient, amount);
        if (deadline <= block.timestamp || deadline > block.timestamp + MAX_EXPENSE_LIFETIME)
            revert InvalidDeadline();
        if (amount > availableBalance()) revert InsufficientAvailableBalance();
        id = ++expenseCount;
        _expenses[id] = Expense(
            msg.sender,
            recipient,
            amount,
            deadline,
            policyEpoch,
            0,
            memoHash,
            Status.PENDING
        );
        reservedBalance += amount;
        emit ExpenseProposed(id, msg.sender, recipient, amount, deadline, policyEpoch, memoHash);
        _checkAccounting();
    }

    /// @inheritdoc IKinetixFundV2
    function approveExpense(uint256 id) external override nonReentrant {
        _requireOpen();
        _requirePermission(APPROVE);
        Expense storage request = _liveExpense(id);
        if (msg.sender == request.recipient) revert SelfApproval();
        if (expenseVotes[id][msg.sender]) revert AlreadyVoted();
        expenseVotes[id][msg.sender] = true;
        ++request.approvals;
        emit ExpenseApproved(id, msg.sender, request.approvals);
    }

    /// @inheritdoc IKinetixFundV2
    function executeExpense(uint256 id) external override nonReentrant {
        _requireOpen();
        Expense storage request = _liveExpense(id);
        if (request.approvals < _policy.quorum) revert InvalidState();
        request.status = Status.EXECUTED;
        reservedBalance -= request.amount;
        accountedBalance -= request.amount;
        emit ExpenseFinalized(id, Status.EXECUTED);
        _send(request.recipient, request.amount);
    }

    /// @inheritdoc IKinetixFundV2
    function cancelExpense(uint256 id) external override nonReentrant {
        Expense storage request = _liveExpense(id);
        if (request.proposer != msg.sender) revert Unauthorized();
        _finishExpense(id, request, Status.CANCELLED);
    }

    /// @inheritdoc IKinetixFundV2
    function rejectExpense(uint256 id) external override nonReentrant {
        _requirePermission(APPROVE);
        Expense storage request = _liveExpense(id);
        if (request.recipient == msg.sender) revert SelfApproval();
        _finishExpense(id, request, Status.REJECTED);
    }

    /// @inheritdoc IKinetixFundV2
    function settleExpense(uint256 id) external override nonReentrant {
        Expense storage request = _expenses[id];
        if (request.status != Status.PENDING) revert InvalidState();
        Status effective = _expenseStatus(request);
        if (effective != Status.EXPIRED && effective != Status.INVALIDATED) revert InvalidState();
        // Đổi epoch đã giải phóng toàn bộ reservation cũ: không trừ lần thứ hai.
        if (request.epoch == policyEpoch) reservedBalance -= request.amount;
        request.status = effective;
        emit ExpenseFinalized(id, effective);
        _checkAccounting();
    }

    /// @inheritdoc IKinetixFundV2
    function spend(
        address recipient,
        uint256 amount,
        bytes32 memoHash
    ) external override nonReentrant {
        _requireOpen();
        _requirePermission(SPEND);
        if (kind != FundKind.OPERATING) revert GoalLocked();
        _validatePayment(recipient, amount);
        uint256 day = block.timestamp / 1 days;
        if (
            amount > _policy.transactionLimit ||
            dailySpent[day] + amount > _policy.dailyLimit ||
            memberDailySpent[msg.sender][day] + amount > dailyAllowance[msg.sender]
        ) revert SpendingLimitExceeded();
        if (amount > availableBalance()) revert InsufficientAvailableBalance();
        dailySpent[day] += amount;
        memberDailySpent[msg.sender][day] += amount;
        accountedBalance -= amount;
        emit LimitedPayment(msg.sender, recipient, amount, memoHash);
        _send(recipient, amount);
    }

    /// @inheritdoc IKinetixFundV2
    function refundFailedGoal() external override nonReentrant {
        _requireOpen();
        if (kind != FundKind.GOAL || goalReached || block.timestamp < goalDeadline)
            revert InvalidState();
        uint256 amount = contributions[msg.sender];
        if (amount == 0) revert InvalidAmount();
        contributions[msg.sender] = 0;
        accountedBalance -= amount;
        emit GoalRefunded(msg.sender, amount);
        _send(msg.sender, amount);
    }

    /// @inheritdoc IKinetixFundV2
    function proposePolicy(
        Policy calldata policy,
        Member[] calldata members,
        bytes32 newTermsHash
    ) external override nonReentrant returns (uint256 id) {
        _requirePermission(APPROVE);
        if (closed || newTermsHash == bytes32(0)) revert InvalidState();
        _validatePolicy(policy, members);
        if (kind == FundKind.GOAL && (policy.transactionLimit != 0 || policy.dailyLimit != 0))
            revert InvalidConfiguration();
        bytes32 commitment = keccak256(abi.encode(policy, members, newTermsHash));
        id = _newGovernance(Action.POLICY, address(0), 0, commitment);
        _proposedPolicies[id] = policy;
        _proposedTerms[id] = newTermsHash;
        for (uint256 i; i < members.length; ++i) _proposedMembers[id].push(members[i]);
    }

    /// @inheritdoc IKinetixFundV2
    function proposeAction(
        Action action,
        address recipient,
        uint256 amount,
        bytes32 memoHash
    ) external override nonReentrant returns (uint256) {
        _requirePermission(APPROVE);
        if (action == Action.POLICY) revert InvalidState();
        if (action == Action.SURPLUS) {
            _validatePayment(recipient, amount);
            if (amount > address(this).balance - accountedBalance)
                revert InsufficientAvailableBalance();
        } else {
            if (closed || recipient != address(0) || amount != 0) revert InvalidState();
            if ((action == Action.PAUSE && paused) || (action == Action.RESUME && !paused))
                revert InvalidState();
        }
        return _newGovernance(action, recipient, amount, memoHash);
    }

    /// @inheritdoc IKinetixFundV2
    function approveGovernance(uint256 id) external override nonReentrant {
        _requirePermission(APPROVE);
        Governance storage proposal = _liveGovernance(id);
        if (proposal.action == Action.SURPLUS && proposal.recipient == msg.sender)
            revert SelfApproval();
        if (governanceVotes[id][msg.sender]) revert AlreadyVoted();
        governanceVotes[id][msg.sender] = true;
        ++proposal.approvals;
        if (proposal.approvals == _policy.quorum) {
            uint256 delay =
                proposal.action == Action.PAUSE || proposal.action == Action.RESUME
                    ? 0
                    : POLICY_DELAY;
            proposal.readyAt = block.timestamp + delay;
        }
        emit GovernanceApproved(id, msg.sender, proposal.approvals, proposal.readyAt);
    }

    /// @inheritdoc IKinetixFundV2
    function executeGovernance(uint256 id) external override nonReentrant {
        Governance storage proposal = _liveGovernance(id);
        if (proposal.approvals < _policy.quorum) revert InvalidState();
        if (block.timestamp < proposal.readyAt) revert TimelockNotElapsed();
        proposal.status = Status.EXECUTED;
        Action action = proposal.action;
        if (action == Action.POLICY) {
            if (closed) revert FundUnavailable();
            _applyPolicy(_proposedPolicies[id], _proposedMembers[id], _proposedTerms[id]);
        } else if (action == Action.PAUSE || action == Action.RESUME) {
            if (closed) revert FundUnavailable();
            paused = action == Action.PAUSE;
            ++pauseNonce;
            emit PauseChanged(paused);
        } else if (action == Action.CLOSE) {
            if (closed || paused || accountedBalance != 0 || reservedBalance != 0)
                revert InvalidState();
            closed = true;
            emit FundClosed();
        } else {
            if (paused) revert FundUnavailable();
            if (proposal.amount > address(this).balance - accountedBalance)
                revert InsufficientAvailableBalance();
            emit SurplusPaid(proposal.recipient, proposal.amount);
            _send(proposal.recipient, proposal.amount);
        }
        emit GovernanceFinalized(id, Status.EXECUTED);
        _checkAccounting();
    }

    /// @inheritdoc IKinetixFundV2
    function cancelGovernance(uint256 id) external override nonReentrant {
        Governance storage proposal = _liveGovernance(id);
        Status status = Status.CANCELLED;
        if (proposal.proposer != msg.sender) {
            _requirePermission(APPROVE);
            if (proposal.action == Action.SURPLUS && proposal.recipient == msg.sender)
                revert SelfApproval();
            status = Status.REJECTED;
        }
        proposal.status = status;
        emit GovernanceFinalized(id, status);
    }

    /// @inheritdoc IKinetixFundV2
    function settleGovernance(uint256 id) external override nonReentrant {
        Governance storage proposal = _governance[id];
        if (proposal.status != Status.PENDING) revert InvalidState();
        Status effective = _governanceStatus(id, proposal);
        if (effective != Status.EXPIRED && effective != Status.INVALIDATED) revert InvalidState();
        proposal.status = effective;
        emit GovernanceFinalized(id, effective);
    }

    /// @inheritdoc IKinetixFundV2
    function asset() external pure override returns (address) {
        return address(0);
    }

    /// @inheritdoc IKinetixFundV2
    function availableBalance() public view override returns (uint256) {
        return accountedBalance - reservedBalance;
    }

    /// @inheritdoc IKinetixFundV2
    function getExpense(uint256 id) external view override returns (Expense memory request) {
        request = _expenses[id];
        request.status = _expenseStatus(request);
    }

    /// @inheritdoc IKinetixFundV2
    function getGovernance(uint256 id) external view override returns (Governance memory proposal) {
        proposal = _governance[id];
        proposal.status = _governanceStatus(id, proposal);
    }

    /// @inheritdoc IKinetixFundV2
    function getConfiguration() external view override returns (Policy memory, Member[] memory) {
        return (_policy, _members);
    }

    /// @inheritdoc IKinetixFundV2
    function getProposedPolicy(
        uint256 id
    ) external view override returns (Policy memory, Member[] memory, bytes32) {
        return (_proposedPolicies[id], _proposedMembers[id], _proposedTerms[id]);
    }

    function _newGovernance(
        Action action,
        address recipient,
        uint256 amount,
        bytes32 commitment
    ) private returns (uint256 id) {
        id = ++governanceCount;
        _governance[id] = Governance(
            action,
            msg.sender,
            recipient,
            amount,
            block.timestamp + GOVERNANCE_LIFETIME,
            policyEpoch,
            0,
            0,
            commitment,
            Status.PENDING
        );
        _proposalPauseNonce[id] = pauseNonce;
        emit GovernanceProposed(id, action, msg.sender, policyEpoch, commitment);
    }

    function _applyPolicy(
        Policy memory policy,
        Member[] memory members,
        bytes32 newTermsHash
    ) private {
        for (uint256 i; i < _members.length; ++i) {
            delete permissions[_members[i].account];
            delete dailyAllowance[_members[i].account];
        }
        delete _members;
        _policy = policy;
        termsHash = newTermsHash;
        ++policyEpoch;
        // Chỉ reservation của epoch hiện hành có hiệu lực; số tiền không rời quỹ.
        reservedBalance = 0;
        for (uint256 i; i < members.length; ++i) {
            Member memory member = members[i];
            _members.push(member);
            permissions[member.account] = member.permissions;
            dailyAllowance[member.account] = member.dailyAllowance;
            emit MemberConfigured(
                policyEpoch,
                member.account,
                member.permissions,
                member.dailyAllowance
            );
        }
        emit PolicyApplied(policyEpoch, policy.quorum, termsHash);
    }

    function _validatePolicy(Policy calldata policy, Member[] calldata members) private view {
        if (members.length == 0 || members.length > MAX_MEMBERS || policy.quorum == 0)
            revert InvalidConfiguration();
        if (
            (policy.transactionLimit == 0) != (policy.dailyLimit == 0) ||
            policy.transactionLimit > policy.dailyLimit
        ) revert InvalidConfiguration();
        uint256 approvers;
        for (uint256 i; i < members.length; ++i) {
            Member calldata member = members[i];
            if (
                member.account == address(0) ||
                member.account == address(this) ||
                member.permissions == 0 ||
                member.permissions > 7 ||
                ((member.permissions & SPEND) == 0 && member.dailyAllowance != 0) ||
                ((member.permissions & SPEND) != 0 &&
                    (member.dailyAllowance == 0 || policy.transactionLimit == 0))
            ) revert InvalidConfiguration();
            for (uint256 j; j < i; ++j)
                if (members[j].account == member.account) revert InvalidConfiguration();
            if ((member.permissions & APPROVE) != 0) ++approvers;
        }
        // Có đủ phiếu độc lập ngay cả khi người nhận là một trong các approver.
        if (approvers < 2 || policy.quorum >= approvers) revert InvalidConfiguration();
    }

    function _requirePermission(uint8 permission) private view {
        if ((permissions[msg.sender] & permission) == 0) revert Unauthorized();
    }

    function _requireOpen() private view {
        if (factory == address(0) || paused || closed) revert FundUnavailable();
    }

    function _requireGoalUnlocked() private view {
        if (kind == FundKind.GOAL && !goalReached) revert GoalLocked();
    }

    function _validatePayment(address recipient, uint256 amount) private view {
        if (recipient == address(0) || recipient == address(this)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
    }

    function _liveExpense(uint256 id) private view returns (Expense storage request) {
        request = _expenses[id];
        Status status = _expenseStatus(request);
        if (status != Status.PENDING && status != Status.APPROVED) revert InvalidState();
    }

    function _liveGovernance(uint256 id) private view returns (Governance storage proposal) {
        proposal = _governance[id];
        Status status = _governanceStatus(id, proposal);
        if (status != Status.PENDING && status != Status.APPROVED) revert InvalidState();
    }

    function _expenseStatus(Expense memory request) private view returns (Status) {
        if (request.status != Status.PENDING) return request.status;
        if (request.epoch != policyEpoch) return Status.INVALIDATED;
        if (block.timestamp >= request.deadline) return Status.EXPIRED;
        return request.approvals >= _policy.quorum ? Status.APPROVED : Status.PENDING;
    }

    function _governanceStatus(
        uint256 id,
        Governance memory proposal
    ) private view returns (Status) {
        if (proposal.status != Status.PENDING) return proposal.status;
        if (proposal.epoch != policyEpoch) return Status.INVALIDATED;
        if (closed && proposal.action != Action.SURPLUS) return Status.INVALIDATED;
        if (
            (proposal.action == Action.PAUSE || proposal.action == Action.RESUME) &&
            _proposalPauseNonce[id] != pauseNonce
        ) return Status.INVALIDATED;
        if (block.timestamp >= proposal.deadline) return Status.EXPIRED;
        return proposal.approvals >= _policy.quorum ? Status.APPROVED : Status.PENDING;
    }

    function _finishExpense(uint256 id, Expense storage request, Status status) private {
        request.status = status;
        reservedBalance -= request.amount;
        emit ExpenseFinalized(id, status);
        _checkAccounting();
    }

    function _send(address recipient, uint256 amount) private {
        (bool success, ) = payable(recipient).call{value: amount}("");
        if (!success) revert TransferFailed();
        _checkAccounting();
    }

    function _checkAccounting() private view {
        assert(reservedBalance <= accountedBalance && accountedBalance <= address(this).balance);
    }
}

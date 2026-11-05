// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VaultCashflow
 * @notice Kho AVAX T1 cùng chain với Hub. Owner chỉ quản trị pause, không chi tiền
 * hoặc thay controller đã gắn. Mọi nghĩa vụ chi phải đi qua policy Hub.
 */
contract VaultCashflow is Ownable, Pausable, ReentrancyGuard {
    struct VaultLedger {
        uint256 totalBalance;
        uint256 l1BufferBalance;
        uint256 cChainPrincipal;
        uint256 bufferRatioBps;
        bool isInitialized;
    }

    error NotController();
    error ZeroAddress();
    error ZeroAmount();
    error VaultNotInitialized();
    error ConfigurationLocked();
    error FeatureDisabled();
    error InsufficientVaultBalance(uint256 available, uint256 requested);
    error TransferFailed();

    string public constant deploymentVersion = "2.0.0-t1";
    address public controller;
    uint256 public totalLiabilities;
    uint256 public initializedVaults;
    mapping(uint256 => VaultLedger) public ledgers;

    event ControllerUpdated(address indexed oldController, address indexed newController);
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

    modifier onlyController() {
        if (msg.sender != controller) revert NotController();
        _;
    }

    constructor(
        address initialOwner,
        address initialController,
        address messenger,
        bytes32 remoteId,
        address remoteVault
    ) Ownable(initialOwner) {
        if (messenger != address(0) || remoteId != bytes32(0) || remoteVault != address(0))
            revert FeatureDisabled();
        if (initialController != address(0) && initialController.code.length == 0)
            revert ZeroAddress();
        controller = initialController;
    }

    /// @notice Wiring chỉ một lần, không cho owner đổi đích chi khi hũ đã có vốn.
    function setController(address next) external onlyOwner {
        if (controller != address(0) || initializedVaults != 0) revert ConfigurationLocked();
        if (next.code.length == 0) revert ZeroAddress();
        controller = next;
        emit ControllerUpdated(address(0), next);
    }

    function pause() external onlyOwner {
        _pause();
    }
    function unpause() external onlyOwner {
        _unpause();
    }

    function initializeVaultLedger(
        uint256 vaultId,
        uint256 bufferRatioBps
    ) external onlyController whenNotPaused {
        if (vaultId == 0 || ledgers[vaultId].isInitialized) revert ConfigurationLocked();
        if (bufferRatioBps != 10000) revert FeatureDisabled();
        ledgers[vaultId] = VaultLedger(0, 0, 0, 10000, true);
        initializedVaults++;
        emit VaultLedgerInitialized(vaultId, 10000);
    }

    function deposit(
        uint256 vaultId,
        address depositor
    ) external payable onlyController nonReentrant whenNotPaused {
        if (msg.value == 0) revert ZeroAmount();
        if (depositor == address(0)) revert ZeroAddress();
        VaultLedger storage ledger = ledgers[vaultId];
        if (!ledger.isInitialized) revert VaultNotInitialized();
        ledger.totalBalance += msg.value;
        ledger.l1BufferBalance += msg.value;
        totalLiabilities += msg.value;
        emit FundsDeposited(vaultId, depositor, msg.value, msg.value, 0);
    }

    function executeWithdrawal(
        uint256 vaultId,
        address recipient,
        uint256 amount
    ) external onlyController nonReentrant whenNotPaused returns (bool) {
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();
        VaultLedger storage ledger = ledgers[vaultId];
        if (!ledger.isInitialized) revert VaultNotInitialized();
        if (amount > ledger.totalBalance)
            revert InsufficientVaultBalance(ledger.totalBalance, amount);
        ledger.totalBalance -= amount;
        ledger.l1BufferBalance -= amount;
        totalLiabilities -= amount;
        (bool success, ) = payable(recipient).call{value: amount}("");
        if (!success) revert TransferFailed();
        emit FundsWithdrawn(vaultId, recipient, amount, true);
        return true;
    }

    /// @notice Chưa có policy ERC20/bridge đầy đủ ở T1 nên khóa mọi entry point.
    function depositToken(uint256, address, uint256, address) external pure {
        revert FeatureDisabled();
    }
    function executeTokenWithdrawal(uint256, address, address, uint256) external pure {
        revert FeatureDisabled();
    }
    function getTokenBalance(uint256, address) external pure returns (uint256) {
        return 0;
    }
    function setTeleporterConfig(address, bytes32, address) external pure {
        revert FeatureDisabled();
    }

    function getVaultLedger(uint256 vaultId) external view returns (VaultLedger memory) {
        return ledgers[vaultId];
    }
    function getVaultBalances(
        uint256 vaultId
    ) external view returns (uint256, uint256, uint256, uint256) {
        VaultLedger storage ledger = ledgers[vaultId];
        return (ledger.totalBalance, ledger.l1BufferBalance, 0, ledger.bufferRatioBps);
    }

    /// @notice Chuyển thẳng là surplus, không tự ghi thành tài sản hũ.
    receive() external payable {}
}

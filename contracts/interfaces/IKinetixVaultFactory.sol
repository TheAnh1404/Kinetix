// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IKinetixVault} from "./IKinetixVault.sol";

/**
 * @title IKinetixVaultFactory
 * @notice Giao diện chuẩn mực cho Smart Contract Kinetix Vault Factory V1.
 * @dev Quản lý việc tạo EIP-1167 Minimal Clones và làm on-chain registry tra cứu tính hợp lệ của Hũ.
 */
interface IKinetixVaultFactory {
    // -------------------------------------------------------------
    // STRUCTS & ENUMS
    // -------------------------------------------------------------

    struct VaultParams {
        IKinetixVault.RuleTemplate template;
        uint256 requiredApprovals;
        uint256 fastWithdrawLimit;
        uint256 targetGoalAmount;
        uint256 targetDeadline;
        uint256 roscaRoundContribution;
        uint256 roscaRoundDuration;
        address[] guardians;
        address[] beneficiaries;
    }

    // -------------------------------------------------------------
    // CUSTOM ERRORS
    // -------------------------------------------------------------

    error ImplementationZeroAddress();
    error InvalidQuorum();
    error ZeroGuardians();
    error GuardianZeroAddress();
    error BeneficiaryZeroAddress();
    error DuplicateGuardian(address guardian);
    error DuplicateBeneficiary(address beneficiary);
    error InvalidGoalParams();
    error InvalidRoscaParams();
    error FactoryPaused();

    // -------------------------------------------------------------
    // EVENTS
    // -------------------------------------------------------------

    event VaultCreated(
        uint256 indexed vaultId,
        address indexed vaultAddress,
        address indexed creator,
        IKinetixVault.RuleTemplate template,
        uint256 version,
        bytes32 configHash
    );

    // -------------------------------------------------------------
    // FUNCTION SIGNATURES
    // -------------------------------------------------------------

    function createVault(
        VaultParams calldata params,
        bytes32 configHash
    ) external returns (address vaultAddress, uint256 vaultId);

    function isVault(address vault) external view returns (bool);
    function implementation() external view returns (address);
    function getVaultCount() external view returns (uint256);
    function allVaults(uint256 index) external view returns (address);
    function getVaultsByCreator(address creator) external view returns (address[] memory);
}

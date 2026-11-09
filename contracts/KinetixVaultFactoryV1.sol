// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IKinetixVault} from "./interfaces/IKinetixVault.sol";
import {IKinetixVaultFactory} from "./interfaces/IKinetixVaultFactory.sol";
import {KinetixVaultV1} from "./KinetixVaultV1.sol";

/**
 * @title KinetixVaultFactoryV1
 * @notice Factory triển khai các Hũ tiền Kinetix V1 theo chuẩn EIP-1167 Minimal Clones.
 * @dev Đảm bảo tính nguyên tử tuyệt đối: Tạo clone và gọi initialize() trong cùng 1 transaction,
 * duy trì On-Chain Registry xác thực các Hũ tiền hợp lệ của hệ sinh thái Kinetix.
 */
contract KinetixVaultFactoryV1 is IKinetixVaultFactory, Ownable, Pausable {
    using Clones for address;

    // -------------------------------------------------------------
    // CONSTANTS & STATE VARIABLES
    // -------------------------------------------------------------

    /// @notice Phiên bản Factory V1
    uint256 public constant VERSION = 1;

    /// @notice Địa chỉ smart contract logic mẫu (Implementation)
    address public immutable override implementation;

    /// @notice Tổng số lượng Hũ tiền đã được tạo ra
    uint256 public override getVaultCount;

    /// @notice Sổ tra cứu xác thực một địa chỉ có phải là Hũ tiền do Factory này tạo ra hay không
    mapping(address => bool) public override isVault;

    /// @notice Danh sách tuần tự tất cả địa chỉ Hũ tiền
    address[] private _allVaults;

    /// @notice Danh sách Hũ tiền được tạo bởi một địa chỉ người dùng
    mapping(address => address[]) private _vaultsByCreator;

    // -------------------------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------------------------

    /**
     * @notice Khởi tạo Factory với địa chỉ Implementation bất biến
     * @param _implementation Địa chỉ hợp đồng KinetixVaultV1 đã deploy
     */
    constructor(address _implementation) Ownable(msg.sender) {
        if (_implementation == address(0) || _implementation.code.length == 0) {
            revert ImplementationZeroAddress();
        }
        implementation = _implementation;
    }

    // -------------------------------------------------------------
    // CORE FUNCTION: TẠO HŨ TIỀN MỚI NGUYÊN TỬ (ATOMIC CLONE CREATION)
    // -------------------------------------------------------------

    /**
     * @notice Khởi tạo Hũ tiền EIP-1167 Clone mới và cấu hình nguyên tử
     * @param params Bộ tham số cấu hình chính sách của Hũ tiền
     * @param configHash Mã băm xác thực cấu hình bổ sung off-chain
     * @return vaultAddress Địa chỉ hợp đồng Hũ tiền mới
     * @return vaultId Mã số thứ tự của Hũ
     */
    function createVault(
        VaultParams calldata params,
        bytes32 configHash
    ) external override whenNotPaused returns (address vaultAddress, uint256 vaultId) {
        // 1. Kiểm tra tính hợp lệ của tham số đầu vào
        if (params.guardians.length == 0) revert ZeroGuardians();
        if (params.requiredApprovals == 0 || params.requiredApprovals > params.guardians.length) {
            revert InvalidQuorum();
        }

        if (params.template == IKinetixVault.RuleTemplate.SHARED_GOAL) {
            if (params.targetGoalAmount == 0) revert InvalidGoalParams();
        } else if (params.template == IKinetixVault.RuleTemplate.ROSCA) {
            if (params.roscaRoundContribution == 0 || params.guardians.length < 2) {
                revert InvalidRoscaParams();
            }
        }

        // 2. Tạo EIP-1167 Minimal Clone từ implementation cố định
        vaultAddress = implementation.clone();

        // 3. Khởi tạo trạng thái nguyên tử ngay lập tức
        KinetixVaultV1(payable(vaultAddress)).initialize(
            address(this),
            msg.sender,
            params.template,
            params.requiredApprovals,
            params.fastWithdrawLimit,
            params.targetGoalAmount,
            params.targetDeadline,
            params.roscaRoundContribution,
            params.roscaRoundDuration,
            params.guardians,
            params.beneficiaries
        );

        // 4. Đăng ký Hũ vào On-Chain Registry
        unchecked {
            getVaultCount++;
        }
        vaultId = getVaultCount;

        isVault[vaultAddress] = true;
        _allVaults.push(vaultAddress);
        _vaultsByCreator[msg.sender].push(vaultAddress);

        // 5. Phát sự kiện bất biến phục vụ Indexer / Database
        emit VaultCreated(vaultId, vaultAddress, msg.sender, params.template, VERSION, configHash);
    }

    // -------------------------------------------------------------
    // VIEW FUNCTIONS
    // -------------------------------------------------------------

    function allVaults(uint256 index) external view override returns (address) {
        require(index < _allVaults.length, "Index out of bounds");
        return _allVaults[index];
    }

    function getVaultsByCreator(address creator) external view override returns (address[] memory) {
        return _vaultsByCreator[creator];
    }

    // -------------------------------------------------------------
    // QUẢN TRỊ VIÊN (EMERGENCY PAUSE)
    // -------------------------------------------------------------

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}

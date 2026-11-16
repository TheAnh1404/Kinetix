// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {KinetixFundV2} from "./KinetixFundV2.sol";
import {IKinetixFundV2} from "./interfaces/IKinetixFundV2.sol";

/**
 * @title KinetixFundFactoryV2
 * @author Kinetix
 * @notice Tạo quỹ độc lập nguyên tử; factory không có admin hay quyền trên tiền của quỹ.
 */
contract KinetixFundFactoryV2 {
    /// @notice Phiên bản registry V2.
    uint256 public constant VERSION = 2;
    /// @notice Logic bất biến được tạo bởi chính factory.
    address public immutable implementation;
    /// @notice Tổng số quỹ đã tạo thành công.
    uint256 public fundCount;
    /// @notice Xác nhận nguồn gốc địa chỉ quỹ.
    mapping(address => bool) public isFund;
    /// @notice Registry theo ID, bắt đầu từ một.
    mapping(uint256 => address) public funds;

    event FundCreated(
        uint256 indexed fundId,
        address indexed fund,
        address indexed creator,
        IKinetixFundV2.FundKind kind,
        uint256 version,
        bytes32 configurationHash
    );

    constructor() {
        implementation = address(new KinetixFundV2());
    }

    /// @notice Tạo clone và khởi tạo trong cùng transaction; revert toàn bộ khi cấu hình sai.
    /// @param params Cấu hình đầy đủ được hash trong event.
    /// @return fund Địa chỉ clone đã khởi tạo.
    /// @return fundId ID trong registry factory này.
    function createFund(
        IKinetixFundV2.InitParams calldata params
    ) external returns (address fund, uint256 fundId) {
        fund = Clones.clone(implementation);
        IKinetixFundV2(fund).initialize(msg.sender, params);
        fundId = ++fundCount;
        isFund[fund] = true;
        funds[fundId] = fund;
        emit FundCreated(
            fundId,
            fund,
            msg.sender,
            params.kind,
            VERSION,
            keccak256(abi.encode(params))
        );
    }
}

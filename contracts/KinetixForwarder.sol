// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title KinetixForwarder
 * @author Kinetix Team (Avalanche Team1 Vietnam)
 * @notice Hợp đồng Trusted Forwarder EIP-2771 phục vụ Meta-Transactions 0 gas cho Ông Bà và Con Nhỏ trên Family L1.
 * Cơ chế hoạt động:
 * 1. Thành viên phụ thuộc (Ông Bà/Trẻ Nhỏ) ký thông điệp EIP-712 ngoài chuỗi thông qua Passkey (WebAuthn) hoặc mã PIN/Session.
 * 2. Backend Relayer nhận chữ ký và gọi `execute(req, signature)` trên Forwarder.
 * 3. Forwarder xác thực chữ ký của `req.from`, tăng nonce chống replay, và nối 20 bytes địa chỉ người gửi vào cuối calldata theo chuẩn ERC-2771.
 * 4. Hợp đồng mục tiêu (FamilyHub.sol) đọc `_msgSender()` để nhận diện chính xác danh tính người dùng mà không cần ví Core Wallet trực tiếp.
 */
contract KinetixForwarder {
    // -------------------------------------------------------------
    // STRUCTS & CONSTANTS
    // -------------------------------------------------------------

    /// @notice Cấu trúc yêu cầu chuyển tiếp Meta-Transaction
    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 nonce;
        uint256 deadline;
        bytes data;
    }

    /// @notice Typehash định nghĩa cấu trúc dữ liệu theo chuẩn EIP-712
    bytes32 public constant FORWARD_REQUEST_TYPEHASH = keccak256(
        "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,uint256 deadline,bytes data)"
    );

    /// @notice Domain Separator chống tấn công replay giữa các mạng khác nhau
    bytes32 public immutable DOMAIN_SEPARATOR;

    /// @notice Quản lý số thứ tự giao dịch (nonce) theo từng địa chỉ ví
    mapping(address => uint256) public nonces;

    // -------------------------------------------------------------
    // CUSTOM ERRORS & EVENTS
    // -------------------------------------------------------------
    error RequestExpired();
    error InvalidSigner();
    error InvalidNonce();
    error TargetCallFailed(bytes returnData);

    event ForwardExecuted(
        address indexed from,
        address indexed to,
        bool success,
        bytes returnData
    );

    // -------------------------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------------------------
    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("KinetixForwarder")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    // -------------------------------------------------------------
    // VIEW FUNCTIONS
    // -------------------------------------------------------------

    /**
     * @notice Lấy nonce hiện tại của một địa chỉ ví
     */
    function getNonce(address from) external view returns (uint256) {
        return nonces[from];
    }

    /**
     * @notice Băm dữ liệu yêu cầu ForwardRequest theo chuẩn EIP-712
     */
    function hashRequest(ForwardRequest calldata req) public view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        FORWARD_REQUEST_TYPEHASH,
                        req.from,
                        req.to,
                        req.value,
                        req.gas,
                        req.nonce,
                        req.deadline,
                        keccak256(req.data)
                    )
                )
            )
        );
    }

    /**
     * @notice Kiểm tra tính hợp lệ của chữ ký trước khi phát giao dịch
     */
    function verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool) {
        if (req.deadline < block.timestamp) return false;
        if (req.nonce != nonces[req.from]) return false;

        bytes32 digest = hashRequest(req);
        address recovered = _recoverSigner(digest, signature);
        return (recovered != address(0) && recovered == req.from);
    }

    // -------------------------------------------------------------
    // EXECUTE META-TRANSACTION
    // -------------------------------------------------------------

    /**
     * @notice Thực thi Meta-Transaction ủy quyền thay mặt người ký
     * @param req Yêu cầu giao dịch
     * @param signature Chữ ký số EIP-712 của người gửi
     */
    function execute(
        ForwardRequest calldata req,
        bytes calldata signature
    ) external payable returns (bool success, bytes memory returnData) {
        if (req.deadline < block.timestamp) revert RequestExpired();
        if (req.nonce != nonces[req.from]) revert InvalidNonce();

        bytes32 digest = hashRequest(req);
        address recovered = _recoverSigner(digest, signature);
        if (recovered == address(0) || recovered != req.from) {
            revert InvalidSigner();
        }

        // Tăng nonce chống replay
        nonces[req.from]++;

        // Đóng gói calldata chuẩn ERC-2771: nối req.from (20 bytes) vào cuối calldata
        bytes memory dataWithSender = abi.encodePacked(req.data, req.from);

        uint256 gasLimit = req.gas > 0 ? req.gas : gasleft();
        (success, returnData) = req.to.call{value: req.value, gas: gasLimit}(dataWithSender);

        emit ForwardExecuted(req.from, req.to, success, returnData);

        if (!success) {
            revert TargetCallFailed(returnData);
        }
    }

    // -------------------------------------------------------------
    // INTERNAL UTILITIES
    // -------------------------------------------------------------

    /**
     * @dev Khôi phục địa chỉ ví từ băm digest và chữ ký ECDSA
     */
    function _recoverSigner(bytes32 digest, bytes calldata sig) internal pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);
        return ecrecover(digest, v, r, s);
    }

    /// @notice Hỗ trợ nhận AVAX nếu có hoàn trả tiền thừa
    receive() external payable {}
}

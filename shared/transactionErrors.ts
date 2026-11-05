/** HTTP 409 có thể chỉ là finality chưa tới; chỉ receipt revert mới là thất bại on-chain. */
export function syncRetryPolicy(status: number, code?: string) {
  const pending = ["RECEIPT_PENDING", "RECEIPT_NOT_FINALIZED", "OPERATION_PENDING", "RPC_UNAVAILABLE"].includes(code || "");
  return { retryable: ![401, 403].includes(status) && (pending || status === 429 || status >= 500), retryAfter: status === 429 ? 30 : 5 };
}

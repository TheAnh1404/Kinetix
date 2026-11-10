export type TreasuryPurpose = "SHIELD" | "MILESTONE" | "ROSCA" | "SAVINGS";
export type TreasuryPolicy = {
  kind: TreasuryPurpose;
  beneficiaries: string[];
  guardians: string[];
  quorum: number;
  dailyLimitWei: string;
  contributionWei: string;
  durationSeconds: number;
  round: number;
  roundStartedAt: string;
  goalName: string;
  goalWei: string;
};
export const businessLabels: Record<string, string> = {
  TODO: "Cần làm",
  RETURNED: "Cần làm lại",
  SUBMITTED: "Chờ người thân",
  PENDING: "Chờ duyệt",
  APPROVED: "Đã đủ duyệt",
  PAYING: "Chờ thanh toán",
  PAID: "Đã hoàn tất",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
  EXPIRED: "Đã hết hạn",
};
export const paymentLabels: Record<string, string> = {
  READY: "Chờ ký Core",
  SUBMITTED: "Chờ mạng và cập nhật sổ",
  CONFIRMED: "Đã xác nhận",
  REVERTED: "Giao dịch thất bại",
  CANCELLED: "Đã hủy giao dịch",
};
export function exactContribution(wei: string) {
  const value = BigInt(wei);
  const whole = value / 10n ** 18n;
  const fraction = (value % 10n ** 18n)
    .toString()
    .padStart(18, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

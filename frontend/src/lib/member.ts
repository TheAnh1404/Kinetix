import { formatEther, parseEther } from "viem";
import { RoleType } from "@/types";

export function parseAmount(value: string): bigint {
  const normalized = value.trim().replace(",", ".");
  if (!/^(0|[1-9]\d{0,19})(\.\d{1,18})?$/.test(normalized))
    throw new Error("Nhập số tiền hợp lệ, tối đa 18 chữ số thập phân.");
  const amount = parseEther(normalized);
  if (amount <= 0n) throw new Error("Số tiền cần lớn hơn 0.");
  return amount;
}
export function amountLabel(value: string | number = "0") {
  // Không làm tròn số tiền thật thành 0 và không dùng Number trong luồng ký.
  const [whole, decimal] = String(value).split(".");
  const fraction = decimal?.replace(/0+$/, "");
  return `${whole}${fraction ? `,${fraction}` : ""}`;
}
export const nativeAmount = (amount: bigint) => formatEther(amount);
export function memberHome(role?: RoleType) {
  return role === "ELDERLY"
    ? "/dashboard/elderly"
    : role === "CHILD"
      ? "/dashboard/kids"
      : "/dashboard/guardian";
}
export function requestStatus(request: {
  status: string;
  deadline?: string | null;
  approvalsCount: number;
  requiredApprovals: number;
}) {
  if (request.status === "EXECUTED") return "Đã rút về ví";
  if (request.status === "REJECTED") return "Yêu cầu bị từ chối";
  if (request.deadline && Date.parse(request.deadline) < Date.now())
    return "Đã hết hạn";
  if (request.status === "APPROVED") return "Đủ duyệt, đang kiểm tra chi trả";
  return `Chờ gia đình duyệt · ${request.approvalsCount}/${request.requiredApprovals}`;
}

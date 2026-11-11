import { DemoGuardian, DemoPersona } from "./demoPersonas";

export interface JudgeDemoState {
  persona: DemoPersona;
  shield: bigint;
  buffer: bigint;
  withdrawnToday: bigint;
  pending: null | { amount: bigint; approvals: DemoGuardian[]; paid: boolean };
  chore: "TODO" | "SUBMITTED" | "REWARDED";
  choreApprovals: DemoGuardian[];
  reward: bigint;
  jars: { id: number; name: string; bufferRatioBps: number }[];
  notice: string;
}
export const initialJudgeDemo = (): JudgeDemoState => ({
  persona: "admin",
  shield: 1200n,
  buffer: 120n,
  withdrawnToday: 0n,
  pending: null,
  chore: "TODO",
  choreApprovals: [],
  reward: 0n,
  jars: [
    { id: 1, name: "Quỹ Hưu Trí & Báo Hiếu", bufferRatioBps: 1000 },
    { id: 2, name: "Heo đất & Học tập của Bé Na", bufferRatioBps: 1000 },
  ],
  notice:
    "Chọn một nhân vật để bắt đầu. Đây là phiên trình diễn cục bộ, không chuyển tài sản thật.",
});
export type JudgeDemoAction =
  | { type: "switch"; persona: DemoPersona }
  | { type: "fast"; amount: bigint }
  | { type: "request"; amount: bigint }
  | { type: "approve"; guardian: DemoGuardian }
  | { type: "claim" }
  | { type: "reward"; guardian: DemoGuardian }
  | { type: "create"; name: string; bufferRatioBps: number }
  | { type: "outsider" }
  | { type: "reset" };

/** Máy trạng thái demo độc lập: không gọi API tài chính và không sửa authorization. */
export function judgeDemoReducer(
  state: JudgeDemoState,
  action: JudgeDemoAction,
): JudgeDemoState {
  const reject = (notice: string) => ({ ...state, notice });
  switch (action.type) {
    case "switch":
      return {
        ...state,
        persona: action.persona,
        notice:
          "Đã chuyển vai diễn; dữ liệu demo và tiến trình được giữ nguyên.",
      };
    case "reset":
      return initialJudgeDemo();
    case "outsider":
      return reject(
        "NotAllowlisted: ví người lạ bị chặn. Quyền phiên thật không thay đổi.",
      );
    case "fast": {
      if (state.persona !== "elderly")
        return reject("Chỉ người thụ hưởng được rút nhanh.");
      if (action.amount <= 0n || action.amount > 50n)
        return reject(
          "Rút nhanh tối đa 50 AVAX/lần; khoản lớn phải chờ 2/3 người bảo hộ.",
        );
      if (state.withdrawnToday + action.amount > 100n)
        return reject("Đã chạm hạn mức 100 AVAX/ngày của phiên demo.");
      if (action.amount > state.buffer)
        return reject("Đệm L1 không đủ. Hãy tạo yêu cầu gia đình duyệt.");
      return {
        ...state,
        shield: state.shield - action.amount,
        buffer: state.buffer - action.amount,
        withdrawnToday: state.withdrawnToday + action.amount,
        notice: `Demo: đã rút ${action.amount} AVAX từ đệm L1 · phí 0 AVAX.`,
      };
    }
    case "request": {
      if (
        state.persona !== "elderly" ||
        action.amount <= 0n ||
        action.amount > state.shield
      )
        return reject("Yêu cầu không hợp lệ.");
      if (state.pending && !state.pending.paid)
        return reject("Gia đình đang xem yêu cầu trước, chưa gửi thêm lệnh.");
      return {
        ...state,
        pending: { amount: action.amount, approvals: [], paid: false },
        notice: "Demo: yêu cầu đã gửi, chờ 2/3 chữ ký người bảo hộ.",
      };
    }
    case "approve": {
      const request = state.pending;
      if (state.persona !== "admin" || !request || request.paid)
        return reject("Không có yêu cầu đang chờ duyệt.");
      if (request.approvals.includes(action.guardian))
        return reject("AlreadyApproved: mỗi người chỉ được ký một lần.");
      const approvals = [...request.approvals, action.guardian];
      if (approvals.length < 2)
        return {
          ...state,
          pending: { ...request, approvals },
          notice: "Đã ký 1/3. Tiền chưa được chuyển.",
        };
      if (request.amount > state.buffer)
        return reject("Đệm không đủ cho phiên demo; chưa ghi nhận chi trả.");
      return {
        ...state,
        shield: state.shield - request.amount,
        buffer: state.buffer - request.amount,
        pending: { ...request, approvals, paid: true },
        notice: "Demo: đủ 2/3 chữ ký, yêu cầu đã được chi trả đúng một lần.",
      };
    }
    case "claim":
      if (state.persona !== "child" || state.chore !== "TODO")
        return reject("Nhiệm vụ chưa thể nộp lại.");
      return {
        ...state,
        chore: "SUBMITTED",
        notice: "Demo: Bé Na báo hoàn thành, chờ người bảo hộ xác nhận.",
      };
    case "reward": {
      if (state.persona !== "admin" || state.chore !== "SUBMITTED")
        return reject("Chỉ duyệt nhiệm vụ đã báo hoàn thành.");
      if (state.choreApprovals.includes(action.guardian))
        return reject("Người bảo hộ này đã duyệt nhiệm vụ.");
      const choreApprovals = [...state.choreApprovals, action.guardian];
      return {
        ...state,
        choreApprovals,
        chore: choreApprovals.length >= 2 ? "REWARDED" : "SUBMITTED",
        reward: choreApprovals.length >= 2 ? 5n : 0n,
        notice:
          choreApprovals.length >= 2
            ? "Demo: đủ 2/3 xác nhận; Bé Na nhận 5 AVAX vào heo đất."
            : "Nhiệm vụ có 1/3 xác nhận; chưa chi tiền.",
      };
    }
    case "create":
      if (
        state.persona !== "admin" ||
        !action.name.trim() ||
        action.name.trim().length > 80 ||
        !Number.isSafeInteger(action.bufferRatioBps) ||
        action.bufferRatioBps < 0 ||
        action.bufferRatioBps > 10000
      )
        return reject("Tên hũ hoặc tỷ lệ đệm không hợp lệ.");
      return {
        ...state,
        jars: [
          ...state.jars,
          {
            id: state.jars.length + 1,
            name: action.name.trim(),
            bufferRatioBps: action.bufferRatioBps,
          },
        ],
        notice: "Demo: đã tạo hũ mới với số dư 0, tỷ lệ phân bổ đã lưu.",
      };
  }
}

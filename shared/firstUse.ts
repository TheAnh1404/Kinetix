export type FirstUseRole = "ADMIN" | "GUARDIAN" | "ELDERLY" | "CHILD";
export type FirstUseAction =
  | "MANAGE_MEMBERS"
  | "CONNECT_WORKSPACE"
  | "PROVISION"
  | "CREATE_VAULT"
  | "OPEN_VAULTS"
  | "CONTACT_GUARDIAN"
  | "WAIT";
export interface FirstUseStep {
  id: string;
  title: string;
  description: string;
  status: "DONE" | "WAITING" | "BLOCKED";
  action?: FirstUseAction;
  actionLabel?: string;
}
export interface FirstUseInput {
  role: FirstUseRole;
  canManageMembers: boolean;
  otherMembers: number;
  deployment: "DISABLED" | "UNAVAILABLE" | "VERIFIED";
  workspace: "MISSING" | "CONFLICT" | "MATCH";
  allowlisted: boolean | null;
  paused?: boolean;
  vaults: number;
  fundedVaults: number;
  tasks: number;
}

/** Guidance only. Actual write authorization remains in the existing API and contract guards. */
export function firstUseSteps(input: FirstUseInput): FirstUseStep[] {
  const manager = input.role === "ADMIN" || input.role === "GUARDIAN";
  const contact: FirstUseAction = manager ? "WAIT" : "CONTACT_GUARDIAN";
  const contactLabel = manager ? "Kiểm tra lại" : "Liên hệ người bảo hộ";
  const steps: FirstUseStep[] = [
    {
      id: "account",
      title: "Tài khoản cá nhân đã kích hoạt",
      status: "DONE",
      description:
        "Bạn đã có mật khẩu riêng và ví Core đã xác minh. Có thể xem dữ liệu mà không mở ví.",
    },
  ];
  if (input.canManageMembers)
    steps.push({
      id: "members",
      title: "Thêm người thân vào gia đình",
      description: input.otherMembers > 0
        ? "Đã có thành viên trong không gian. Mở quản lý để theo dõi đổi mật khẩu và liên kết Core; bước này chưa xác nhận họ đã có quyền giao dịch."
        : "Tạo tài khoản cho người thân hoặc mời người bảo hộ. Bàn giao mật khẩu tạm riêng; mỗi người liên kết Core của mình. Bạn có thể làm bước này khi đang chờ cấp quyền giao dịch.",
      status: input.otherMembers > 0 ? "DONE" : "WAITING",
      action: "MANAGE_MEMBERS",
      actionLabel: "Quản lý thành viên",
    });
  steps.push({
    id: "deployment",
    title: "Dịch vụ giao dịch của gia đình",
    status: input.deployment === "VERIFIED" ? "DONE" : "BLOCKED",
    description:
      input.deployment === "DISABLED"
        ? "Hệ thống chưa mở giao dịch. Người vận hành cần xác minh triển khai; bạn vẫn có thể sử dụng tài khoản và quản lý gia đình."
        : input.deployment === "UNAVAILABLE"
          ? "Chưa xác minh được dịch vụ blockchain. Đây là trạng thái chưa xác định; hãy kiểm tra lại, không gửi lại giao dịch."
          : "Đã xác minh deployment và các receipt trên Fuji. Phí giao dịch được trả bằng AVAX testnet.",
    ...(input.deployment !== "VERIFIED"
      ? { action: contact, actionLabel: contactLabel }
      : {}),
  });
  const connected =
    input.deployment === "VERIFIED" && input.workspace === "MATCH";
  steps.push({
    id: "workspace",
    title: "Không gian dùng đúng hệ thống giao dịch",
    status: connected ? "DONE" : "BLOCKED",
    description:
      input.workspace === "CONFLICT"
        ? "Không gian đang gắn với hệ thống giao dịch khác. Cần người vận hành đối soát; không tự chuyển hũ hoặc số dư."
        : connected
          ? "Không gian đã gắn đúng Hub được xác minh."
          : "Quản trị gia đình cần nối không gian với deployment đã xác minh. Thao tác này không chuyển tiền hoặc tự gán lại hũ cũ.",
    ...(!connected
      ? {
          action:
            input.deployment === "VERIFIED" &&
            input.workspace === "MISSING" &&
            input.role === "ADMIN"
              ? ("CONNECT_WORKSPACE" as const)
              : contact,
          actionLabel:
            input.deployment === "VERIFIED" &&
            input.workspace === "MISSING" &&
            input.role === "ADMIN"
              ? "Kết nối không gian"
              : contactLabel,
        }
      : {}),
  });
  const allowed = connected && input.allowlisted === true && !input.paused;
  steps.push({
    id: "permission",
    title: "Ví được cấp quyền giao dịch",
    status: allowed ? "DONE" : "BLOCKED",
    description: input.paused
      ? "Người vận hành đang tạm dừng giao dịch. Bạn vẫn xem được dữ liệu; chờ mở lại trước khi ký."
      : allowed
        ? "Đã kiểm tra quyền ví trực tiếp trên Hub. Quyền của từng hũ vẫn được kiểm riêng trước khi ký."
        : "Liên kết Core chưa cấp quyền chi tiền. Người vận hành Hub cần xác nhận cấp quyền; quản trị gia đình không tự có quyền operator.",
    ...(!allowed
      ? {
          action:
            input.canManageMembers && connected && !input.paused
              ? ("PROVISION" as const)
              : contact,
          actionLabel:
            input.canManageMembers && connected && !input.paused
              ? "Xem cấp quyền"
              : contactLabel,
        }
      : {}),
  });
  steps.push({
    id: "vault",
    title: manager
      ? "Hũ đầu tiên của gia đình"
      : input.role === "ELDERLY"
        ? "Hũ hỗ trợ dành cho bạn"
        : "Hũ nhiệm vụ dành cho con",
    status: input.vaults > 0 ? "DONE" : connected ? "WAITING" : "BLOCKED",
    description:
      !connected
        ? "Chưa thể xác minh các hũ cho tới khi dịch vụ giao dịch và kết nối không gian sẵn sàng. Không tạo lại hũ chỉ vì chưa kiểm tra được trạng thái."
        : input.vaults > 0
        ? "Đã tìm thấy hũ hoạt động, có bằng chứng tạo và quyền phù hợp trên blockchain."
        : manager
          ? "Tạo hũ sau khi những người được chọn đã liên kết Core và được cấp quyền. MILESTONE cần người nhận thưởng khác Guardian."
          : "Người bảo hộ cần tạo hũ gồm ví của bạn. Thêm tài khoản vào gia đình chưa tự cấp quyền thụ hưởng hũ.",
    action:
      manager && allowed
        ? input.vaults > 0
          ? "OPEN_VAULTS"
          : "CREATE_VAULT"
        : contact,
    actionLabel:
      manager && allowed
        ? input.vaults > 0
          ? "Xem các hũ"
          : "Tạo hũ đầu tiên"
        : contactLabel,
  });
  if (input.vaults > 0)
    steps.push({
      id: "first-use",
      title:
        input.role === "CHILD" ? "Nhiệm vụ đầu tiên" : "Số tiền có thể sử dụng",
      status: (
        input.role === "CHILD" ? input.tasks > 0 : input.fundedVaults > 0
      )
        ? "DONE"
        : "WAITING",
      description:
        input.role === "CHILD"
          ? input.tasks > 0
            ? "Nhiệm vụ đã được giao cho con. Mở mục Việc nhà để xem hướng dẫn; thưởng chỉ cộng khi thực chi."
            : "Người bảo hộ cần nạp hũ và giao nhiệm vụ. Con chưa có nhiệm vụ đang mở."
          : input.fundedVaults > 0
            ? "Có hũ đã được nạp trên blockchain. Số có thể rút còn phụ thuộc hạn mức, khoản giữ chỗ và quy tắc hũ."
            : "Hũ chưa có vốn trên blockchain. Người bảo hộ có thể nạp AVAX Fuji; số dư mẫu không được tự tạo.",
      action: manager
        ? "OPEN_VAULTS"
        : input.role === "CHILD" && input.tasks > 0
          ? "OPEN_VAULTS"
          : "CONTACT_GUARDIAN",
      actionLabel: manager
        ? "Xem hũ và nạp tiền"
        : input.role === "CHILD" && input.tasks > 0
          ? "Xem việc nhà"
          : "Liên hệ người bảo hộ",
    });
  return steps;
}

import { encodeFunctionData, parseEther, isAddress, zeroAddress } from "viem";
import { FAMILY_HUB_ABI } from "./abis";

export const VAULT_RULES = [
  "SHIELD",
  "MILESTONE",
  "ROSCA",
  "SHARED_GOAL",
] as const;
export type VaultRule = (typeof VAULT_RULES)[number];
export interface VaultForm {
  ruleTemplate: VaultRule;
  name: string;
  description: string;
  bufferRatioBps: number;
  guardianIds: string[];
  beneficiaryIds: string[];
  requiredApprovals: number;
  fastWithdrawLimit: string;
  targetGoalAmount: string;
  targetDeadline: string;
  roscaRoundDuration: string;
  roscaRoundContribution: string;
  policyAccepted: boolean;
}
export interface ResolvedVaultConfig {
  name: string;
  bufferRatioBps: number;
  ruleTemplate: VaultRule;
  guardianWallets: string[];
  beneficiaryWallets: string[];
  requiredApprovals: number;
  fastWithdrawLimit: string;
  targetGoalAmount: string;
  targetDeadline: string;
  roscaRoundDuration: string;
  roscaRoundContribution: string;
}
export type CreationPhase = {
  status:
    | "PRECHECK"
    | "AWAITING_SIGNATURE"
    | "BROADCAST"
    | "CONFIRMED"
    | "SYNC_PENDING"
    | "COMPLETED"
    | "REVERTED";
  hash?: string;
};
export interface CreateVaultParams extends ResolvedVaultConfig {
  draftId: string;
  onProgress?: (phase: CreationPhase) => void;
}
export class VaultConfigError extends Error {
  constructor(public fields: Record<string, string>) {
    super(Object.values(fields)[0] || "Cấu hình hũ chưa hợp lệ.");
    this.name = "VaultConfigError";
  }
}
export const MAX_STORED_WEI = 10n ** 38n - 1n;
export const emptyVaultForm = (): VaultForm => ({
  ruleTemplate: "SHIELD",
  name: "",
  description: "",
  bufferRatioBps: 1000,
  guardianIds: [],
  beneficiaryIds: [],
  requiredApprovals: 1,
  fastWithdrawLimit: "0.01",
  targetGoalAmount: "1",
  targetDeadline: "",
  roscaRoundDuration: "604800",
  roscaRoundContribution: "0.01",
  policyAccepted: false,
});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function vaultForm(input: unknown): VaultForm {
  // Bản nháp cũ chưa có tỷ lệ vẫn mở được với giá trị khuyến nghị.
  const value =
    input && typeof input === "object"
      ? ({ bufferRatioBps: 1000, ...input } as VaultForm)
      : (input as VaultForm);
  const base = emptyVaultForm();
  if (
    !value ||
    typeof value !== "object" ||
    Object.keys(value).some((key) => !(key in base))
  )
    throw new VaultConfigError({ form: "Cấu hình chứa trường không hợp lệ." });
  if (!VAULT_RULES.includes(value.ruleTemplate))
    throw new VaultConfigError({ ruleTemplate: "Chọn loại hũ hợp lệ." });
  if (
    !Number.isSafeInteger(value.bufferRatioBps) ||
    value.bufferRatioBps < 0 ||
    value.bufferRatioBps > 10000
  )
    throw new VaultConfigError({
      bufferRatioBps: "Tỷ lệ đệm phải từ 0 đến 10000 bps (0–100%).",
    });
  for (const key of [
    "name",
    "description",
    "fastWithdrawLimit",
    "targetGoalAmount",
    "targetDeadline",
    "roscaRoundDuration",
    "roscaRoundContribution",
  ] as const) {
    if (
      typeof value[key] !== "string" ||
      value[key].length >
        (key === "description" ? 1000 : key === "name" ? 320 : 100)
    )
      throw new VaultConfigError({
        [key]: "Nội dung không hợp lệ hoặc quá dài.",
      });
  }
  for (const key of ["guardianIds", "beneficiaryIds"] as const) {
    if (
      !Array.isArray(value[key]) ||
      value[key].length > (key === "guardianIds" ? 32 : 64) ||
      value[key].some((id) => typeof id !== "string" || !uuid.test(id)) ||
      new Set(value[key].map((id) => id.toLowerCase())).size !==
        value[key].length
    )
      throw new VaultConfigError({
        [key]:
          "Chọn thành viên khác nhau, tối đa 32 Guardian và 64 người nhận.",
      });
  }
  if (
    !Number.isSafeInteger(value.requiredApprovals) ||
    value.requiredApprovals < 1 ||
    value.requiredApprovals > 32 ||
    typeof value.policyAccepted !== "boolean"
  )
    throw new VaultConfigError({
      requiredApprovals: "Số chữ ký phải từ 1 đến 32.",
    });
  return {
    ...value,
    name: value.name.trim(),
    description: value.description.trim(),
    guardianIds: value.guardianIds.map((id) => id.toLowerCase()),
    beneficiaryIds: value.beneficiaryIds.map((id) => id.toLowerCase()),
  };
}
export function validateVaultForm(
  form: VaultForm,
  timestamp: bigint,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (
    !Number.isSafeInteger(form.bufferRatioBps) ||
    form.bufferRatioBps < 0 ||
    form.bufferRatioBps > 10000
  )
    errors.bufferRatioBps = "Chọn tỷ lệ đệm từ 0% đến 100%.";
  if (!form.name.trim() || Array.from(form.name.trim()).length > 80)
    errors.name = "Tên hũ từ 1 đến 80 ký tự.";
  if (
    !form.guardianIds.length ||
    form.guardianIds.length < form.requiredApprovals
  )
    errors.guardianIds = "Chọn đủ người ký duyệt cho ngưỡng M/N.";
  if (!form.beneficiaryIds.length)
    errors.beneficiaryIds = "Chọn ít nhất một người thụ hưởng.";
  if (
    form.ruleTemplate === "MILESTONE" &&
    form.beneficiaryIds.some((id) => form.guardianIds.includes(id))
  )
    errors.beneficiaryIds =
      "Người nhận thưởng phải khác Guardian của hũ nhiệm vụ.";
  const amount = (
    key: "fastWithdrawLimit" | "targetGoalAmount" | "roscaRoundContribution",
    zero: boolean,
    cap = MAX_STORED_WEI,
  ) => {
    try {
      if (!/^\d+(\.\d{1,18})?$/.test(form[key])) throw new Error();
      const value = parseEther(form[key]);
      if (value < 0n || (!zero && value === 0n) || value > cap)
        throw new Error();
    } catch {
      errors[key] =
        `${zero ? "Số tiền không âm" : "Số tiền lớn hơn 0"}, tối đa 18 số thập phân và trong giới hạn lưu trữ.`;
    }
  };
  if (form.ruleTemplate === "SHIELD") amount("fastWithdrawLimit", true);
  if (form.ruleTemplate === "SHARED_GOAL") {
    amount("targetGoalAmount", false);
    const date = Date.parse(form.targetDeadline);
    if (
      !/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(form.targetDeadline) ||
      !Number.isFinite(date) ||
      BigInt(Math.floor(date / 1000)) <= timestamp
    )
      errors.targetDeadline =
        "Chọn ngày, giờ và múi giờ hết hạn trong tương lai.";
  }
  if (form.ruleTemplate === "ROSCA") {
    if (
      !/^\d+$/.test(form.roscaRoundDuration) ||
      BigInt(form.roscaRoundDuration) < 60n ||
      BigInt(form.roscaRoundDuration) > 31536000n
    )
      errors.roscaRoundDuration = "Chu kỳ từ 1 phút đến 365 ngày.";
    amount(
      "roscaRoundContribution",
      false,
      MAX_STORED_WEI / BigInt(Math.max(1, form.beneficiaryIds.length)),
    );
  }
  if (!form.policyAccepted)
    errors.policyAccepted = "Xác nhận đã đọc quy tắc và giới hạn của hũ.";
  return errors;
}
export function resolveVaultConfig(
  form: VaultForm,
  wallets: Map<string, string>,
  timestamp: bigint,
): ResolvedVaultConfig {
  const errors = validateVaultForm(form, timestamp);
  for (const key of ["guardianIds", "beneficiaryIds"] as const)
    if (form[key].some((id) => !wallets.has(id)))
      errors[key] =
        "Có thành viên chưa hoạt động hoặc chưa liên kết Core trong gia đình này.";
  if (Object.keys(errors).length) throw new VaultConfigError(errors);
  const guardianWallets = form.guardianIds.map((id) =>
    wallets.get(id)!.toLowerCase(),
  );
  const beneficiaryWallets = form.beneficiaryIds.map((id) =>
    wallets.get(id)!.toLowerCase(),
  );
  if (
    [...guardianWallets, ...beneficiaryWallets].some(
      (address) => !isAddress(address) || address === zeroAddress,
    )
  )
    throw new VaultConfigError({
      guardianIds: "Có ví không hợp lệ hoặc là địa chỉ rỗng.",
    });
  if (
    form.ruleTemplate === "MILESTONE" &&
    beneficiaryWallets.some((address) => guardianWallets.includes(address))
  )
    throw new VaultConfigError({
      beneficiaryIds: "Ví nhận thưởng phải khác ví Guardian.",
    });
  if (
    new Set(guardianWallets).size !== guardianWallets.length ||
    new Set(beneficiaryWallets).size !== beneficiaryWallets.length
  )
    throw new VaultConfigError({
      guardianIds: "Các thành viên phải dùng ví riêng, không trùng nhau.",
    });
  return {
    name: form.name.trim(),
    bufferRatioBps: form.bufferRatioBps,
    ruleTemplate: form.ruleTemplate,
    guardianWallets,
    beneficiaryWallets,
    requiredApprovals: form.requiredApprovals,
    fastWithdrawLimit:
      form.ruleTemplate === "SHIELD" ? form.fastWithdrawLimit : "0",
    targetGoalAmount:
      form.ruleTemplate === "SHARED_GOAL" ? form.targetGoalAmount : "0",
    targetDeadline:
      form.ruleTemplate === "SHARED_GOAL" ? form.targetDeadline : "",
    roscaRoundDuration:
      form.ruleTemplate === "ROSCA" ? form.roscaRoundDuration : "0",
    roscaRoundContribution:
      form.ruleTemplate === "ROSCA" ? form.roscaRoundContribution : "0",
  };
}
export function buildVaultCall(config: ResolvedVaultConfig) {
  if (
    !Number.isSafeInteger(config.bufferRatioBps) ||
    config.bufferRatioBps < 0 ||
    config.bufferRatioBps > 10000
  )
    throw new VaultConfigError({ bufferRatioBps: "Tỷ lệ đệm không hợp lệ." });
  const type = VAULT_RULES.indexOf(config.ruleTemplate);
  if (type < 0)
    throw new VaultConfigError({ ruleTemplate: "Loại hũ không hợp lệ." });
  const args: unknown[] = [
    config.name,
    type,
    BigInt(config.bufferRatioBps),
    parseEther(config.fastWithdrawLimit),
    BigInt(config.requiredApprovals),
    config.guardianWallets,
    config.beneficiaryWallets,
  ];
  const functionName = type >= 2 ? "createAdvancedVault" : "createCustomVault";
  if (type >= 2)
    args.push(
      parseEther(config.targetGoalAmount),
      config.targetDeadline
        ? BigInt(Math.floor(Date.parse(config.targetDeadline) / 1000))
        : 0n,
      BigInt(config.roscaRoundDuration),
      parseEther(config.roscaRoundContribution),
    );
  return {
    functionName,
    args,
    data: encodeFunctionData({
      abi: FAMILY_HUB_ABI,
      functionName,
      args,
    } as any),
  };
}

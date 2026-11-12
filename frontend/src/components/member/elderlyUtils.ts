/**
 * @file elderlyUtils.ts
 * @description Các tiện ích hỗ trợ trải nghiệm người cao tuổi (Ông bà / Senior UX).
 * Bao gồm:
 * 1. Trợ lý giọng nói tiếng Việt (Web Speech API TTS với tốc độ chậm rãi 0.85x).
 * 2. Định dạng số tiền AVAX và thời gian thuần tiếng Việt, dễ hiểu, không thuật ngữ kỹ thuật.
 * 3. Chuyển đổi trạng thái Web3 sang ngôn ngữ gia đình bình dị.
 */

/**
 * Phát âm thanh giọng nói tiếng Việt chậm rãi, rõ ràng cho người cao tuổi.
 * @param text Đoạn văn bản cần đọc
 * @param onEnd Callback kích hoạt khi đọc xong
 * @returns boolean true nếu đã phát lệnh đọc, false nếu trình duyệt không hỗ trợ
 */
export function speakElderlyText(text: string, onEnd?: () => void): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();

    // Làm sạch ký tự đặc biệt, dấu sao, gạch dưới để giọng đọc trôi chảy
    const cleanText = text
      .replace(/[*#_`]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) return false;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "vi-VN";
    // Tốc độ 0.85 là tỷ lệ chuẩn cho người lớn tuổi nghe rõ từng từ ngữ
    utterance.rate = 0.85;
    utterance.pitch = 1.0;

    if (onEnd) {
      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd();
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (error) {
    console.warn("Không thể phát giọng nói:", error);
    if (onEnd) onEnd();
    return false;
  }
}

/**
 * Dừng phát giọng nói ngay lập tức
 */
export function stopElderlyText(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Định dạng số AVAX sang dạng chuỗi thân thiện, tối đa 2-3 chữ số thập phân
 */
export function formatElderlyAvax(amountStr: string | number | undefined | null): string {
  if (!amountStr) return "0";
  const num = typeof amountStr === "number" ? amountStr : parseFloat(amountStr);
  if (isNaN(num)) return "0";
  // Nếu là số nguyên hiển thị nguyên, nếu số thập phân làm tròn 2-3 chữ số
  if (num % 1 === 0) return num.toString();
  return num.toLocaleString("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 3,
  });
}

/**
 * Định dạng thời gian sang tiếng Việt thân thiện với người cao tuổi
 * Ví dụ: "Hôm nay lúc 09:30" hoặc "Ngày 12 tháng 11, 2026"
 */
export function formatElderlyDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "Vừa xong";
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "Vừa xong";

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) {
      return `Hôm nay lúc ${timeStr}`;
    }

    return `${date.getDate()} thg ${date.getMonth() + 1}, ${date.getFullYear()} (${timeStr})`;
  } catch {
    return "Vừa xong";
  }
}

/**
 * Phân loại trạng thái yêu cầu sang ngôn ngữ gia đình bình dị
 */
export interface ElderlyRequestStatusInfo {
  title: string;
  subTitle: string;
  badgeClass: string;
  stepIndex: number; // 0: Đã gửi, 1: Chờ con cháu duyệt, 2: Đã nhận tiền về ví
  isPending: boolean;
  isExecuted: boolean;
  isRejected: boolean;
}

export function getElderlyRequestStatusInfo(
  status: string,
  approvalsCount: number,
  requiredApprovals: number
): ElderlyRequestStatusInfo {
  if (status === "EXECUTED") {
    return {
      title: "Đã nhận về ví",
      subTitle: "Tiền đã được gửi thành công vào ví cá nhân của ông bà",
      badgeClass:
        "bg-emerald-100 text-emerald-950 border-2 border-emerald-600 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-400",
      stepIndex: 2,
      isPending: false,
      isExecuted: true,
      isRejected: false,
    };
  }

  if (status === "REJECTED") {
    return {
      title: "Chưa duyệt lần này",
      subTitle: "Con cháu chưa duyệt, hãy bấm gọi người thân để kiểm tra",
      badgeClass:
        "bg-rose-100 text-rose-950 border-2 border-rose-600 dark:bg-rose-950 dark:text-rose-100 dark:border-rose-400",
      stepIndex: 1,
      isPending: false,
      isExecuted: false,
      isRejected: true,
    };
  }

  // PENDING
  if (approvalsCount > 0) {
    return {
      title: "Cần thêm người duyệt",
      subTitle: `Đã có ${approvalsCount}/${requiredApprovals} người bảo hộ đồng ý`,
      badgeClass:
        "bg-amber-100 text-amber-950 border-2 border-amber-600 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-400",
      stepIndex: 1,
      isPending: true,
      isExecuted: false,
      isRejected: false,
    };
  }

  return {
    title: "Chờ con cháu duyệt",
    subTitle: `Cần ${requiredApprovals} người thân ký duyệt để giải ngân`,
    badgeClass:
      "bg-amber-100 text-amber-950 border-2 border-amber-600 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-400",
    stepIndex: 1,
    isPending: true,
    isExecuted: false,
    isRejected: false,
  };
}

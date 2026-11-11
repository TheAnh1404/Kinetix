"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import styles from "./landing.module.css";

export const LandingFAQ: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "Tại sao Kinetix chọn kiến trúc Dual-Chain thay vì làm dApp trên C-Chain thông thường?",
      a: "Triển khai hoàn toàn trên C-Chain sẽ buộc mọi thành viên (kể cả trẻ nhỏ và ông bà) phải sở hữu AVAX để trả phí gas cho mỗi thao tác nhỏ và phải đối mặt với rủi ro mempool công khai. Với Family L1 (Subnet riêng), Kinetix cấu hình phí gas = 0đ và kiểm soát quyền truy cập bằng Transaction Allowlist Precompile, tạo ra một 'khu vườn an toàn' tuyệt đối, trong khi vẫn tận dụng được thanh khoản DeFi và lãi suất của C-Chain.",
    },
    {
      q: "Người già và Trẻ nhỏ không có kiến thức về Web3 thì sử dụng như thế nào?",
      a: "Kinetix thiết kế luồng sử dụng thân thiện: Ông Bà dùng giao diện chữ to 56px với chế độ 1 chạm nhận tiền an sinh; Trẻ em nộp hình ảnh làm việc nhà nhận thưởng Heo đất 4.0. Cả hai đối tượng này không cần biết về Seed Phrase hay Gas Fee. Các thao tác ký duyệt phức tạp sẽ do người bảo hộ đảm nhiệm.",
    },
    {
      q: "Lãi suất 8% APY trên Avalanche C-Chain lấy từ đâu? Có phải mô hình Ponzi?",
      a: "Hoàn toàn không phải Ponzi. Trong giai đoạn thử nghiệm MVP, lãi suất được bảo chứng 100% bằng Quỹ dự trữ YieldReservePool do tổ chức nạp trước. Trong phiên bản thương mại, phần vốn nhàn rỗi chuyển tiếp sang C-Chain sẽ được tích hợp vào các giao thức Lending phi tập trung thanh khoản cao như Benqi/Aave trên Avalanche để sinh ra Real-Yield thực tế.",
    },
    {
      q: "Nếu một người thân làm mất điện thoại hoặc lộ ví thì xử lý thế nào?",
      a: "Kinetix tích hợp cơ chế Khôi phục ví xã hội (Social Recovery theo chuẩn AUD-13). Khi sự cố xảy ra, tối thiểu 2/3 Người bảo hộ của hũ tiền đó có thể thực hiện bỏ phiếu on-chain để di dời quyền thành viên và số dư sang địa chỉ ví mới mà không làm mất lịch sử hay làm gián đoạn chu kỳ góp vốn ROSCA.",
    },
    {
      q: "Kinetix có mở rộng cho các nhóm cộng đồng ngoài gia đình không?",
      a: "Có. Kinetix hỗ trợ kiến trúc Đa Không Gian (Multi-Space Workspaces). Một người dùng có thể đồng thời tham gia: Không gian Gia đình ruột thịt, Nhóm anh em đầu tư, Quỹ hội bạn thân hoặc Câu lạc bộ từ thiện với các hũ tiền và quy tắc độc lập.",
    },
  ];

  return (
    <section id="faq" className="py-24 relative z-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>HỎI ĐÁP PHỔ BIẾN</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Giải Đáp Thắc Mắc Về Kinetix
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Những câu hỏi thường gặp về mô hình vận hành, bảo mật và công nghệ Avalanche của chúng tôi.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => {
            const isOpen = openIdx === i;
            return (
              <div
                key={i}
                className={`${styles.glassCard} rounded-2xl border border-white/10 overflow-hidden transition-colors ${
                  isOpen ? "border-white/25 bg-slate-900/80" : "hover:border-white/20"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4"
                >
                  <span className="text-sm sm:text-base font-bold text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180 text-cyan-400" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-4 animate-in fade-in duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

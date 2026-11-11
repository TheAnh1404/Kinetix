"use client";

import React, { useState } from "react";
import { UserCheck, Heart, Sparkles, ShieldAlert, Award, ArrowRight } from "lucide-react";
import styles from "./landing.module.css";

export const LandingPersonas: React.FC = () => {
  const [selectedPersona, setSelectedPersona] = useState<"elderly" | "child" | "admin">("elderly");

  const personas = {
    elderly: {
      avatar: "👴",
      role: "Ông Cụ Ba (Người Cao Tuổi)",
      badge: "Giao Diện 56px Siêu To",
      title: "Nhận Tiền An Sinh 1 Chạm · 0đ Phí Gas",
      desc: "Loại bỏ hoàn toàn sự phức tạp của Web3. Không cần ghi nhớ Seed Phrase dài dòng, không cần nạp AVAX để trả phí gas.",
      highlights: [
        {
          title: "Chữ và số dư 56px",
          desc: "Độ tương phản cao đạt chuẩn WCAG AAA, người cao tuổi mắt kém vẫn đọc rõ ràng không cần kính.",
        },
        {
          title: "Rút nhanh tức thì < 1 giây",
          desc: "Nhận tiền hỗ trợ từ con cháu vào ví chi tiêu hằng ngày chỉ với 1 lần chạm, phí mạng 0đ.",
        },
        {
          title: "Chống thao túng & lừa đảo",
          desc: "Khoản rút lớn bất thường tự động kích hoạt hàng đợi xác nhận từ con cái, chặn đứng nguy cơ bị kẻ xấu lừa chuyển tiền.",
        },
      ],
      actionPreview: "👴 Ông Ba vừa nhận 20 AVAX tiền mừng thọ vào ví cá nhân.",
    },
    child: {
      avatar: "👧",
      role: "Bé Na (Thế Hệ Tương Lai)",
      badge: "Chore-to-Earn & Heo Đất 4.0",
      title: "Học Cách Lao Động & Tích Lũy Tài Chính Sớm",
      desc: "Biến việc nhà thành những cột mốc bổ ích, giúp trẻ làm quen với giá trị của sức lao động và tích lũy thông minh.",
      highlights: [
        {
          title: "Chụp ảnh nộp việc nhà",
          desc: "Bé rửa bát, quét nhà hay đạt điểm 10? Chụp ảnh nộp nhiệm vụ trực tiếp để bố mẹ kiểm tra.",
        },
        {
          title: "Heo đất 4.0 tự sinh lãi 8% APY",
          desc: "Tiền thưởng không nằm im mà được sinh lời liên tục trên Avalanche C-Chain, dạy bé về lãi suất kép.",
        },
        {
          title: "Ví an toàn khép kín",
          desc: "Bé chỉ có thể tương tác trong mạng nội bộ Family L1, không lo click nhầm link độc hay mất tiền linh tinh.",
        },
      ],
      actionPreview: "👧 Bé Na vừa hoàn thành nhiệm vụ 'Tưới hoa & nhổ cỏ' · Nhận thưởng 5 AVAX.",
    },
    admin: {
      avatar: "👨‍💼",
      role: "Bố Ba (Trụ Cột & Người Bảo Hộ)",
      badge: "Quản Trị Phân Quyền Đa Không Gian",
      title: "Trung Tâm Điều Phối Tài Chính Gia Đình Minh Bạch",
      desc: "Quản lý đồng thời nhiều không gian: Gia đình lớn, Nhóm anh em, Quỹ bạn bè. Toàn quyền giám sát nhưng không thể tự ý chiếm đoạt quỹ chung.",
      highlights: [
        {
          title: "Bàn điều khiển đa chữ ký M/N",
          desc: "Ký duyệt các khoản chi lớn trực tiếp trên ví Core Wallet hoặc Passkey với bằng chứng EIP-712 rõ ràng.",
        },
        {
          title: "Cấu hình hũ tiền linh hoạt",
          desc: "Tùy biến tỷ lệ đệm thanh khoản, đặt hạn mức theo ngày và phân quyền ai được rút, ai được duyệt.",
        },
        {
          title: "Khôi phục ví người thân (Social Recovery)",
          desc: "Khi ông bà làm mất điện thoại, gia đình có thể cùng ký duyệt để chuyển quyền sở hữu sang ví mới an toàn.",
        },
      ],
      actionPreview: "👨‍💼 Bố Ba vừa cùng Chú Tư ký duyệt yêu cầu viện phí 60 AVAX cho Ông Nội.",
    },
  };

  const current = personas[selectedPersona];

  return (
    <section id="personas" className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
            <Heart className="w-3.5 h-3.5" />
            <span>TRẢI NGHIỆM ĐO NI ĐÓNG GIÀY CHO MỌI THẾ HỆ</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Xóa Bỏ Rào Cản Web3 Cho Cả Gia Đình
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Không còn nỗi lo ông bà không biết dùng ví hay trẻ con làm mất private key. Kinetix thiết kế giao diện và luồng nghiệp vụ riêng biệt cho từng vai trò.
          </p>
        </div>

        {/* Persona Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12">
          {(["elderly", "child", "admin"] as const).map((key) => {
            const p = personas[key];
            const isSelected = selectedPersona === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedPersona(key)}
                className={`p-4 rounded-2xl flex items-center gap-3 transition-all duration-200 text-left ${
                  isSelected
                    ? "bg-slate-800/90 border-2 border-white/30 shadow-xl scale-[1.02]"
                    : "bg-slate-900/40 border border-white/10 hover:bg-slate-900/70"
                }`}
              >
                <span className="text-3xl">{p.avatar}</span>
                <div>
                  <div className="text-sm font-bold text-white">{p.role.split(" (")[0]}</div>
                  <div className="text-[11px] text-slate-400">{p.badge}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Persona Deep Dive Card */}
        <div className={`${styles.glassCard} p-8 sm:p-12 rounded-3xl border border-white/15 max-w-4xl mx-auto shadow-2xl relative`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <span className="text-5xl p-2 rounded-2xl bg-white/5 border border-white/10">
                {current.avatar}
              </span>
              <div>
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">
                  {current.badge}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {current.title}
                </h3>
              </div>
            </div>
          </div>

          <p className="text-sm sm:text-base text-slate-300 py-6 leading-relaxed">
            {current.desc}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 pb-6">
            {current.highlights.map((h, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {h.title}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {h.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-center gap-2.5 font-medium">
            <Award className="w-4 h-4 text-purple-400 shrink-0" />
            <span>{current.actionPreview}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

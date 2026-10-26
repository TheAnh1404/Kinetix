"use client";

import React from "react";
import { ActiveTab } from "../../types";
import { useFamily } from "@/context/FamilyContext";

interface HomeViewProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenDeposit: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onOpenDeposit,
}) => {
  const { vaults, totalFamilyWealth } = useFamily();
  return (
    <div className="flex flex-col w-full">
      {/* SECTION 1: HERO */}
      <section className="relative w-full pt-8 pb-16 px-gutter max-w-7xl mx-auto overflow-hidden">
        <div className="absolute -top-32 right-1/4 w-96 h-96 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-surface-container-high/60 rounded-full blur-2xl pointer-events-none -z-10" />

        {/* Floating Badges Strip */}
        <div className="flex flex-wrap items-center justify-center gap-space-sm mb-space-lg">
          <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-lowest shadow-sm">
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
            <span className="font-label-caps text-label-caps text-on-surface">
              Built on Avalanche L1
            </span>
          </div>
          <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-lowest shadow-sm">
            <span className="material-symbols-outlined text-[15px] text-tertiary-fixed-dim">
              bolt
            </span>
            <span className="font-label-caps text-label-caps text-on-surface">
              Zero Gas Fee (0 Gwei)
            </span>
          </div>
          <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-lowest shadow-sm">
            <span className="material-symbols-outlined text-[15px] text-secondary">
              verified_user
            </span>
            <span className="font-label-caps text-label-caps text-on-surface">
              Anti-Scam Multisig 2/3
            </span>
          </div>
          <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-lowest shadow-sm">
            <span className="material-symbols-outlined text-[15px] text-on-surface-variant">
              sync_alt
            </span>
            <span className="font-label-caps text-label-caps text-on-surface">
              Teleporter ICM Powered
            </span>
          </div>
        </div>

        {/* Main Title & Subtitle */}
        <div className="text-center max-w-4xl mx-auto mb-space-xl">
          <h1 className="font-display-lg text-display-lg md:text-[48px] md:leading-[56px] text-on-surface tracking-tight mb-space-md">
            Hệ Điều Hành Tài Chính Gia Đình Đa Thế Hệ Trên{" "}
            <span className="bg-gradient-to-r from-secondary to-secondary-container bg-clip-text text-transparent">
              Avalanche
            </span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl mx-auto leading-relaxed">
            Bảo vệ ông bà khỏi lừa đảo AI công nghệ cao, dạy con quản lý tài
            chính sớm với 0đ phí gas, và tự động sinh lời 8%/năm từ dòng tiền
            nhàn rỗi trong gia đình.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-space-md mt-space-lg">
            <button
              onClick={onOpenDeposit}
              className="w-full sm:w-auto px-space-lg py-3 rounded-xl bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary font-label-lg text-label-lg shadow-md transition-all flex items-center justify-center gap-space-xs"
              type="button"
            >
              <span>Bắt đầu nạp Quỹ Gia Đình</span>
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </button>
            <button
              onClick={() => onNavigate("quan-tri-cha-me")}
              className="w-full sm:w-auto px-space-lg py-3 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-lg text-label-lg shadow-sm transition-all flex items-center justify-center gap-space-xs"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px] text-secondary">
                play_circle
              </span>
              <span>Trạm Quản Trị Cha Mẹ</span>
            </button>
          </div>
        </div>

        {/* Split Interactive Hero Mockup Card */}
        <div className="w-full bg-surface-container-lowest rounded-2xl shadow-xl p-space-md md:p-space-lg relative border border-surface-container-high/60">
          <div className="flex flex-col lg:flex-row items-stretch justify-between gap-space-md">
            {/* Left: Grandparent Quick Shield Card */}
            <div className="flex-1 bg-surface-container-low rounded-xl p-space-md flex flex-col justify-between border border-surface-container-high/40">
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <span className="px-space-xs py-0.5 rounded font-label-caps text-label-caps bg-secondary-fixed text-on-secondary-fixed uppercase">
                    Thế Hệ 1 • Ông Bà
                  </span>
                  <span className="flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"></span>{" "}
                    Bảo vệ AI
                  </span>
                </div>
                <div className="font-headline-sm text-headline-sm text-on-surface mb-1">
                  ${vaults.retirementShield.localBuffer.toFixed(2)}{" "}
                  <span className="font-label-md text-label-md text-on-surface-variant">
                    USDC (Đệm L1)
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                  Hạn mức chi tiêu tự do: 50$/ngày (Không cần duyệt)
                </p>
              </div>
              <div className="space-y-space-xs">
                <button
                  onClick={() => onNavigate("kinetix-shield")}
                  className="w-full py-space-sm rounded-lg bg-secondary text-on-secondary font-label-lg text-label-lg shadow-sm flex items-center justify-center gap-space-xs active:scale-95 transition-transform"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    shopping_basket
                  </span>
                  <span>Rút Đi Chợ ($20)</span>
                </button>
                <div className="p-space-xs rounded bg-surface-container-high text-center">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">
                    Mọi giao dịch &gt; $50 kích hoạt chặn scam tự động
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Parent Guardian multisig widget */}
            <div className="flex-1 bg-inverse-surface rounded-xl p-space-md text-inverse-on-surface flex flex-col justify-between shadow-md">
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <span className="px-space-xs py-0.5 rounded font-label-caps text-label-caps bg-primary-container text-inverse-primary uppercase">
                    Trạm Quản Trị Cha Mẹ
                  </span>
                  <span className="font-label-caps text-label-caps text-secondary-fixed flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      lock_clock
                    </span>{" "}
                    Multisig 2/3
                  </span>
                </div>
                <div className="font-title-md text-title-md text-inverse-on-surface mb-space-xs">
                  Cảnh báo Phê Duyệt Rút Lớn
                </div>
                <p className="font-body-sm text-body-sm text-outline-variant mb-space-md">
                  Yêu cầu rút $1,000 từ Tài khoản Ông Nội đang chờ xác nhận.
                </p>
                {/* Multisig Signatures Indicator */}
                <div className="bg-primary-container p-space-sm rounded-lg space-y-space-xs mb-space-md">
                  <div className="flex items-center justify-between font-label-caps text-label-caps text-outline-variant">
                    <span>Chữ Ký Giám Sát</span>
                    <span className="text-tertiary-fixed-dim">1 / 2 Đã ký</span>
                  </div>
                  <div className="w-full bg-inverse-surface rounded-full h-2 overflow-hidden">
                    <div className="bg-tertiary-fixed-dim h-full w-1/2"></div>
                  </div>
                  <div className="flex items-center gap-space-xs mt-space-xs">
                    <span className="w-6 h-6 rounded-full bg-tertiary-fixed-dim/20 text-tertiary-fixed-dim flex items-center justify-center font-label-caps text-label-caps">
                      ✓ Anh
                    </span>
                    <span className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-label-caps text-label-caps animate-pulse">
                      Ba
                    </span>
                    <span className="w-6 h-6 rounded-full bg-inverse-surface text-outline-variant flex items-center justify-center font-label-caps text-label-caps">
                      Út
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onNavigate("quan-tri-cha-me")}
                className="w-full py-space-sm rounded-lg bg-surface-container-lowest text-on-surface font-label-lg text-label-lg flex items-center justify-center gap-space-xs hover:bg-surface-container transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">
                  verified
                </span>
                <span>Ký Lệnh Khẩn Cấp (0 Gas)</span>
              </button>
            </div>

            {/* Right: Kids Smart Piggybank widget */}
            <div className="flex-1 bg-surface-container-low rounded-xl p-space-md flex flex-col justify-between border border-surface-container-high/40">
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <span className="px-space-xs py-0.5 rounded font-label-caps text-label-caps bg-surface-container-highest text-on-surface uppercase">
                    Thế Hệ Con Cái • Heo Đất
                  </span>
                  <span className="px-space-xs py-0.5 rounded-full font-label-caps text-label-caps bg-surface-container-highest text-on-tertiary-container flex items-center gap-1 font-bold">
                    <span className="material-symbols-outlined text-[12px]">
                      trending_up
                    </span>{" "}
                    +8.0% APY
                  </span>
                </div>
                <div className="font-headline-sm text-headline-sm text-on-surface mb-1">
                  ${vaults.kidsSavings.localBuffer.toFixed(2)}{" "}
                  <span className="font-label-md text-label-md text-emerald-700 font-bold">
                    +${vaults.kidsSavings.accruedYield.toFixed(2)} Lãi
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">
                  Nhiệm vụ hôm nay: Điểm 10 toán &amp; rửa chén
                </p>
                <div className="p-space-xs rounded-lg bg-surface-container-lowest flex items-center justify-between mb-space-md shadow-sm">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-secondary text-[18px]">
                      task_alt
                    </span>
                    <span className="font-label-md text-label-md text-on-surface font-medium">
                      Đạt điểm 10 kiểm tra Toán
                    </span>
                  </div>
                  <span className="font-label-caps text-label-caps px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-bold">
                    +5.0 USDC
                  </span>
                </div>
              </div>
              <button
                onClick={() => onNavigate("kinetix-kids")}
                className="w-full py-space-sm rounded-lg bg-surface-container-highest hover:bg-surface-container text-on-surface font-label-lg text-label-lg flex items-center justify-center gap-space-xs transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">
                  savings
                </span>
                <span>Vào Heo Đất Của Bé</span>
              </button>
            </div>
          </div>

          {/* Live Network Badge Ribbon */}
          <div className="mt-space-md pt-space-md flex flex-wrap items-center justify-between gap-space-sm font-label-md text-label-md text-on-surface-variant border-t border-surface-container">
            <div className="flex items-center gap-space-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim"></span>
              <span>Avalanche Subnet: Kinetix Family L1 (Chain ID: 99999)</span>
            </div>
            <div className="flex items-center gap-space-md">
              <span>
                Thời gian giao dịch: <strong>&lt; 0.8s</strong>
              </span>
              <span>
                Chi phí người dùng: <strong>0.00 AVAX (Gasless)</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: 3 HŨ TÀI CHÍNH & KIẾN TRÚC 10/90 */}
      <section className="w-full py-space-xl px-gutter bg-surface-container-low border-t border-surface-container-high/40">
        <div className="max-w-7xl mx-auto flex flex-col gap-space-xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
            <div>
              <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider font-bold">
                Cơ Chế Đệm Thanh Khoản 10/90
              </span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
                3 Hũ Ngân Sách Gia Đình Tự Động Sinh Lời DeFi
              </h2>
            </div>
            <p className="max-w-md text-body-sm text-on-surface-variant">
              10% vốn nạp giữ lại trên Family L1 để chi tiêu hàng ngày với tốc độ
              dưới 1 giây và phí gas bằng 0. 90% còn lại tự động chuyển tiếp qua
              Avalanche Teleporter sang Fuji C-Chain để sinh lời ~8% APY.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
            {/* Hũ 1: RetirementShield */}
            <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-surface-container-high flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-space-md">
                  <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                    <span className="material-symbols-outlined text-[28px]">
                      elderly
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-secondary-fixed/50 text-secondary font-label-caps text-label-caps font-bold">
                    Hũ 1 • Ông Bà
                  </span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">
                  Báo Hiếu &amp; Hưu Trí
                </h3>
                <p className="text-body-sm text-on-surface-variant mb-space-md">
                  Bảo vệ tài sản hưu trí, ngăn chặn các cuộc gọi lừa đảo giả mạo
                  công an, viện phí bằng Đa chữ ký phân tầng.
                </p>
                <div className="bg-surface-container-low p-space-sm rounded-xl space-y-1 mb-space-md">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-on-surface-variant">10% Đệm L1:</span>
                    <span className="font-bold text-on-surface">35.00 USDC</span>
                  </div>
                  <div className="flex justify-between text-body-sm">
                    <span className="text-on-surface-variant">90% C-Chain Lãi:</span>
                    <span className="font-bold text-tertiary-fixed-dim">
                      315.00 USDC (+8%)
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onNavigate("kinetix-shield")}
                className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg transition-colors flex items-center justify-center gap-1"
              >
                <span>Xem Chế Độ Ông Bà</span>
                <span className="material-symbols-outlined text-[16px]">
                  arrow_forward
                </span>
              </button>
            </div>

            {/* Hũ 2: KidsSavings */}
            <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-surface-container-high flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-space-md">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface">
                    <span className="material-symbols-outlined text-[28px]">
                      child_care
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps font-bold">
                    Hũ 2 • Con Trẻ
                  </span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">
                  Lì Xì &amp; Tiết Kiệm Con
                </h3>
                <p className="text-body-sm text-on-surface-variant mb-space-md">
                  Dạy con quản lý dòng tiền sớm qua mô hình Chore-to-Earn: hoàn
                  thành việc nhà để nhận thưởng từ bố mẹ với 0 gas fee.
                </p>
                <div className="bg-surface-container-low p-space-sm rounded-xl space-y-1 mb-space-md">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-on-surface-variant">10% Đệm L1:</span>
                    <span className="font-bold text-on-surface">12.50 USDC</span>
                  </div>
                  <div className="flex justify-between text-body-sm">
                    <span className="text-on-surface-variant">90% C-Chain Lãi:</span>
                    <span className="font-bold text-tertiary-fixed-dim">
                      113.00 USDC (+8%)
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onNavigate("kinetix-kids")}
                className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg transition-colors flex items-center justify-center gap-1"
              >
                <span>Xem Heo Đất Của Bé</span>
                <span className="material-symbols-outlined text-[16px]">
                  arrow_forward
                </span>
              </button>
            </div>

            {/* Hũ 3: FamilyROSCA */}
            <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-surface-container-high flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-space-md">
                  <div className="w-12 h-12 rounded-xl bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
                    <span className="material-symbols-outlined text-[28px]">
                      handshake
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-caps text-label-caps font-bold">
                    Hũ 3 • Họ Hàng
                  </span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">
                  Quỹ Tương Trợ Dòng Họ
                </h3>
                <p className="text-body-sm text-on-surface-variant mb-space-md">
                  Mô hình Họ/Hụi truyền thống được mã hóa minh bạch trên
                  blockchain, tiền góp tự động tích lũy lãi suất trước ngày giải
                  ngân.
                </p>
                <div className="bg-surface-container-low p-space-sm rounded-xl space-y-1 mb-space-md">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-on-surface-variant">Quy mô vòng:</span>
                    <span className="font-bold text-on-surface">1,000.00 USDC</span>
                  </div>
                  <div className="flex justify-between text-body-sm">
                    <span className="text-on-surface-variant">Lãi chia đều:</span>
                    <span className="font-bold text-tertiary-fixed-dim">
                      +18.50 USDC
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onNavigate("quy-rosca")}
                className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg transition-colors flex items-center justify-center gap-1"
              >
                <span>Xem Quỹ Dòng Họ ROSCA</span>
                <span className="material-symbols-outlined text-[16px]">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

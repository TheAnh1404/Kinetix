"use client";

import React, { useState, useRef, useEffect } from "react";
import { useFamily } from "@/context/FamilyContext";

export const WorkspaceSwitcher: React.FC = () => {
  const { workspaces, currentWorkspace, switchWorkspace, createWorkspace } = useFamily();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceType, setNewWorkspaceType] = useState<"FAMILY" | "SIBLINGS" | "FRIENDS" | "COMMUNITY">("FAMILY");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case "SIBLINGS":
        return "diversity_1";
      case "FRIENDS":
        return "group";
      case "COMMUNITY":
        return "hub";
      case "FAMILY":
      default:
        return "family_restroom";
    }
  };

  const getTypeName = (type?: string) => {
    switch (type) {
      case "SIBLINGS":
        return "Anh Chị Em";
      case "FRIENDS":
        return "Bạn Thân";
      case "COMMUNITY":
        return "Cộng Đồng";
      case "FAMILY":
      default:
        return "Đại Gia Đình";
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setIsSubmitting(true);
    const res = await createWorkspace(newWorkspaceName.trim(), newWorkspaceType);
    setIsSubmitting(false);

    if (res.success) {
      setNewWorkspaceName("");
      setIsCreateModalOpen(false);
      setIsOpen(false);
    } else {
      alert(res.error || "Không thể tạo Không gian");
    }
  };

  if (!currentWorkspace && workspaces.length === 0) {
    return null;
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-on-surface transition-all cursor-pointer shadow-sm group"
        type="button"
        title="Chuyển đổi Không gian chung"
      >
        <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-[16px]">
            {getTypeIcon(currentWorkspace?.type)}
          </span>
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xs font-bold leading-tight truncate max-w-[140px] sm:max-w-[180px]">
            {currentWorkspace?.name || "Không gian chung"}
          </span>
          <span className="text-[10px] text-on-surface-variant leading-none">
            {getTypeName(currentWorkspace?.type)}
          </span>
        </div>
        <span
          className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/70 border-b border-surface-container/60 mb-1">
            Không gian của bạn ({workspaces.length})
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1">
            {workspaces.map((ws) => {
              const isSelected = ws.id === currentWorkspace?.id;
              return (
                <button
                  key={ws.id}
                  onClick={() => {
                    switchWorkspace(ws.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-surface-container-low text-on-surface"
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="material-symbols-outlined text-[20px] text-primary shrink-0">
                      {getTypeIcon(ws.type)}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{ws.name}</div>
                      <div className="text-[10px] text-on-surface-variant opacity-80">
                        {getTypeName(ws.type)} {ws.workspaceCode ? `• ${ws.workspaceCode}` : ""}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                      check
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Create New Workspace Button */}
          <div className="mt-2 pt-2 border-t border-surface-container/60">
            <button
              onClick={() => {
                setIsCreateModalOpen(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-secondary-container hover:bg-secondary-container/10 transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Tạo Không gian chung mới</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Tạo Không Gian Mới */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest rounded-3xl p-6 max-w-md w-full shadow-2xl border border-outline-variant/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-secondary-container/15 text-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">add_business</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">Tạo Không Gian Mới</h3>
                  <p className="text-xs text-on-surface-variant">Không giới hạn người dùng và hũ tiền</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  Tên Không Gian
                </label>
                <input
                  type="text"
                  placeholder="Vd: Nhóm Bạn Thân Đại Học, Anh Em Ruột..."
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs sm:text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
                  Phân Loại Không Gian
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: "FAMILY", label: "Đại Gia Đình", icon: "family_restroom" },
                    { type: "SIBLINGS", label: "Anh Chị Em", icon: "diversity_1" },
                    { type: "FRIENDS", label: "Hội Bạn Thân", icon: "group" },
                    { type: "COMMUNITY", label: "CLB / Hội Nhóm", icon: "hub" },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setNewWorkspaceType(item.type as any)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        newWorkspaceType === item.type
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                          : "border-outline-variant/20 bg-surface-container-low hover:bg-surface-container text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      <span className="text-xs">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newWorkspaceName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Đang tạo..." : "Xác nhận tạo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

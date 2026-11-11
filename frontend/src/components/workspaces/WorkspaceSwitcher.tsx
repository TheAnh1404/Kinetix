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
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-xs group w-full"
        type="button"
        title="Chuyển đổi Không gian chung"
      >
        <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[17px]">
            {getTypeIcon(currentWorkspace?.type)}
          </span>
        </div>
        <div className="flex flex-col text-left min-w-0 flex-1">
          <span className="text-xs font-bold leading-tight truncate text-slate-900 dark:text-white">
            {currentWorkspace?.name || "Không gian chung"}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
            {getTypeName(currentWorkspace?.type)}
          </span>
        </div>
        <span
          className={`material-symbols-outlined text-[18px] text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-slate-700 dark:text-slate-300" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
            <span>Không gian của bạn</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
              {workspaces.length}
            </span>
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
                      ? "bg-red-50 dark:bg-red-950/40 text-red-950 dark:text-red-200 font-bold border border-red-200 dark:border-red-900/60"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`material-symbols-outlined text-[18px] shrink-0 ${isSelected ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"}`}>
                      {getTypeIcon(ws.type)}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{ws.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 opacity-90 font-mono">
                        {getTypeName(ws.type)} {ws.workspaceCode ? `• ${ws.workspaceCode}` : ""}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="material-symbols-outlined text-[18px] text-red-600 dark:text-red-400 shrink-0">
                      check
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Create New Workspace Button */}
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                setIsCreateModalOpen(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">add_business</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Tạo Không Gian Mới</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Đa không gian chia sẻ tài chính an toàn</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên Không Gian
                </label>
                <input
                  type="text"
                  placeholder="Vd: Nhóm Bạn Thân Đại Học, Anh Em Ruột..."
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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
                          ? "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-950 dark:text-red-200 font-bold shadow-xs"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
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
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newWorkspaceName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-98"
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

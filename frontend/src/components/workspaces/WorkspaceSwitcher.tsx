"use client";

import React, { useState, useRef, useEffect } from "react";
import { useFamily } from "@/context/FamilyContext";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal";

export const WorkspaceSwitcher: React.FC = () => {
  const { workspaces, currentWorkspace, switchWorkspace } = useFamily();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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

      {/* Modal Tạo Không Gian Mới Chuyên Nghiệp */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};

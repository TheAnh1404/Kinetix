"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { SettingsView, SettingsSection } from "./SettingsView";
export type { SettingsSection };

export function SettingsModal({
  isOpen,
  onClose,
  initialTab = "profile",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsSection;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (isOpen && dialog.current && !dialog.current.open)
      dialog.current.showModal();
  }, [isOpen]);
  if (!isOpen) return null;
  return (
    <dialog
      ref={dialog}
      className="account-settings-dialog account-ui"
      aria-labelledby="settings-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="account-settings-dialog-header">
        <h2 id="settings-modal-title">Cài đặt tài khoản</h2>
        <button
          autoFocus
          className="account-button secondary"
          onClick={onClose}
          aria-label="Đóng cài đặt"
        >
          <X size={19} />
        </button>
      </div>
      <div className="account-settings-dialog-content">
        <SettingsView initialTab={initialTab} />
      </div>
    </dialog>
  );
}

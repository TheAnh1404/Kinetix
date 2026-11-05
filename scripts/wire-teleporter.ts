// T1 không có bridge funded. Không được báo wiring hai chain hoàn tất bằng message-only.
throw new Error(
  "T2_DISABLED: cần ICTT funded adapter và nghiệm thu hai chain trước khi wiring.",
);

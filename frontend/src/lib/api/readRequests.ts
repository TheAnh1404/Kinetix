const inFlight = new Map<string, Promise<unknown>>();

/** Chỉ gộp GET đang chạy; không cache dữ liệu tài chính sau khi request kết thúc. */
export function shareReadRequest<T>(
  key: string,
  request: () => Promise<T>,
): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;
  const pending = Promise.resolve()
    .then(request)
    .finally(() => {
      // Request của phiên cũ không được xóa request mới có cùng URL sau đăng xuất.
      if (inFlight.get(key) === pending) inFlight.delete(key);
    });
  inFlight.set(key, pending);
  return pending;
}
export function clearReadRequests() {
  inFlight.clear();
}

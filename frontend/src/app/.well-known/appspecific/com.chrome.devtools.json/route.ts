import { NextResponse } from "next/server";

export const dynamic = "force-static";

/**
 * Endpoint đáp ứng truy vấn tự động từ Chrome DevTools khi bật chế độ lập trình.
 * Trả về JSON rỗng với mã 200 OK để ngăn lỗi 404/500 không mong muốn trong log máy chủ.
 */
export function GET() {
  return NextResponse.json({}, { status: 200 });
}

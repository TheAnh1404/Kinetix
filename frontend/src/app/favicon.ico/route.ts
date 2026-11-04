// Trình duyệt cũ vẫn yêu cầu /favicon.ico; dùng cùng icon SVG của App Router.
export function GET() {
  return new Response(null, {
    status: 307,
    headers: {
      Location: "/icon.svg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

import { LoginView } from "@/components/auth/LoginView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng Ký Không Gian Gia Đình Mới | Kinetix OS",
  description: "Tạo tài khoản để quản lý quỹ nhóm trên Avalanche Fuji. Có phí mạng khi giao dịch.",
};

export default function RegisterPage() {
  return <LoginView initialMode="register" />;
}

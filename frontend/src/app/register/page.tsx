import { LoginView } from "@/components/auth/LoginView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng Ký Không Gian Gia Đình Mới | Kinetix OS",
  description: "Khởi tạo không gian tài chính gia đình đa thế hệ trên Avalanche với 0 gas và bảo vệ chống lừa đảo.",
};

export default function RegisterPage() {
  return <LoginView initialMode="register" />;
}

import { LoginView } from "@/components/auth/LoginView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng Nhập & Đăng Ký | Kinetix Family Finance OS",
  description: "Xác thực ví Avalanche Core hoặc đăng nhập tài khoản thành viên gia đình.",
};

export default function LoginPage() {
  return <LoginView />;
}

import { LoginView } from "@/components/auth/LoginView";
import { DemoPersonaBar } from "@/components/auth/DemoPersonaBar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng Nhập | Kinetix Family Finance OS",
  description: "Xác thực ví Avalanche Core hoặc đăng nhập nhanh cho thành viên gia đình.",
};

export default function LoginPage() {
  return (
    <>
      <DemoPersonaBar />
      <LoginView />
    </>
  );
}

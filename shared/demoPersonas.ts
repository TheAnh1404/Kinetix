/** Định danh công khai dùng chung cho seed và demo; không chứa khóa hoặc quyền phiên. */
export const DEMO_PERSONAS = {
  admin: {
    name: "Bố Ba (Admin)",
    role: "ADMIN",
    wallet: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  guardian1: {
    name: "Cô Út (Guardian 1)",
    role: "GUARDIAN",
    wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  },
  guardian2: {
    name: "Anh Cả (Guardian 2)",
    role: "GUARDIAN",
    wallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  },
  elderly: {
    name: "Ông Nội (Cụ Ba)",
    role: "ELDERLY",
    wallet: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  },
  child: {
    name: "Bé Na (Con Gái)",
    role: "CHILD",
    wallet: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  },
} as const;
export type DemoPersona = "admin" | "elderly" | "child";
export type DemoGuardian = "admin" | "guardian1" | "guardian2";

import { notFound } from "next/navigation";
import { DemoPersonaBar } from "@/components/layout/DemoPersonaBar";

export default function JudgeDemoPage() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") notFound();
  return <DemoPersonaBar />;
}

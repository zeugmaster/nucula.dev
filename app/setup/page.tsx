import type { Metadata } from "next";
import SetupTool from "@/components/setup/SetupTool";
import "./setup.css";

export const metadata: Metadata = {
  title: "Set up your nucula — install, update & configure",
  description: "Install or update nucula v2 firmware over USB, or connect to an already flashed board to configure Wi-Fi and use its console. No development tools needed.",
};

export default function SetupPage() {
  return <SetupTool />;
}

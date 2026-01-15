"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

// 动态导入避免 SSR hydration 问题
const ProjectSelector = dynamic(
  () => import("@/components/project-selector").then((mod) => mod.ProjectSelector),
  { ssr: false }
);

const SettingsDialog = dynamic(
  () => import("@/components/settings-dialog").then((mod) => mod.SettingsDialog),
  { ssr: false }
);

export default function Home() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <main className="min-h-screen bg-background">
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex justify-end mb-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            title="AI 设置"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
        <ProjectSelector />
      </div>
    </main>
  );
}

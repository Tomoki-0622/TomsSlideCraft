"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppProvider, useApp } from "@/lib/app-context";
import HowToTab from "@/components/tabs/HowToTab";
import StoryTab from "@/components/tabs/StoryTab";
import SlideTab from "@/components/tabs/SlideTab";
import EnglishTab from "@/components/tabs/EnglishTab";
import ScriptTab from "@/components/tabs/ScriptTab";
import NarrowWarning from "@/components/NarrowWarning";

const TABS = [
  { id: "howto", label: "📖 使い方説明" },
  { id: "story", label: "📝 ストーリー作成" },
  { id: "slides", label: "🖼️ スライド資料の作成" },
  { id: "english", label: "🌐 スライド資料の英語化" },
  { id: "script", label: "📜 スクリプト作成" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AppContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProject } = useApp();

  const activeTab = (searchParams.get("tab") as TabId) ?? "howto";

  function handleTabChange(tabId: string) {
    router.push(`/app?tab=${tabId}`);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <NarrowWarning />
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#54C3E1] text-white flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="font-bold text-lg hover:text-white/90"
          >
            🎨 Tom&apos;s SlideCraft
          </button>
          {currentProject && (
            <span className="text-sm text-white/80 hidden md:block">
              / {currentProject.name}
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-white/90 hover:text-white underline"
        >
          ログアウト
        </button>
      </header>

      {/* Tab navigation */}
      <nav className="flex border-b border-gray-200 bg-white flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-[#54C3E1] text-[#54C3E1]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "howto" && <HowToTab />}
        {activeTab === "story" && <StoryTab onTabChange={handleTabChange} />}
        {activeTab === "slides" && <SlideTab onTabChange={handleTabChange} />}
        {activeTab === "english" && <EnglishTab onTabChange={handleTabChange} />}
        {activeTab === "script" && <ScriptTab onTabChange={handleTabChange} />}
      </main>
    </div>
  );
}

export default function AppPage() {
  return (
    <AppProvider>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">読み込み中...</div>}>
        <AppContent />
      </Suspense>
    </AppProvider>
  );
}

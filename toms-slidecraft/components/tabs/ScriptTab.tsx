"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import {
  getJpScriptCache,
  getEnScriptCache,
  saveJpScriptCache,
  saveEnScriptCache,
} from "@/lib/storage";
import { estimateTokens, TOKEN_WARNING_THRESHOLD } from "@/lib/token-counter";
import MarpPreview from "@/components/MarpPreview";

interface ScriptTabProps {
  onTabChange: (tab: string) => void;
}

// Parse script into slides
function parseScript(script: string, prefix: string): string[] {
  const regex = new RegExp(`${prefix}\\s*(\\d+):?`, "g");
  const parts = script.split(regex);
  const slides: string[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    slides.push(parts[i + 1]?.trim() ?? "");
  }
  return slides;
}

export default function ScriptTab({ onTabChange }: ScriptTabProps) {
  const { currentProject, markdownInEditor } = useApp();
  const [jpScript, setJpScript] = useState("");
  const [enScript, setEnScript] = useState("");
  const [jpSlides, setJpSlides] = useState<string[]>([]);
  const [enSlides, setEnSlides] = useState<string[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [transLoading, setTransLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const jpRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const enRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load from cache
  useEffect(() => {
    if (!currentProject) return;
    const jpCache = getJpScriptCache(currentProject.id);
    const enCache = getEnScriptCache(currentProject.id);

    if (jpCache && jpCache.sourceUpdatedAt === currentProject.updatedAt) {
      setJpScript(jpCache.script);
      setJpSlides(parseScript(jpCache.script, "スライド"));
    } else {
      setJpScript("");
      setJpSlides([]);
      setEnScript("");
      setEnSlides([]);
      return;
    }

    if (enCache && jpCache && enCache.sourceJpScriptUpdatedAt === jpCache.jpScriptUpdatedAt) {
      setEnScript(enCache.script);
      setEnSlides(parseScript(enCache.script, "Slide"));
    }
  }, [currentProject]);

  // Scroll to slide
  useEffect(() => {
    jpRefs.current[currentSlide]?.scrollIntoView({ behavior: "smooth", block: "center" });
    enRefs.current[currentSlide]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentSlide]);

  const handleGenerate = useCallback(async () => {
    if (!currentProject || !markdownInEditor.trim()) return;
    const tokens = estimateTokens(markdownInEditor);
    if (tokens > TOKEN_WARNING_THRESHOLD) {
      toast.warning("スライド枚数が多すぎます。スライドを分割するか不要なスライドを削除してください");
      return;
    }

    setGenLoading(true);
    try {
      const res = await fetch("/api/ai/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "generate", content: markdownInEditor }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const data = await res.json();
      const now = new Date().toISOString();
      setJpScript(data.script);
      setJpSlides(parseScript(data.script, "スライド"));
      setEnScript("");
      setEnSlides([]);
      saveJpScriptCache({
        projectId: currentProject.id,
        sourceUpdatedAt: currentProject.updatedAt,
        jpScriptUpdatedAt: now,
        script: data.script,
      });
      toast.success("日本語スクリプトを生成しました");
    } catch (err) {
      toast.error((err as Error).message || "スクリプト生成に失敗しました");
    } finally {
      setGenLoading(false);
    }
  }, [currentProject, markdownInEditor]);

  const handleTranslate = useCallback(async () => {
    if (!currentProject || !jpScript.trim()) return;
    const tokens = estimateTokens(jpScript);
    if (tokens > TOKEN_WARNING_THRESHOLD) {
      toast.warning("スクリプトが長すぎます。スライドを分割してください");
      return;
    }

    setTransLoading(true);
    try {
      const res = await fetch("/api/ai/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "translate", content: jpScript }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const data = await res.json();
      setEnScript(data.script);
      setEnSlides(parseScript(data.script, "Slide"));

      const jpCache = getJpScriptCache(currentProject.id);
      saveEnScriptCache({
        projectId: currentProject.id,
        sourceJpScriptUpdatedAt: jpCache?.jpScriptUpdatedAt ?? new Date().toISOString(),
        script: data.script,
      });
      toast.success("英語スクリプトを生成しました");
    } catch (err) {
      toast.error((err as Error).message || "英語翻訳に失敗しました");
    } finally {
      setTransLoading(false);
    }
  }, [currentProject, jpScript]);

  function handleJpChange(index: number, value: string) {
    const newSlides = [...jpSlides];
    newSlides[index] = value;
    setJpSlides(newSlides);
    // Rebuild script
    const newScript = newSlides
      .map((s, i) => `スライド ${i + 1}:\n${s}`)
      .join("\n\n");
    setJpScript(newScript);
    // Update cache timestamp
    if (currentProject) {
      const now = new Date().toISOString();
      saveJpScriptCache({
        projectId: currentProject.id,
        sourceUpdatedAt: currentProject.updatedAt,
        jpScriptUpdatedAt: now,
        script: newScript,
      });
    }
  }

  function downloadMd(content: string, lang: "jp" | "en") {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const name = currentProject?.name ?? "slides";
    const filename = `${name}_script_${lang}_${dateStr}.md`;
    const slides = lang === "jp"
      ? jpSlides.map((s, i) => `# スライド ${i + 1}\n\n${s}`)
      : enSlides.map((s, i) => `# Slide ${i + 1}\n\n${s}`);
    const blob = new Blob([slides.join("\n\n---\n\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-5xl">📂</div>
        <p className="text-lg font-medium text-gray-600">プロジェクトが選択されていません</p>
        <p className="text-sm text-gray-400">「資料の作成」タブでプロジェクトを開いてからこのタブをご利用ください。</p>
        <button
          onClick={() => onTabChange("slides")}
          className="px-4 py-2 bg-[#54C3E1] text-white rounded-lg text-sm hover:bg-[#3db1d2]"
        >
          資料の作成タブへ移動
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#F5F5F5] border-b border-gray-200">
        <span className="text-sm text-gray-600">対象: <strong>{currentProject.name}</strong></span>
        <button
          onClick={handleGenerate}
          disabled={genLoading || transLoading || !markdownInEditor.trim()}
          className="text-xs px-3 py-1.5 bg-[#54C3E1] text-white rounded hover:bg-[#3db1d2] disabled:opacity-50 flex items-center gap-1"
        >
          {genLoading ? (
            <>
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              生成中...
            </>
          ) : "📝 日本語スクリプトを生成"}
        </button>
        <button
          onClick={handleTranslate}
          disabled={genLoading || transLoading || !jpScript.trim()}
          className="text-xs px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1"
        >
          {transLoading ? (
            <>
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              翻訳中...
            </>
          ) : "🌐 英語に翻訳"}
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Left: JP script */}
        <div className="flex-1 min-w-0 border-r border-gray-200 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-[#F5F5F5] border-b border-gray-200">
            <span className="text-xs font-medium text-gray-500">📝 日本語スクリプト（編集可能）</span>
            <button
              onClick={() => downloadMd(jpScript, "jp")}
              disabled={!jpScript.trim()}
              className="text-xs text-[#54C3E1] hover:underline disabled:opacity-40"
            >
              📥 日本語MDダウンロード
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {jpSlides.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-300 text-sm">
                「日本語スクリプトを生成」ボタンで生成してください
              </div>
            ) : (
              jpSlides.map((slide, i) => (
                <div key={i}>
                  <p className="text-xs font-medium text-gray-500 mb-1">スライド {i + 1}:</p>
                  <textarea
                    ref={(el) => { jpRefs.current[i] = el; }}
                    value={slide}
                    onChange={(e) => handleJpChange(i, e.target.value)}
                    className="w-full text-sm text-[#333333] bg-[#F5F5F5] border border-gray-200 rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#54C3E1]"
                    rows={4}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: EN script */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-[#F5F5F5] border-b border-gray-200">
            <span className="text-xs font-medium text-gray-500">🌐 英語スクリプト（読み取り専用）</span>
            <button
              onClick={() => downloadMd(enScript, "en")}
              disabled={!enScript.trim()}
              className="text-xs text-[#54C3E1] hover:underline disabled:opacity-40"
            >
              📥 英語MDダウンロード
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {enSlides.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-300 text-sm">
                日本語スクリプト生成後に「英語に翻訳」ボタンで生成してください
              </div>
            ) : (
              enSlides.map((slide, i) => (
                <div key={i}>
                  <p className="text-xs font-medium text-gray-500 mb-1">Slide {i + 1}:</p>
                  <div
                    ref={(el) => { enRefs.current[i] = el; }}
                    className="w-full text-sm text-[#333333] bg-[#F5F5F5] border border-gray-200 rounded p-2 min-h-[80px]"
                  >
                    {slide}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom thumbnails */}
      <div className="border-t border-gray-200 px-4 py-2 bg-[#F5F5F5]">
        <MarpPreview
          markdown={markdownInEditor}
          currentSlide={currentSlide}
          onSlideChange={setCurrentSlide}
          showNav={false}
          showThumbnails
          className="h-20"
        />
      </div>
    </div>
  );
}

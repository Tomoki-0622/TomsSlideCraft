"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import {
  saveProject,
  getAllProjects,
  checkStorageCapacity,
  type Project,
} from "@/lib/storage";
import { estimateTokens, TOKEN_WARNING_THRESHOLD } from "@/lib/token-counter";
import MarpPreview from "@/components/MarpPreview";
import { v4 as uuidv4 } from "uuid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface EnglishTabProps {
  onTabChange: (tab: string) => void;
}

export default function EnglishTab({ onTabChange }: EnglishTabProps) {
  const { currentProject, markdownInEditor, triggerRefresh } = useApp();
  const [translating, setTranslating] = useState(false);
  const [enMarkdown, setEnMarkdown] = useState("");
  const [enProject, setEnProject] = useState<Project | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState(false);

  // Find existing EN project
  useEffect(() => {
    if (!currentProject) return;
    const allProjects = getAllProjects();
    const existing = allProjects.find(
      (p) => p.parentProjectId === currentProject.id
    );
    if (existing) {
      setEnProject(existing);
      setEnMarkdown(existing.markdown);
    } else {
      setEnProject(null);
      setEnMarkdown("");
    }
  }, [currentProject]);

  const doTranslate = useCallback(async () => {
    if (!currentProject || !markdownInEditor.trim()) return;

    const tokens = estimateTokens(markdownInEditor);
    if (tokens > TOKEN_WARNING_THRESHOLD) {
      toast.warning("スライド枚数が多すぎるため翻訳できません。スライドを分割してください");
      return;
    }

    setTranslating(true);
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: markdownInEditor }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const data = await res.json();

      const capacity = checkStorageCapacity();
      if (capacity === "full") {
        throw new Error("容量上限のため保存できません。不要なプロジェクトを削除してください");
      }

      const enName = `${currentProject.name} (EN)`;
      const newEnProject: Project = enProject
        ? { ...enProject, markdown: data.markdown, name: enName, updatedAt: new Date().toISOString() }
        : { id: uuidv4(), name: enName, markdown: data.markdown, updatedAt: new Date().toISOString(), parentProjectId: currentProject.id };

      saveProject(newEnProject);
      setEnProject(newEnProject);
      setEnMarkdown(data.markdown);
      triggerRefresh();
      toast.success(`英語版を「${enName}」として保存しました`);
    } catch (err) {
      toast.error((err as Error).message || "翻訳に失敗しました。再度お試しください");
    } finally {
      setTranslating(false);
      setConfirmDialog(false);
    }
  }, [currentProject, markdownInEditor, enProject, triggerRefresh]);

  function handleTranslateClick() {
    if (enProject) {
      setConfirmDialog(true);
    } else {
      doTranslate();
    }
  }

  async function handleHtmlDownload() {
    if (!enMarkdown.trim()) return;
    try {
      const res = await fetch("/api/slides/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: enMarkdown }),
      });
      const data = await res.json();
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${data.css}</style></head><body>${data.html}</body></html>`;
      const blob = new Blob([fullHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      a.href = url;
      a.download = `${enProject?.name ?? "slides_en"}_${dateStr}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("HTML出力に失敗しました");
    }
  }

  async function handlePptxDownload() {
    if (!enMarkdown.trim()) return;
    try {
      const pptxgen = (await import("pptxgenjs")).default;
      const prs = new pptxgen();
      const slides = enMarkdown.split(/^---$/m).filter((s) => s.trim() && !s.includes("marp: true"));
      slides.forEach((slideContent) => {
        const slide = prs.addSlide();
        const lines = slideContent.trim().split("\n").filter((l) => l.trim());
        let y = 0.5;
        lines.forEach((line) => {
          const heading = line.match(/^#{1,3}\s+(.+)/);
          const bullet = line.match(/^[-*]\s+(.+)/);
          if (heading) {
            slide.addText(heading[1], { x: 0.5, y, w: 9, h: 0.6, fontSize: heading[0].startsWith("# ") ? 28 : 22, bold: true, color: "54C3E1" });
            y += 0.7;
          } else if (bullet) {
            slide.addText(`• ${bullet[1]}`, { x: 0.7, y, w: 8.8, h: 0.4, fontSize: 16, color: "333333" });
            y += 0.45;
          } else if (line.trim() && !line.startsWith("<") && !line.startsWith("style:") && !line.startsWith("  ")) {
            slide.addText(line.trim(), { x: 0.5, y, w: 9, h: 0.4, fontSize: 14, color: "333333" });
            y += 0.45;
          }
        });
      });
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      await prs.writeFile({ fileName: `${enProject?.name ?? "slides_en"}_${dateStr}.pptx` });
    } catch {
      toast.error("PPTX出力に失敗しました");
    }
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
      <div className="flex items-center gap-3 px-4 py-2 bg-[#F5F5F5] border-b border-gray-200 flex-wrap">
        <span className="text-sm text-gray-600">対象: <strong>{currentProject.name}</strong></span>
        <button
          onClick={handleTranslateClick}
          disabled={translating || !markdownInEditor.trim()}
          className="text-xs px-3 py-1.5 bg-[#54C3E1] text-white rounded hover:bg-[#3db1d2] disabled:opacity-50 flex items-center gap-1"
        >
          {translating ? (
            <>
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              翻訳中...
            </>
          ) : "🌐 英語に翻訳して保存"}
        </button>
        <span className="text-xs text-gray-500">
          翻訳済み: {enProject ? <span className="text-green-600 font-medium">{enProject.name}</span> : "なし"}
        </span>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={handleHtmlDownload}
            disabled={!enMarkdown.trim() || translating}
            className="text-xs px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
          >
            🌐 HTMLダウンロード
          </button>
          <button
            onClick={handlePptxDownload}
            disabled={!enMarkdown.trim() || translating}
            className="text-xs px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
          >
            📊 PPTXダウンロード
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Japanese */}
        <div className="flex-1 min-w-0 p-3 border-r border-gray-200 flex flex-col gap-2">
          <p className="text-xs font-medium text-gray-500">🇯🇵 日本語版（現在のスライド）</p>
          <MarpPreview
            markdown={markdownInEditor}
            currentSlide={currentSlide}
            onSlideChange={setCurrentSlide}
            showNav={false}
            showThumbnails={false}
            className="flex-1"
          />
        </div>
        {/* Right: English */}
        <div className="flex-1 min-w-0 p-3 flex flex-col gap-2">
          <p className="text-xs font-medium text-gray-500">🇬🇧 英語版プレビュー（AI翻訳後）</p>
          {enMarkdown ? (
            <MarpPreview
              markdown={enMarkdown}
              currentSlide={currentSlide}
              onSlideChange={setCurrentSlide}
              showNav={false}
              showThumbnails={false}
              className="flex-1"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-300">
              <p className="text-sm text-gray-400">「英語に翻訳して保存」で英語版が表示されます</p>
            </div>
          )}
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

      {/* Overwrite dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>英語版を上書きしますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            既存の英語版「{enProject?.name}」を上書きします。よろしいですか？
          </p>
          <DialogFooter>
            <button onClick={() => setConfirmDialog(false)} className="text-sm px-4 py-2 border rounded">
              キャンセル
            </button>
            <button onClick={doTranslate} className="text-sm px-4 py-2 bg-[#54C3E1] text-white rounded">
              上書きして翻訳
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

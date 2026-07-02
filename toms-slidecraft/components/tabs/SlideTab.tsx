"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import {
  saveProject,
  extractProjectName,
  DEFAULT_FRONTMATTER,
  checkStorageCapacity,
  type Project,
} from "@/lib/storage";
import { estimateTokens, TOKEN_WARNING_THRESHOLD } from "@/lib/token-counter";
import MarpPreview from "@/components/MarpPreview";
import IconSearch from "@/components/IconSearch";
import { v4 as uuidv4 } from "uuid";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type LeftMode = "chat" | "edit";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SlideTabProps {
  onTabChange: (tab: string) => void;
}

export default function SlideTab({ onTabChange }: SlideTabProps) {
  const { currentProject, setCurrentProject, markdownInEditor, setMarkdownInEditor, triggerRefresh } = useApp();
  const [leftMode, setLeftMode] = useState<LeftMode>("chat");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [unsaved, setUnsaved] = useState(false);
  const [savedLabel, setSavedLabel] = useState<"unsaved" | "saved">("saved");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load project from sessionStorage (when navigating from dashboard or story tab)
  useEffect(() => {
    const storedProject = sessionStorage.getItem("slidecraft:open:project");
    if (storedProject) {
      try {
        const project: Project = JSON.parse(storedProject);
        setCurrentProject(project);
        setMarkdownInEditor(project.markdown);
        sessionStorage.removeItem("slidecraft:open:project");
        setSavedLabel("saved");
        setUnsaved(false);
      } catch {}
    } else if (markdownInEditor && !currentProject) {
      // Coming from story tab
      setSavedLabel("unsaved");
      setUnsaved(true);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  function handleMarkdownChange(md: string) {
    setMarkdownInEditor(md);
    setUnsaved(true);
    setSavedLabel("unsaved");
  }

  function handleSave() {
    const capacity = checkStorageCapacity();
    if (capacity === "full") {
      toast.error("容量上限に達しました。不要なプロジェクトを削除してください");
      return;
    }
    if (capacity === "warn") {
      toast.warning("LocalStorageの使用量が4MBを超えています");
    }

    const projectName = extractProjectName(markdownInEditor);
    const project: Project = currentProject
      ? { ...currentProject, markdown: markdownInEditor, name: projectName, updatedAt: new Date().toISOString() }
      : { id: uuidv4(), name: projectName, markdown: markdownInEditor, updatedAt: new Date().toISOString() };

    saveProject(project);
    setCurrentProject(project);
    setUnsaved(false);
    setSavedLabel("saved");
    triggerRefresh();
    toast.success(`「${project.name}」を保存しました`);
  }

  function handleFileOpen() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".md")) {
      toast.error(".mdファイルのみインポートできます");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      let md = (ev.target?.result as string) ?? "";
      // Add frontmatter if missing
      if (!md.includes("marp: true")) {
        md = DEFAULT_FRONTMATTER + md;
      }
      setMarkdownInEditor(md);
      setUnsaved(true);
      setSavedLabel("unsaved");
      // Auto-save as new project
      const capacity = checkStorageCapacity();
      if (capacity !== "full") {
        const projectName = extractProjectName(md);
        const project: Project = {
          id: uuidv4(),
          name: projectName,
          markdown: md,
          updatedAt: new Date().toISOString(),
        };
        saveProject(project);
        setCurrentProject(project);
        setUnsaved(false);
        setSavedLabel("saved");
        triggerRefresh();
        toast.success(`「${projectName}」をインポートしました`);
      }
    };
    reader.onerror = () => toast.error("ファイルの読み取りに失敗しました");
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleHtmlDownload() {
    if (!markdownInEditor.trim()) return;
    try {
      const res = await fetch("/api/slides/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: markdownInEditor }),
      });
      const data = await res.json();
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${data.css}</style></head><body>${data.html}</body></html>`;
      const blob = new Blob([fullHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      a.href = url;
      a.download = `${currentProject?.name ?? "slides"}_${dateStr}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("HTML出力に失敗しました");
    }
  }

  async function handlePptxDownload() {
    if (!markdownInEditor.trim()) return;
    try {
      const pptxgen = (await import("pptxgenjs")).default;
      const prs = new pptxgen();
      // Parse slides from markdown
      const slides = markdownInEditor.split(/^---$/m).filter((s) => s.trim() && !s.includes("marp: true"));
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
      await prs.writeFile({ fileName: `${currentProject?.name ?? "slides"}_${dateStr}.pptx` });
    } catch (err) {
      console.error(err);
      toast.error("PPTX出力に失敗しました");
    }
  }

  const handleAiChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;

    const tokens = estimateTokens(markdownInEditor + chatInput);
    if (tokens > TOKEN_WARNING_THRESHOLD) {
      toast.warning("スライド枚数が多すぎるため処理できません。スライドを分割するか不要なスライドを削除してください");
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages([...newMessages, { role: "assistant", content: "生成中..." }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: markdownInEditor, instruction: userMsg.content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const data = await res.json();
      setChatMessages([...newMessages, { role: "assistant", content: "✅ マークダウンを更新しました" }]);
      handleMarkdownChange(data.markdown);
    } catch (err) {
      setChatMessages([...newMessages, { role: "assistant", content: `❌ ${(err as Error).message}` }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, chatMessages, markdownInEditor]);

  function handleIconInsert(url: string) {
    setChatInput((prev) => prev + `![w:48px](${url})`);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#F5F5F5] border-b border-gray-200 flex-wrap">
        <input ref={fileInputRef} type="file" accept=".md" className="hidden" onChange={handleFileChange} />
        <button onClick={handleFileOpen} className="text-xs px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50">
          📂 ファイルを開く
        </button>
        <button onClick={handleHtmlDownload} disabled={!markdownInEditor.trim()} className="text-xs px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">
          🌐 HTML出力
        </button>
        <button onClick={handlePptxDownload} disabled={!markdownInEditor.trim()} className="text-xs px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">
          📊 PPTXダウンロード
        </button>
        <Tooltip>
          <TooltipTrigger>
            <span className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded opacity-40 cursor-not-allowed inline-flex items-center">
              🎨 テーマ選択
            </span>
          </TooltipTrigger>
          <TooltipContent>MVP後に追加予定</TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        <button
          onClick={handleSave}
          disabled={!markdownInEditor.trim()}
          className="text-xs px-3 py-1.5 bg-[#54C3E1] text-white rounded hover:bg-[#3db1d2] disabled:opacity-40 font-medium"
        >
          💾 保存
        </button>
        <span className={`text-xs ${savedLabel === "unsaved" ? "text-orange-500" : "text-green-500"}`}>
          {savedLabel === "unsaved" ? "● 未保存" : "✓ 保存済み"}
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left Panel */}
        <div className="flex flex-col w-[380px] flex-shrink-0 border-r border-gray-200">
          {/* Toggle */}
          <div className="flex border-b border-gray-200 bg-[#F5F5F5]">
            <button
              onClick={() => setLeftMode("chat")}
              className={`flex-1 text-xs py-2 ${leftMode === "chat" ? "bg-white border-b-2 border-[#54C3E1] font-medium" : "text-gray-500 hover:bg-white/50"}`}
            >
              AIチャット
            </button>
            <button
              onClick={() => setLeftMode("edit")}
              className={`flex-1 text-xs py-2 ${leftMode === "edit" ? "bg-white border-b-2 border-[#54C3E1] font-medium" : "text-gray-500 hover:bg-white/50"}`}
            >
              MD編集
            </button>
          </div>

          {leftMode === "chat" ? (
            <>
              {/* Chat messages (top 2/3) */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0" style={{ maxHeight: "calc(67% - 80px)" }}>
                {chatMessages.length === 0 && (
                  <p className="text-xs text-gray-400 text-center mt-4">
                    修正指示を入力してください。<br />例:「3枚目に表を追加してください」
                  </p>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ${
                      msg.role === "user" ? "bg-[#54C3E1] text-white" : "bg-[#F5F5F5] text-[#333333]"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div className="p-2 border-t border-gray-200 bg-white">
                <div className="flex gap-1">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAiChat();
                      }
                    }}
                    placeholder="修正指示を入力..."
                    rows={2}
                    disabled={chatLoading}
                    className="flex-1 text-xs px-2 py-1.5 border border-gray-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-[#54C3E1]"
                  />
                  <button
                    onClick={handleAiChat}
                    disabled={chatLoading || !chatInput.trim()}
                    className="px-2 py-1 bg-[#54C3E1] text-white rounded text-xs disabled:opacity-50"
                  >
                    {chatLoading ? (
                      <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : "🔄"}
                  </button>
                </div>
              </div>

              {/* Icon search (bottom 1/3) */}
              <div className="border-t border-gray-200" style={{ height: "33%" }}>
                <IconSearch onInsert={handleIconInsert} />
              </div>
            </>
          ) : (
            /* Markdown direct edit */
            <textarea
              value={markdownInEditor}
              onChange={(e) => handleMarkdownChange(e.target.value)}
              className="flex-1 p-3 text-xs font-mono resize-none focus:outline-none border-0"
              placeholder="マークダウンを直接編集..."
              spellCheck={false}
            />
          )}
        </div>

        {/* Right: Slide preview */}
        <div className="flex-1 min-w-0 p-4">
          <MarpPreview
            markdown={markdownInEditor}
            currentSlide={currentSlide}
            onSlideChange={setCurrentSlide}
            showNav
            showThumbnails
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import { estimateTokens, TOKEN_WARNING_THRESHOLD } from "@/lib/token-counter";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SESSION_CHAT_KEY = "slidecraft:story:chat";
const SESSION_MD_KEY = "slidecraft:story:md";

export default function StoryTab({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const router = useRouter();
  const { markdownInEditor, setMarkdownInEditor, currentProject } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [resetDialog, setResetDialog] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditingMarkdown, setIsEditingMarkdown] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load from sessionStorage on mount
  useEffect(() => {
    const savedChat = sessionStorage.getItem(SESSION_CHAT_KEY);
    const savedMd = sessionStorage.getItem(SESSION_MD_KEY);
    if (savedChat) {
      try { setMessages(JSON.parse(savedChat)); } catch {}
    }
    if (savedMd) {
      setMarkdown(savedMd);
    } else {
      // Initial greeting
      setMessages([
        {
          role: "assistant",
          content: `こんにちは！Tom's SlideCraftです。プレゼン資料のストーリー設計をお手伝いします。

以下のテンプレートからお選びください：

1️⃣ **パターン1: コンセプト確認会議** — 投資可否・方針合意
2️⃣ **パターン2: 設計レビュー会議** — 設計承認・修正ポイント確認
3️⃣ **パターン3: サービスイン確認会議** — Go/No-Go判定
4️⃣ **パターン4: 月次会議資料** — 情報共有・事例紹介
5️⃣ **パターン5: その他（フリー入力）** — 自由にゴールと目次を設定

番号を入力してお選びください。`,
        },
      ]);
    }
  }, []);

  // Save to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(SESSION_CHAT_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    sessionStorage.setItem(SESSION_MD_KEY, markdown);
  }, [markdown]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const totalTokens = estimateTokens(
      messages.map((m) => m.content).join("\n") + input
    );
    if (totalTokens > TOKEN_WARNING_THRESHOLD) {
      toast.warning("トークン上限に近づいています。会話を続けると制限を超える可能性があります。");
    }

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // Add placeholder
    setMessages([...newMessages, { role: "assistant", content: "生成中..." }]);

    try {
      const res = await fetch("/api/ai/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "AI応答に失敗しました");
      }
      const data = await res.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.content,
      };
      setMessages([...newMessages, assistantMessage]);
      if (data.markdown) {
        setMarkdown(data.markdown);
      }
    } catch (err) {
      const errMsg = (err as Error).message || "AI応答に失敗しました。再送信してください。";
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: `❌ ${errMsg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  function handleReset() {
    setMessages([
      {
        role: "assistant",
        content: `こんにちは！Tom's SlideCraftです。プレゼン資料のストーリー設計をお手伝いします。

以下のテンプレートからお選びください：

1️⃣ **パターン1: コンセプト確認会議** — 投資可否・方針合意
2️⃣ **パターン2: 設計レビュー会議** — 設計承認・修正ポイント確認
3️⃣ **パターン3: サービスイン確認会議** — Go/No-Go判定
4️⃣ **パターン4: 月次会議資料** — 情報共有・事例紹介
5️⃣ **パターン5: その他（フリー入力）** — 自由にゴールと目次を設定

番号を入力してお選びください。`,
      },
    ]);
    setMarkdown("");
    setResetDialog(false);
  }

  function handleExport() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "story.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleOpenInSlides() {
    if (currentProject) {
      setOpenDialog(true);
    } else {
      setMarkdownInEditor(markdown);
      router.push("/app?tab=slides");
    }
  }

  function confirmOpenInSlides() {
    setMarkdownInEditor(markdown);
    setOpenDialog(false);
    router.push("/app?tab=slides");
  }

  return (
    <div className="flex h-full gap-0">
      {/* Left: Chat */}
      <div className="flex flex-col w-1/2 border-r border-gray-200">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[#54C3E1] text-white"
                    : msg.content === "生成中..."
                    ? "bg-gray-100 text-gray-400 italic"
                    : "bg-[#F5F5F5] text-[#333333]"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-3 bg-white space-y-2">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="メッセージを入力（Enterで送信、Shift+Enterで改行）— AIが「少々お待ちください」と言ったら「お願いします」と送信してください"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none text-sm focus:outline-none focus:ring-2 focus:ring-[#54C3E1]"
              rows={2}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-[#54C3E1] text-white rounded-lg hover:bg-[#3db1d2] disabled:opacity-50 text-sm font-medium"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                "送信"
              )}
            </button>
          </div>
          <button
            onClick={() => setResetDialog(true)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            最初からやり直す
          </button>
        </div>
      </div>

      {/* Right: Markdown preview */}
      <div className="flex flex-col w-1/2">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-[#F5F5F5]">
          <span className="text-sm font-medium text-gray-600">マークダウンプレビュー</span>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={!markdown}
              className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-white disabled:opacity-40"
            >
              📥 エクスポート
            </button>
            <button
              onClick={() => setIsEditingMarkdown((prev) => !prev)}
              disabled={!markdown}
              className={`text-xs px-3 py-1 rounded disabled:opacity-40 ${
                isEditingMarkdown
                  ? "bg-gray-600 text-white hover:bg-gray-700"
                  : "bg-[#54C3E1] text-white hover:bg-[#3db1d2]"
              }`}
            >
              {isEditingMarkdown ? "✅ 編集を完了" : "✏️ マークダウンを修正する"}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-white">
          {isEditingMarkdown ? (
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="w-full h-full p-4 text-xs font-mono text-[#333333] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#54C3E1]"
              placeholder="マークダウンを直接編集できます"
              spellCheck={false}
            />
          ) : markdown ? (
            <pre className="p-4 text-xs font-mono text-[#333333] whitespace-pre-wrap leading-relaxed">
              {markdown}
            </pre>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-300 text-sm">
              AIとの会話でマークダウンが生成されるとここに表示されます
            </div>
          )}
        </div>
      </div>

      {/* Reset dialog */}
      <Dialog open={resetDialog} onOpenChange={setResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>最初からやり直す</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            チャット履歴とマークダウンをクリアします。LocalStorageのプロジェクトデータは残ります。
          </p>
          <DialogFooter>
            <button onClick={() => setResetDialog(false)} className="text-sm px-4 py-2 border rounded">
              キャンセル
            </button>
            <button onClick={handleReset} className="text-sm px-4 py-2 bg-[#54C3E1] text-white rounded">
              クリアする
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open in slides dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スライド編集で開く</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            現在「{currentProject?.name}」が開いています。このマークダウンで上書きしてよいですか？
          </p>
          <DialogFooter>
            <button onClick={() => setOpenDialog(false)} className="text-sm px-4 py-2 border rounded">
              キャンセル
            </button>
            <button onClick={confirmOpenInSlides} className="text-sm px-4 py-2 bg-[#54C3E1] text-white rounded">
              上書きして開く
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

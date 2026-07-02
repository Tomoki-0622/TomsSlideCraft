"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface SlideData {
  html: string;
  css: string;
  slideCount: number;
}

interface MarpPreviewProps {
  markdown: string;
  currentSlide: number;
  onSlideChange?: (slide: number) => void;
  showNav?: boolean;
  showThumbnails?: boolean;
  className?: string;
}

function buildSlideHtml(sectionHtml: string, css: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
html, body {
  margin: 0; padding: 0;
  width: 1280px; height: 720px;
  overflow: hidden;
  background: white;
}
${css}
section {
  width: 1280px !important;
  height: 720px !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
</head>
<body>
${sectionHtml}
</body>
</html>`;
}

function parseSections(html: string): string[] {
  const matches = [...html.matchAll(/<section[^>]*>([\s\S]*?)<\/section>/g)];
  return matches.map((m) => m[0]);
}

export default function MarpPreview({
  markdown,
  currentSlide,
  onSlideChange,
  showNav = true,
  showThumbnails = true,
  className = "",
}: MarpPreviewProps) {
  const [slideData, setSlideData] = useState<SlideData | null>(null);
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const renderSlides = useCallback(async (md: string) => {
    if (!md.trim()) {
      setSlideData(null);
      setSections([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/slides/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: md }),
      });
      if (!res.ok) throw new Error("レンダリングエラー");
      const data: SlideData = await res.json();
      setSlideData(data);
      setSections(parseSections(data.html));
    } catch {
      setError("レンダリングエラー: マークダウンの構文を確認してください");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => renderSlides(markdown), 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [markdown, renderSlides]);

  const totalSlides = sections.length;
  const safeSlide = Math.max(0, Math.min(currentSlide, totalSlides - 1));

  function goTo(index: number) {
    const clamped = Math.max(0, Math.min(index, totalSlides - 1));
    onSlideChange?.(clamped);
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-50 rounded border border-red-200 ${className}`}>
        <p className="text-red-500 text-sm p-4">{error}</p>
      </div>
    );
  }

  if (!markdown.trim()) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 rounded border border-gray-200 ${className}`}>
        <p className="text-gray-400 text-sm">マークダウンを入力するとプレビューが表示されます</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Main slide */}
      <div className="relative bg-gray-100 rounded overflow-hidden flex-1 min-h-0">
        {loading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
            <svg className="animate-spin h-6 w-6 text-[#54C3E1]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
        {sections.length > 0 && slideData && (
          <div className="w-full h-full flex items-center justify-center p-2">
            <div
              className="relative overflow-hidden shadow-md"
              style={{
                width: "100%",
                aspectRatio: "16/9",
              }}
            >
              <iframe
                key={`slide-${safeSlide}`}
                srcDoc={buildSlideHtml(sections[safeSlide] ?? "", slideData.css)}
                className="w-full h-full border-0"
                style={{
                  transform: "none",
                }}
                sandbox="allow-same-origin"
                title={`Slide ${safeSlide + 1}`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {showNav && totalSlides > 0 && (
        <div className="flex items-center justify-center gap-3 text-sm text-gray-600">
          <button
            onClick={() => goTo(safeSlide - 1)}
            disabled={safeSlide === 0}
            className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30"
          >
            ←
          </button>
          <span>
            スライド {safeSlide + 1} / {totalSlides}
          </span>
          <button
            onClick={() => goTo(safeSlide + 1)}
            disabled={safeSlide >= totalSlides - 1}
            className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}

      {/* Thumbnails */}
      {showThumbnails && totalSlides > 0 && slideData && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sections.map((section, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`flex-shrink-0 rounded overflow-hidden border-2 transition-colors ${
                i === safeSlide ? "border-[#54C3E1]" : "border-transparent hover:border-gray-300"
              }`}
              style={{ width: 120, height: 68 }}
              title={`スライド ${i + 1}`}
            >
              <div className="relative w-full h-full overflow-hidden">
                <iframe
                  srcDoc={buildSlideHtml(section, slideData.css)}
                  className="border-0 pointer-events-none"
                  style={{
                    width: 1280,
                    height: 720,
                    transform: "scale(0.09375)",
                    transformOrigin: "top left",
                  }}
                  sandbox="allow-same-origin"
                  title={`Thumbnail ${i + 1}`}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

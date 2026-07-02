"use client";

import { useState, useCallback } from "react";

interface IconResult {
  name: string;
  url: string;
  prefix: string;
}

interface IconSearchProps {
  onInsert: (url: string) => void;
}

export default function IconSearch({ onInsert }: IconSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IconResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchIcons = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=20`
      );
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const icons: IconResult[] = (data.icons ?? []).map((icon: string) => {
        const [prefix, name] = icon.split(":");
        return {
          name: icon,
          prefix,
          url: `https://api.iconify.design/${prefix}/${name}.svg`,
        };
      });
      setResults(icons);
    } catch {
      setError("アイコン検索が利用できません。URLを直接入力してください");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    searchIcons(query);
  }

  return (
    <div className="flex flex-col h-full bg-[#F5F5F5] border-t border-gray-200">
      <div className="p-2 border-b border-gray-200 bg-white">
        <p className="text-xs font-medium text-gray-500 mb-1">アイコン検索</p>
        <form onSubmit={handleSearch} className="flex gap-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例: check, arrow, user..."
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#54C3E1]"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-2 py-1 bg-[#54C3E1] text-white text-xs rounded hover:bg-[#3db1d2] disabled:opacity-50"
          >
            検索
          </button>
        </form>
      </div>
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-2 text-xs text-red-500">{error}</div>
        )}
        {loading && (
          <div className="p-4 text-center">
            <svg className="animate-spin h-4 w-4 mx-auto text-[#54C3E1]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
        {!loading && results.length === 0 && !error && query && (
          <p className="text-xs text-gray-400 p-3">検索結果がありません</p>
        )}
        <div className="p-2 space-y-1">
          {results.map((icon) => (
            <div
              key={icon.name}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-white group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={icon.url}
                alt={icon.name}
                className="w-6 h-6 flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-xs text-gray-600 flex-1 truncate">{icon.name}</span>
              <button
                onClick={() => onInsert(icon.url)}
                className="text-xs text-[#54C3E1] hover:underline flex-shrink-0 opacity-0 group-hover:opacity-100"
              >
                挿入
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

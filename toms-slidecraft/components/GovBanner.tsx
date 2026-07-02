"use client";

import { useEffect, useState } from "react";
import { isGovernanceAccepted, acceptGovernance } from "@/lib/storage";

export default function GovBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isGovernanceAccepted());
  }, []);

  if (!visible) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
      <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
      <div className="flex-1">
        <p className="text-sm text-[#333333]">
          本ツールで入力した内容は社内Azure OpenAI環境に送信されます。社内情報取り扱いルールに従ってご利用ください。
        </p>
      </div>
      <button
        onClick={() => {
          acceptGovernance();
          setVisible(false);
        }}
        className="text-sm text-[#54C3E1] hover:underline flex-shrink-0 font-medium"
      >
        確認しました
      </button>
    </div>
  );
}

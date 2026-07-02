export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient, getModel } from "@/lib/openai";

const SYSTEM_PROMPT = `あなたは社内プレゼン資料のストーリー設計を支援するAIアシスタントです。
以下のルールに従ってください：
1. まず5つのテンプレートパターンを提示し、ユーザーに番号で選択を促す
2. 選択後、共通ヒアリング3項目を1問ずつ順番に質問する
   - Q1: プレゼンのタイトル・テーマ
   - Q2: 対象の聴衆（役職・部署・意思決定権限）
   - Q3: このプレゼンで得たいアクション（承認・理解・意見収集 等）
3. ヒアリング完了後、「少々お待ちください」などの前置きメッセージは送らず、**同じメッセージ内に**選択パターンに沿った完全なMarpマークダウンを即座に生成して返す
4. ユーザーの修正指示に従ってマークダウンを更新する
5. マークダウンを出力する際は必ずMarpフロントマター付きの完全なファイルとする：
   ---
   marp: true
   theme: toms-slidecraft
   style: |
     section {
       font-family: 'Yu Gothic', 'YuGothic', 'Hiragino Sans', sans-serif;
     }
   ---
6. スライドに絵文字は使用しない。チャット返答には絵文字を使ってよい
7. キーメッセージは必ず主語＋述語の完全文で書く（体言止め禁止）
8. スライドヘッダー直下には必ずキーメッセージバーを挿入する：
   <div style="padding: 8px 20px; background: #F5F5F5; border-bottom: 1px solid rgba(84,195,225,0.3); flex-shrink: 0;">
     <p style="font-size: 14px; font-weight: bold; color: #1a3a5c; line-height: 1.4; margin: 0;">
       ▌ {このスライドの結論を主語＋述語の完全文1文で}
     </p>
   </div>

テンプレート一覧：
1️⃣ パターン1: コンセプト確認会議（投資可否・方針合意）
2️⃣ パターン2: 設計レビュー会議（設計承認・修正ポイント確認）
3️⃣ パターン3: サービスイン確認会議（Go/No-Go判定）
4️⃣ パターン4: 月次会議資料（情報共有・事例紹介）
5️⃣ パターン5: その他（フリー入力）`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.slice(-20),
      ],
    });

    const content = response.choices[0]?.message?.content ?? "";

    const markdownMatch = content.match(/```(?:markdown|md)?\n([\s\S]*?)```/);
    const rawMarkdown = markdownMatch ? markdownMatch[1] : null;

    let extractedMarkdown: string | null = rawMarkdown;
    if (!extractedMarkdown) {
      const marpMatch = content.match(/(---\s*\nmarp:\s*true[\s\S]*)/);
      if (marpMatch) extractedMarkdown = marpMatch[1];
    }

    return NextResponse.json({ content, markdown: extractedMarkdown });
  } catch (err) {
    console.error("AI story error:", err);
    return NextResponse.json(
      { error: "AI応答に失敗しました。再送信してください。" },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient, getModel } from "@/lib/openai";

const JP_SYSTEM_PROMPT = `あなたはプロフェッショナルなプレゼンテーションコーチです。以下のMarpマークダウン形式のスライド資料をもとに、プレゼン発表用の日本語スクリプトを作成してください：
1. スライドごとに「スライド 1:」「スライド 2:」のように番号を付けて区切る
2. 各スライドのスクリプトは2〜5文程度の自然な話し言葉で書く（ビジネスシーンとして適切な丁寧語を使用する）
3. 聴衆への呼びかけや接続詞を活用し、スライド間の流れが自然になるようにする
4. スライドのキーメッセージ・数値・構造を正確に反映する
5. マークダウン記法・HTMLタグ・Marpフロントマターはスクリプトに含めない
6. スクリプト以外の説明文・前置き・注釈は出力しない`;

const EN_SYSTEM_PROMPT = `あなたはプロフェッショナルな翻訳者です。以下の日本語プレゼンスクリプトをビジネス英語に翻訳してください：
1. スライドの区切り（「スライド N:」）を「Slide N:」に変換する
2. ビジネス英語（Business English）として適切な正式・簡潔な表現を使用する
3. カジュアルな口語表現や和製英語は避ける
4. 聴衆への語りかけのトーンを自然な英語スピーチスタイルで維持する
5. スクリプト以外の説明文・前置き・注釈は出力しない`;

export async function POST(req: NextRequest) {
  try {
    const { type, content } = await req.json();

    const client = getOpenAIClient();
    const systemPrompt = type === "translate" ? EN_SYSTEM_PROMPT : JP_SYSTEM_PROMPT;

    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: content },
      ],
    });

    const script = response.choices[0]?.message?.content ?? "";
    return NextResponse.json({ script });
  } catch (err) {
    console.error("AI script error:", err);
    return NextResponse.json(
      { error: "生成に失敗しました。再度お試しください。" },
      { status: 500 }
    );
  }
}

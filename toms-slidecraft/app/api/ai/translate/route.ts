export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient, getModel } from "@/lib/openai";

const SYSTEM_PROMPT = `あなたはプロフェッショナルな翻訳者です。以下のルールに従って、Marpマークダウン形式のプレゼン資料を日本語から英語に翻訳してください：
1. Marpフロントマター（---で囲まれたYAMLブロック）は変更しない
2. マークダウン記法（##, -, ***, ---, HTMLタグ等）は変更しない
3. スライドの構造・レイアウトを維持する
4. ビジネスプレゼン向けのビジネス英語（Business English）にする。正式・簡潔な表現を優先し、カジュアルな口語表現や和製英語は避ける
5. 絵文字・アイコンURL・数字・コードは翻訳しない
6. 完全なマークダウンファイルをそのまま返す（説明文は不要）`;

export async function POST(req: NextRequest) {
  try {
    const { markdown } = await req.json();

    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: markdown },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "";
    const cleaned = content
      .replace(/^```(?:markdown|md)?\n/, "")
      .replace(/\n```$/, "")
      .trim();

    return NextResponse.json({ markdown: cleaned });
  } catch (err) {
    console.error("AI translate error:", err);
    return NextResponse.json(
      { error: "翻訳に失敗しました。再度お試しください。" },
      { status: 500 }
    );
  }
}

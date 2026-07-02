export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient, getModel } from "@/lib/openai";

const SYSTEM_PROMPT = `あなたはMarpマークダウン形式のプレゼン資料を編集するAIアシスタントです。
以下のルールに従ってください：
1. ユーザーの修正指示とマークダウン全文を受け取り、修正後の完全なマークダウン全文のみを返す
2. 指示された箇所のみを変更し、それ以外のスライド内容・構造・Marpフロントマターは変更しない
3. 返答にはマークダウン全文以外の説明文・前置き・注釈を含めない
4. スライドに絵文字は使用しない（アイコンはIconify URLを使用）
5. キーメッセージは必ず主語＋述語の完全文で書く（体言止め禁止）`;

export async function POST(req: NextRequest) {
  try {
    const { markdown, instruction } = await req.json();

    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `以下のマークダウンに対して修正してください。\n\n指示: ${instruction}\n\n現在のマークダウン:\n${markdown}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "";
    const cleaned = content
      .replace(/^```(?:markdown|md)?\n/, "")
      .replace(/\n```$/, "")
      .trim();

    return NextResponse.json({ markdown: cleaned });
  } catch (err) {
    console.error("AI edit error:", err);
    return NextResponse.json(
      { error: "AI応答に失敗しました。再送信してください。" },
      { status: 500 }
    );
  }
}

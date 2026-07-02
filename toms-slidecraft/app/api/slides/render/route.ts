export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { Marp } from "@marp-team/marp-core";
import fs from "fs";
import path from "path";

let marpInstance: Marp | null = null;

function getMarp(): Marp {
  if (!marpInstance) {
    const themeCSS = fs.readFileSync(
      path.join(process.cwd(), "styles/marp-theme.css"),
      "utf-8"
    );
    marpInstance = new Marp({ html: true });
    marpInstance.themeSet.add(themeCSS);
  }
  return marpInstance;
}

export async function POST(req: NextRequest) {
  try {
    const { markdown } = await req.json();
    const marp = getMarp();
    const { html, css } = marp.render(markdown ?? "");

    // Count slides by counting <section> tags
    const slideCount = (html.match(/<section/g) ?? []).length;

    return NextResponse.json({ html, css, slideCount });
  } catch (err) {
    console.error("Marp render error:", err);
    return NextResponse.json(
      { error: "レンダリングエラー" },
      { status: 500 }
    );
  }
}

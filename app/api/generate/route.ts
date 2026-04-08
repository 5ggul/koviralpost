import { NextRequest, NextResponse } from 'next/server';
import { generateDrafts, rewriteWithTone, FormatKey } from '@/lib/generate';
import { sql, initDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();
    const { keyword, format, tonePresetId, threadMode } = body;

    if (!keyword || !format) {
      return NextResponse.json({ error: 'keyword와 format은 필수' }, { status: 400 });
    }

    let toneExamples: string[] = [];
    if (tonePresetId) {
      const result = await sql`SELECT examples FROM tone_presets WHERE id = ${tonePresetId}`;
      if (result.rows[0]) {
        toneExamples = JSON.parse(result.rows[0].examples);
      }
    }

    const drafts = await generateDrafts({ keyword, format: format as FormatKey, toneExamples, threadMode });

    const ids: number[] = [];
    for (const draft of drafts) {
      const result = await sql`
        INSERT INTO drafts (keyword, format, content)
        VALUES (${keyword}, ${format}, ${draft})
        RETURNING id
      `;
      ids.push(result.rows[0].id);
    }

    return NextResponse.json({ drafts, ids });
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { content, tone } = await req.json();
    if (!content || !tone) {
      return NextResponse.json({ error: 'content, tone 필수' }, { status: 400 });
    }
    const result = await rewriteWithTone(content, tone);
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

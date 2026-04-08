import { NextRequest, NextResponse } from 'next/server';
import { sql, initDb } from '@/lib/db';

export async function GET() {
  await initDb();
  const result = await sql`SELECT * FROM tone_presets ORDER BY id`;
  return NextResponse.json({ presets: result.rows });
}

export async function PATCH(req: NextRequest) {
  await initDb();
  const { id, examples } = await req.json();
  await sql`UPDATE tone_presets SET examples = ${JSON.stringify(examples)} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { sql, initDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  await initDb();
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format');
  const q = searchParams.get('q');
  const savedOnly = searchParams.get('saved') === '1';

  let rows;

  if (format && q && savedOnly) {
    rows = await sql`SELECT * FROM drafts WHERE format = ${format} AND (keyword ILIKE ${'%' + q + '%'} OR content ILIKE ${'%' + q + '%'}) AND is_saved = 1 ORDER BY created_at DESC LIMIT 100`;
  } else if (format && q) {
    rows = await sql`SELECT * FROM drafts WHERE format = ${format} AND (keyword ILIKE ${'%' + q + '%'} OR content ILIKE ${'%' + q + '%'}) ORDER BY created_at DESC LIMIT 100`;
  } else if (format && savedOnly) {
    rows = await sql`SELECT * FROM drafts WHERE format = ${format} AND is_saved = 1 ORDER BY created_at DESC LIMIT 100`;
  } else if (q && savedOnly) {
    rows = await sql`SELECT * FROM drafts WHERE (keyword ILIKE ${'%' + q + '%'} OR content ILIKE ${'%' + q + '%'}) AND is_saved = 1 ORDER BY created_at DESC LIMIT 100`;
  } else if (format) {
    rows = await sql`SELECT * FROM drafts WHERE format = ${format} ORDER BY created_at DESC LIMIT 100`;
  } else if (q) {
    rows = await sql`SELECT * FROM drafts WHERE keyword ILIKE ${'%' + q + '%'} OR content ILIKE ${'%' + q + '%'} ORDER BY created_at DESC LIMIT 100`;
  } else if (savedOnly) {
    rows = await sql`SELECT * FROM drafts WHERE is_saved = 1 ORDER BY created_at DESC LIMIT 100`;
  } else {
    rows = await sql`SELECT * FROM drafts ORDER BY created_at DESC LIMIT 100`;
  }

  return NextResponse.json({ drafts: rows.rows });
}

export async function PATCH(req: NextRequest) {
  await initDb();
  const { id, is_saved, content } = await req.json();

  if (content !== undefined) {
    await sql`UPDATE drafts SET content = ${content} WHERE id = ${id}`;
  }
  if (is_saved !== undefined) {
    await sql`UPDATE drafts SET is_saved = ${is_saved ? 1 : 0} WHERE id = ${id}`;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await initDb();
  const { id } = await req.json();
  await sql`DELETE FROM drafts WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

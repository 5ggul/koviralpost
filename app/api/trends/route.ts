import { NextResponse } from 'next/server';
import { sql, initDb } from '@/lib/db';

export async function GET() {
  try {
    await initDb();

    // 최근 1시간 이내 캐시된 트렌드 있으면 반환
    const cached = await sql`
      SELECT keyword, buzz_count, fetched_at
      FROM trends
      WHERE fetched_at >= NOW() - INTERVAL '1 hour'
      ORDER BY buzz_count DESC
      LIMIT 20
    `;

    if (cached.rows.length > 0) {
      return NextResponse.json({ trends: cached.rows, cached: true });
    }

    // 새로 수집
    const trends = await fetchKoreanTrends();

    if (trends.length > 0) {
      for (const t of trends) {
        await sql`INSERT INTO trends (keyword, buzz_count) VALUES (${t.keyword}, ${t.buzz_count})`;
      }
    }

    return NextResponse.json({ trends, cached: false });
  } catch (err) {
    console.error('Trend fetch error:', err);
    return NextResponse.json({
      trends: getFallbackTrends(),
      cached: false,
      error: '트렌드 수집 실패 — 샘플 표시 중',
    });
  }
}

async function fetchKoreanTrends(): Promise<{ keyword: string; buzz_count: number }[]> {
  try {
    const res = await fetch('https://www.fmkorea.com/index.php?mid=best', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const keywords = extractKeywordsFromFmkorea(html);
    if (keywords.length >= 5) return keywords;
  } catch {}

  return getFallbackTrends();
}

function extractKeywordsFromFmkorea(html: string): { keyword: string; buzz_count: number }[] {
  const results: { keyword: string; buzz_count: number }[] = [];
  const titleRegex = /class="title[^"]*"[^>]*>([^<]{2,30})</g;
  const seen = new Set<string>();
  let match;
  let rank = 1;

  while ((match = titleRegex.exec(html)) !== null && results.length < 20) {
    const title = match[1].trim();
    if (title.length < 2 || title.length > 20) continue;
    if (seen.has(title)) continue;
    if (/^\d+$/.test(title)) continue;
    seen.add(title);
    results.push({ keyword: title, buzz_count: Math.floor(10000 / rank) * 100 });
    rank++;
  }

  return results;
}

function getFallbackTrends(): { keyword: string; buzz_count: number }[] {
  return [
    { keyword: '직장인 현실', buzz_count: 52400 },
    { keyword: '월요일', buzz_count: 48200 },
    { keyword: '점심 뭐먹지', buzz_count: 41000 },
    { keyword: '퇴근하고 싶다', buzz_count: 38700 },
    { keyword: '20대의 삶', buzz_count: 35100 },
    { keyword: '대학생 공감', buzz_count: 32800 },
    { keyword: '연애 현실', buzz_count: 29400 },
    { keyword: '돈 없음', buzz_count: 27600 },
    { keyword: '밥 먹고 싶다', buzz_count: 25300 },
    { keyword: '잠 오는 오후', buzz_count: 23100 },
    { keyword: '카페 공부', buzz_count: 21000 },
    { keyword: '주말 계획', buzz_count: 19800 },
    { keyword: '야근', buzz_count: 18400 },
    { keyword: '취업 준비', buzz_count: 17200 },
    { keyword: '날씨 미침', buzz_count: 15900 },
  ];
}

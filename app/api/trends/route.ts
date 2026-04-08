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
  // Google Trends Korea RSS (공개 피드, 인증 불필요)
  try {
    const res = await fetch('https://trends.google.com/trends/trendingsearches/daily/rss?geo=KR', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const xml = await res.text();
      const keywords = parseGoogleTrendsRSS(xml);
      if (keywords.length >= 5) return keywords;
    }
  } catch {}

  return getFallbackTrends();
}

function parseGoogleTrendsRSS(xml: string): { keyword: string; buzz_count: number }[] {
  const results: { keyword: string; buzz_count: number }[] = [];

  // <title> 태그에서 트렌드 키워드 추출
  const titleRegex = /<title><!\[CDATA\[([^\]]+)\]\]><\/title>|<title>([^<]+)<\/title>/g;
  // approx_traffic 추출
  const trafficRegex = /<ht:approx_traffic>([^<]+)<\/ht:approx_traffic>/g;

  const titles: string[] = [];
  const traffics: number[] = [];

  let m;
  while ((m = titleRegex.exec(xml)) !== null) {
    const title = (m[1] || m[2] || '').trim();
    if (title && title !== 'Google Trends' && title.length > 1) {
      titles.push(title);
    }
  }
  while ((m = trafficRegex.exec(xml)) !== null) {
    const raw = m[1].replace(/[^0-9]/g, '');
    traffics.push(parseInt(raw) || 0);
  }

  for (let i = 0; i < Math.min(titles.length, 20); i++) {
    results.push({ keyword: titles[i], buzz_count: traffics[i] || (20 - i) * 1000 });
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

import { NextResponse } from 'next/server';
import { sql, initDb } from '@/lib/db';

export async function GET() {
  try {
    await initDb();

    // 1시간 캐시
    const cached = await sql`
      SELECT keyword, buzz_count, fetched_at
      FROM trends
      WHERE fetched_at >= NOW() - INTERVAL '1 hour'
      ORDER BY buzz_count DESC
      LIMIT 25
    `;

    if (cached.rows.length > 0) {
      return NextResponse.json({ trends: cached.rows, cached: true });
    }

    const trends = await fetchCommunityTrends();

    if (trends.length > 0) {
      // 기존 캐시 삭제 후 새로 삽입
      await sql`DELETE FROM trends WHERE fetched_at < NOW() - INTERVAL '1 hour'`;
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
      error: '커뮤니티 수집 실패 — 샘플 표시 중',
    });
  }
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

async function fetchCommunityTrends(): Promise<{ keyword: string; buzz_count: number; source?: string }[]> {
  const scrapers = [
    { fn: scrapeRuliweb,    name: '루리웹' },
    { fn: scrapeClien,      name: '클리앙' },
    { fn: scrapePpomppu,    name: '뽐뿌' },
    { fn: scrapeTodayhumor, name: '오늘의유머' },
    { fn: scrapeFmkorea,    name: '에펨코리아' },
    { fn: scrapeNatepann,   name: '네이트판' },
  ];

  const results = await Promise.allSettled(
    scrapers.map(({ fn }) => fn())
  );

  const all: { keyword: string; buzz_count: number; source: string }[] = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      result.value.forEach((item, rank) => {
        all.push({
          keyword: item.keyword,
          buzz_count: Math.floor((scrapers.length - i) * 10000 / (rank + 1)),
          source: scrapers[i].name,
        });
      });
    }
  });

  if (all.length < 5) return getFallbackTrends();

  // 중복 제거 + 섞어서 25개
  const seen = new Set<string>();
  const deduped = all.filter(item => {
    const key = item.keyword.slice(0, 15);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.slice(0, 25);
}

// ── 루리웹 베스트 ─────────────────────────────────────────
async function scrapeRuliweb(): Promise<{ keyword: string }[]> {
  const res = await fetch('https://bbs.ruliweb.com/best/board/300143', {
    headers: HEADERS, signal: AbortSignal.timeout(7000),
  });
  const html = await res.text();
  return extractTitles(html, [
    /class="subject_link[^"]*"[^>]*>\s*([^<]{5,60})\s*</g,
    /class="title[^"]*"[^>]*>\s*([^<\n]{5,60})\s*/g,
  ]);
}

// ── 클리앙 베스트 ─────────────────────────────────────────
async function scrapeClien(): Promise<{ keyword: string }[]> {
  const res = await fetch('https://www.clien.net/service/board/recommend', {
    headers: HEADERS, signal: AbortSignal.timeout(7000),
  });
  const html = await res.text();
  return extractTitles(html, [
    /class="subject_fixed[^"]*"[^>]*>\s*([^<]{5,60})\s*</g,
    /span class="[^"]*title[^"]*"[^>]*>([^<]{5,60})</g,
  ]);
}

// ── 뽐뿌 자유게시판 ───────────────────────────────────────
async function scrapePpomppu(): Promise<{ keyword: string }[]> {
  const res = await fetch('https://www.ppomppu.co.kr/zboard/zboard.php?id=freeboard', {
    headers: HEADERS, signal: AbortSignal.timeout(7000),
  });
  const html = await res.text();
  return extractTitles(html, [
    /class="list_title"[^>]*>([^<]{5,60})</g,
    /class="title[^"]*"[^>]*>([^<]{5,60})</g,
  ]);
}

// ── 오늘의유머 베스트 ─────────────────────────────────────
async function scrapeTodayhumor(): Promise<{ keyword: string }[]> {
  const res = await fetch('https://www.todayhumor.co.kr/board/list.php?table=bestofbest', {
    headers: HEADERS, signal: AbortSignal.timeout(7000),
  });
  const html = await res.text();
  return extractTitles(html, [
    /class="subject[^"]*"[^>]*>\s*<a[^>]*>([^<]{5,60})</g,
    /<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]{5,60})</g,
  ]);
}

// ── 에펨코리아 핫게시물 ───────────────────────────────────
async function scrapeFmkorea(): Promise<{ keyword: string }[]> {
  const res = await fetch('https://www.fmkorea.com/best', {
    headers: { ...HEADERS, 'Cookie': 'fm_visited=1' },
    signal: AbortSignal.timeout(7000),
  });
  const html = await res.text();
  return extractTitles(html, [
    /class="title[^"]*"[^>]*>\s*<a[^>]*>([^<]{5,60})</g,
    /<h3[^>]*class="[^"]*title[^"]*"[^>]*>([^<]{5,60})</g,
  ]);
}

// ── 네이트판 랭킹 ─────────────────────────────────────────
async function scrapeNatepann(): Promise<{ keyword: string }[]> {
  const res = await fetch('https://pann.nate.com/talk/ranking?rankingType=rankingtotal&orderby=d', {
    headers: HEADERS, signal: AbortSignal.timeout(7000),
  });
  const html = await res.text();
  return extractTitles(html, [
    /class="title[^"]*"[^>]*>([^<]{5,60})</g,
    /<strong[^>]*>([^<]{5,60})<\/strong>/g,
  ]);
}

// ── 공통 타이틀 추출기 ────────────────────────────────────
function extractTitles(html: string, patterns: RegExp[]): { keyword: string }[] {
  const results: { keyword: string }[] = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(html)) !== null && results.length < 10) {
      const raw = m[1]
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ').trim();

      if (raw.length < 5 || raw.length > 60) continue;
      if (/^[\d\s\.\-\_]+$/.test(raw)) continue; // 숫자만인 경우 제외
      if (seen.has(raw)) continue;
      seen.add(raw);
      results.push({ keyword: raw });
    }
    if (results.length >= 8) break;
  }

  return results;
}

function getFallbackTrends(): { keyword: string; buzz_count: number }[] {
  return [
    { keyword: '직장인들이 절대 말 안 해주는 회사 현실', buzz_count: 52400 },
    { keyword: '요즘 20대가 연애 안 하는 진짜 이유', buzz_count: 48200 },
    { keyword: '한국에서 월급쟁이로 집 사는 게 가능한가', buzz_count: 41000 },
    { keyword: '점심시간에 혼자 밥 먹는 사람들', buzz_count: 38700 },
    { keyword: '카페 공부족 진짜 공부하는 거 맞냐', buzz_count: 35100 },
    { keyword: '요즘 MZ가 야근을 거부하는 이유', buzz_count: 32800 },
    { keyword: '치킨 한 마리 3만원 시대', buzz_count: 29400 },
    { keyword: '대학교 다니는 의미가 없어진 시대', buzz_count: 27600 },
    { keyword: '재테크 하다가 오히려 망한 사람들', buzz_count: 25300 },
    { keyword: '요즘 사람들이 뉴스 안 보는 이유', buzz_count: 23100 },
    { keyword: '주 4일제 진짜 되면 어떻게 됨', buzz_count: 21000 },
    { keyword: '한국 교육 망했다는 증거들', buzz_count: 19800 },
    { keyword: '혼자 사는 사람들이 늘어나는 진짜 이유', buzz_count: 18400 },
    { keyword: '요즘 취업 안 되는 이유가 뭔지', buzz_count: 17200 },
    { keyword: '월 200 버는데 저축이 안 되는 이유', buzz_count: 15900 },
  ];
}

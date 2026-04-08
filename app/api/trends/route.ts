import { NextResponse } from 'next/server';
import { sql, initDb } from '@/lib/db';

export async function GET() {
  try {
    await initDb();

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

    const trends = await fetchRssTopics();

    if (trends.length >= 5) {
      await sql`DELETE FROM trends WHERE fetched_at < NOW() - INTERVAL '2 hours'`;
      for (const t of trends) {
        await sql`INSERT INTO trends (keyword, buzz_count) VALUES (${t.keyword}, ${t.buzz_count})`;
      }
    }

    return NextResponse.json({ trends, cached: false });
  } catch (err) {
    console.error('Trend fetch error:', err);
    return NextResponse.json({ trends: getFallbackTrends(), cached: false });
  }
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; RSS reader)',
  'Accept': 'application/rss+xml, application/xml, text/xml, */*',
};

// ─────────────────────────────────────────────────────────
// RSS 소스 목록 (Vercel에서 접근 가능한 것들만)
// ─────────────────────────────────────────────────────────
const RSS_SOURCES = [
  // 구글 뉴스 한국 - 실시간 급상승 이슈, 가장 신뢰도 높음
  { url: 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko', weight: 5 },
  // 구글 뉴스 - 사회 카테고리
  { url: 'https://news.google.com/rss/topics/CAAqJQgKIh9DQkFTRVFvSUwyMHZNRFp4WkRZU0JXdHZMaTFJUUFBUAE?hl=ko&gl=KR&ceid=KR:ko', weight: 4 },
  // 네이버 뉴스 RSS - 사회
  { url: 'https://rss.naver.com/main/rss.naver?code=102', weight: 3 },
  // 네이버 뉴스 RSS - 경제
  { url: 'https://rss.naver.com/main/rss.naver?code=101', weight: 3 },
  // 네이버 뉴스 RSS - 연예
  { url: 'https://rss.naver.com/main/rss.naver?code=106', weight: 2 },
  // 클리앙 전체
  { url: 'https://www.clien.net/service/rss', weight: 4 },
];

async function fetchRssTopics(): Promise<{ keyword: string; buzz_count: number }[]> {
  const results = await Promise.allSettled(
    RSS_SOURCES.map(async ({ url, weight }) => {
      const res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return [];
      const xml = await res.text();
      return parseRssTitles(xml, weight);
    })
  );

  const all: { keyword: string; buzz_count: number }[] = [];
  results.forEach(r => {
    if (r.status === 'fulfilled') all.push(...r.value);
  });

  if (all.length < 5) return getFallbackTrends();

  // 중복 제거
  const seen = new Set<string>();
  const deduped = all.filter(item => {
    if (seen.has(item.keyword)) return false;
    seen.add(item.keyword);
    return true;
  });

  // 가중치 기반 정렬
  deduped.sort((a, b) => b.buzz_count - a.buzz_count);

  return deduped.slice(0, 25);
}

function parseRssTitles(xml: string, weight: number): { keyword: string; buzz_count: number }[] {
  const results: { keyword: string; buzz_count: number }[] = [];

  // CDATA 또는 일반 title 태그에서 제목 추출
  const titleRegex = /<title(?:[^>]*)?>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/gi;

  let rank = 1;
  let m;
  while ((m = titleRegex.exec(xml)) !== null && results.length < 15) {
    const raw = m[1]
      .replace(/<[^>]+>/g, '')           // HTML 태그 제거
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 필터링
    if (raw.length < 8) continue;               // 너무 짧음
    if (raw.length > 60) continue;              // 너무 긺
    if (/^Google News$/i.test(raw)) continue;   // 피드 제목 제외
    if (/RSS|피드|구독/i.test(raw)) continue;
    if (!/[가-힣]/.test(raw)) continue;         // 한글 없으면 제외

    // 언론사 표기 제거 (예: "조선일보", "연합뉴스" 같은 suffix)
    const cleaned = raw
      .replace(/\s*[-|]\s*(조선|중앙|동아|한겨레|경향|연합뉴스|YTN|MBC|KBS|SBS|JTBC|채널A|TV조선)[^$]*/g, '')
      .trim();

    if (cleaned.length < 8) continue;

    results.push({
      keyword: cleaned,
      buzz_count: Math.floor(weight * 10000 / rank),
    });
    rank++;
  }

  return results;
}

function getFallbackTrends(): { keyword: string; buzz_count: number }[] {
  return [
    { keyword: '직장인들이 절대 말 안 해주는 회사 현실', buzz_count: 52400 },
    { keyword: '요즘 20대가 연애 안 하는 진짜 이유', buzz_count: 48200 },
    { keyword: '월급쟁이로 집 사는 게 가능한가', buzz_count: 41000 },
    { keyword: '점심시간에 혼자 밥 먹는 사람들', buzz_count: 38700 },
    { keyword: '카페 공부족 진짜 공부하는 거 맞냐', buzz_count: 35100 },
    { keyword: '요즘 MZ가 야근을 거부하는 이유', buzz_count: 32800 },
    { keyword: '치킨 한 마리 3만원 시대', buzz_count: 29400 },
    { keyword: '대학교 다니는 의미가 없어진 시대', buzz_count: 27600 },
    { keyword: '재테크 하다가 오히려 망한 사람들', buzz_count: 25300 },
    { keyword: '주 4일제 진짜 되면 어떻게 됨', buzz_count: 23100 },
    { keyword: '한국 교육 망했다는 증거들', buzz_count: 21000 },
    { keyword: '혼자 사는 사람들이 늘어나는 이유', buzz_count: 19800 },
    { keyword: '요즘 취업 안 되는 이유가 뭔지', buzz_count: 18400 },
    { keyword: '월 200 버는데 저축이 안 되는 이유', buzz_count: 17200 },
    { keyword: '퇴근 후 아무것도 하기 싫은 현대인', buzz_count: 15900 },
  ];
}

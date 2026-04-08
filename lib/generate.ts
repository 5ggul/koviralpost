import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const FORMATS = {
  공감형: {
    label: '공감형',
    color: '#1D9BF0',
    desc: '"나만 그럼?" — 보편적 상황 공감 유발',
    hook: '공감 + 댓글 폭발',
  },
  정보형: {
    label: '정보형',
    color: '#17BF60',
    desc: '"N가지 알려줌" — 스레드 + 북마크 유도',
    hook: '저장율 최고',
  },
  논쟁형: {
    label: '논쟁형',
    color: '#E0245E',
    desc: 'A vs B 구도 — 의견 묻기',
    hook: '댓글 참여 폭발',
  },
  반전형: {
    label: '반전형',
    color: '#F4900C',
    desc: '예상 뒤집는 결말 — 리트윗 유발',
    hook: 'RT 폭발',
  },
  감성형: {
    label: '감성형',
    color: '#794BC4',
    desc: '짧고 찌르는 한 문장',
    hook: '북마크율 최고',
  },
  병맛형: {
    label: '병맛형',
    color: '#FF7A00',
    desc: '현재 유행 밈 템플릿 활용',
    hook: '바이럴 속도 최고',
  },
} as const;

export type FormatKey = keyof typeof FORMATS;

interface GenerateOptions {
  keyword: string;
  format: FormatKey;
  toneExamples?: string[];
  threadMode?: boolean;
}

export async function generateDrafts(options: GenerateOptions): Promise<string[]> {
  const { keyword, format, toneExamples = [], threadMode = false } = options;

  const formatGuides: Record<FormatKey, string> = {
    공감형: `"[상황 묘사] 나만 그럼?" 또는 "[상황] 하는 사람 손" 형태. 최대한 많은 사람이 공감할 수 있는 보편적 상황. 자기고백 느낌으로.`,
    정보형: `"[숫자]가지 [주제] 알려줌" 또는 "~하는 법 알려줌" 형태로 시작. 스레드로 이어질 것처럼 훅 만들기. 북마크 유도.`,
    논쟁형: `A vs B 구도 또는 "이거 어떻게 생각함?" 형태. 의견이 갈릴 만한 주제. 댓글로 본인 의견 남기고 싶게 만들기.`,
    반전형: `기대를 뒤집는 결말이나 반전 사실. "~인 줄 알았는데..." 또는 "실화냐" 계열. 리트윗 하고 싶게 만들기.`,
    감성형: `짧고 마음을 찌르는 문장 1~3개. 저장하고 싶은 느낌. 새벽 감성, 위로, 공허함, 청춘 등의 주제.`,
    병맛형: `현재 트위터에서 유행하는 밈 템플릿 또는 병맛 문체. "기억났다 갑자기" / "실화냐" / "아 맞다" 계열. 빠른 공유 유도.`,
  };

  const toneSection = toneExamples.length > 0
    ? `\n\n[내 말투 예시 — 이 느낌으로 써줘]\n${toneExamples.map(e => `- ${e}`).join('\n')}`
    : '';

  const threadInstruction = threadMode
    ? `\n\n스레드 모드: 각 버전을 3개 트윗(1/3, 2/3, 3/3)으로 구성해. 구분선 "---" 사용.`
    : '';

  const formatLengthGuide: Record<FormatKey, string> = {
    공감형: `2~4줄. 첫 줄에 공감 훅, 이어서 구체적인 상황 묘사. 마지막에 "나만 그럼?" 또는 "ㅇㅈ?" 같은 참여 유도 문구.`,
    정보형: `3~6줄. 첫 줄에 강한 훅("알면 인생 달라짐" 류), 2~4번째 줄에 핵심 정보 2~3가지, 마지막에 "저장해" 또는 "스레드 이어서" 유도.`,
    논쟁형: `2~3줄. 첫 줄에 대립 구도 제시, 두 번째 줄에 구체적 옵션들, 마지막에 "어떻게 생각함?" 또는 "댓글 ㄱ" 유도.`,
    반전형: `3~5줄. 첫 1~2줄은 예상 가능한 방향으로 전개, 중간에 반전 포인트, 마지막에 임팩트 있는 한 마디.`,
    감성형: `2~4줄. 각 줄이 독립적으로 찌를 것. 줄바꿈으로 호흡 조절. 마지막 줄이 가장 임팩트 있게. 저장하고 싶은 느낌.`,
    병맛형: `1~3줄. 짧고 강하게. 밈 템플릿 활용. 예상 못 한 마무리로 웃음 유발.`,
  };

  const systemPrompt = `너는 한국 트위터(X)에서 팔로워 10만 이상을 보유한 트위터리안이야.
실제로 바이럴 터진 트윗들을 수백 개 분석했고, 어떤 구조가 반응을 만드는지 정확히 알아.
한국 트위터 문화(트페, 짤, 밈, 줄임말, 개드립)를 완벽하게 이해하고 있어.

핵심 원칙:
- 진짜 사람이 쓴 것처럼 자연스러워야 해. 인위적이거나 억지스러운 느낌 금지
- 해시태그 절대 금지
- 홍보/광고 느낌 금지
- 이모지는 필요할 때만 1~2개 (남용 금지)
- 영어 혼용 최소화
- 줄바꿈을 적극 활용해서 읽기 쉽게
- 각 포맷의 구조를 정확히 따라야 해${toneSection}`;

  const userPrompt = `키워드: "${keyword}"
포맷: ${format}

포맷 공식: ${formatGuides[format]}
길이/구조 가이드: ${formatLengthGuide[format]}
${threadInstruction}

위 키워드로 ${format} 포맷의 바이럴 트윗 대본 5가지 버전을 써줘.
각 버전은 서로 다른 각도와 접근법으로. 비슷한 버전 반복 금지.

출력 형식 (정확히 지켜):
[1]
(대본 내용 — 줄바꿈 포함해서 구조적으로)
[포인트: 왜 반응이 올지 한 줄 설명]

[2]
(대본 내용)
[포인트: 왜 반응이 올지 한 줄 설명]

[3]
(대본 내용)
[포인트: 왜 반응이 올지 한 줄 설명]

[4]
(대본 내용)
[포인트: 왜 반응이 올지 한 줄 설명]

[5]
(대본 내용)
[포인트: 왜 반응이 올지 한 줄 설명]`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseDrafts(text);
}

function parseDrafts(text: string): string[] {
  const results: string[] = [];
  const blocks = text.split(/\[(\d)\]/).filter(Boolean);

  for (let i = 0; i < blocks.length - 1; i += 2) {
    const num = parseInt(blocks[i]);
    if (num >= 1 && num <= 5) {
      const content = blocks[i + 1].trim();
      results.push(content);
    }
  }

  // fallback: 줄 기반 파싱
  if (results.length === 0) {
    const lines = text.split('\n').filter(l => l.trim());
    return [text.trim()];
  }

  return results.slice(0, 5);
}

export async function rewriteWithTone(content: string, tone: string): Promise<string> {
  const toneGuides: Record<string, string> = {
    shorter: '훨씬 짧게 (50자 이내로) 핵심만. 불필요한 말 다 빼.',
    funnier: '더 병맛스럽고 웃기게. 한국 트위터 밈 감성으로.',
    serious: '더 진지하고 묵직하게. 감성적이고 생각하게 만드는 톤으로.',
    hookier: '첫 문장을 더 자극적으로. 스크롤 멈추게 만드는 훅으로 시작하게.',
  };

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `아래 트윗을 다시 써줘. 조건: ${toneGuides[tone]}\n해시태그 금지. 대본만 출력.\n\n원본:\n${content}`,
    }],
    system: '너는 한국 트위터 바이럴 트윗 전문가야. 대본 텍스트만 출력하고 부연설명 없이.',
  });

  const result = response.content[0].type === 'text' ? response.content[0].text.trim() : content;
  // [포인트: ...] 부분 제거
  return result.replace(/\[포인트:[^\]]*\]/g, '').trim();
}

'use client';

import { useState } from 'react';
import { FormatKey } from '@/app/page';

const FORMAT_COLORS: Record<string, string> = {
  공감형: '#1D9BF0', 정보형: '#17BF60', 논쟁형: '#E0245E',
  반전형: '#F4900C', 감성형: '#794BC4', 병맛형: '#FF7A00',
};

const TONE_BUTTONS = [
  { key: 'shorter', label: '✂️ 더 짧게' },
  { key: 'funnier', label: '🤡 병맛으로' },
  { key: 'serious', label: '💜 감성으로' },
  { key: 'hookier', label: '⚡ 훅 강화' },
];

interface DraftItem {
  content: string;
  id?: number;
}

interface Props {
  drafts: DraftItem[];
  loading: boolean;
  keyword: string;
  format: FormatKey;
  onDraftsChange: (drafts: DraftItem[]) => void;
  onHistoryRefresh: () => void;
}

function DraftCard({ draft, index, format, onUpdate, onSave, onDelete }: {
  draft: DraftItem;
  index: number;
  format: string;
  onUpdate: (content: string) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [rewriting, setRewriting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // 본문과 포인트 분리
  const lines = draft.content.split('\n');
  const pointLine = lines.find(l => l.startsWith('[포인트:'));
  const body = lines.filter(l => !l.startsWith('[포인트:')).join('\n').trim();
  const point = pointLine?.replace('[포인트:', '').replace(']', '').trim();

  const charCount = body.length;
  const charClass = charCount > 280 ? 'over' : charCount > 200 ? 'warn' : '';
  const color = FORMAT_COLORS[format] || '#1D9BF0';

  async function handleTone(tone: string) {
    setRewriting(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: body, tone }),
      });
      const data = await res.json();
      if (data.result) onUpdate(data.result);
    } finally {
      setRewriting(false);
    }
  }

  async function handleSaveEdit() {
    onUpdate(editContent);
    if (draft.id) {
      await fetch('/api/drafts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draft.id, content: editContent }),
      });
    }
    setEditing(false);
  }

  async function handleStar() {
    if (draft.id) {
      await fetch('/api/drafts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draft.id, is_saved: 1 }),
      });
      setSaved(true);
      onSave();
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card" style={{ marginBottom: 12, position: 'relative' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#536471', fontSize: 12, fontWeight: 700 }}>#{index + 1}</span>
          <span className="tag" style={{ background: `${color}22`, color }}>{format}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => { setEditing(!editing); setEditContent(body); }}
            style={{ background: 'none', border: 'none', color: '#536471', cursor: 'pointer', fontSize: 14 }}
            title="편집"
          >✏️</button>
          <button
            onClick={handleStar}
            style={{ background: 'none', border: 'none', color: saved ? '#F4900C' : '#536471', cursor: 'pointer', fontSize: 14 }}
            title="저장"
          >{saved ? '⭐' : '☆'}</button>
          <button
            onClick={handleCopy}
            className="btn-blue"
            style={{ padding: '4px 12px', fontSize: 12 }}
          >{copied ? '✓ 복사됨' : '복사'}</button>
        </div>
      </div>

      {/* 본문 */}
      {editing ? (
        <div>
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={5}
            style={{ background: '#0D0D0D', padding: '10px', borderRadius: 8, border: '1px solid #1D9BF0', fontSize: 15 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span className={`char-count ${editContent.length > 280 ? 'over' : editContent.length > 200 ? 'warn' : ''}`}>
              {editContent.length}/280
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setEditing(false)} className="btn-ghost" style={{ fontSize: 12, padding: '4px 12px' }}>취소</button>
              <button onClick={handleSaveEdit} className="btn-blue" style={{ fontSize: 12, padding: '4px 12px' }}>저장</button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0, color: '#E7E9EA' }}>{body}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span className={`char-count ${charClass}`}>{charCount}/280</span>
          </div>
          {point && (
            <div style={{ marginTop: 8, padding: '6px 10px', background: `${color}11`, borderRadius: 8, borderLeft: `2px solid ${color}` }}>
              <span style={{ fontSize: 12, color: color }}>💡 {point}</span>
            </div>
          )}
        </div>
      )}

      {/* 톤 변환 버튼 */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        {TONE_BUTTONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTone(key)}
            disabled={rewriting}
            className="btn-ghost"
            style={{ fontSize: 12, padding: '4px 10px', opacity: rewriting ? 0.5 : 1 }}
          >
            {rewriting ? <span className="spinner" style={{ width: 12, height: 12 }} /> : label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function EditorPanel({ drafts, loading, keyword, format, onDraftsChange, onHistoryRefresh }: Props) {
  function updateDraft(index: number, content: string) {
    const next = [...drafts];
    next[index] = { ...next[index], content };
    onDraftsChange(next);
  }

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ color: '#536471', fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="spinner" />
          Claude가 "{keyword}" 대본 작성 중...
        </div>
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 120, marginBottom: 12 }} />
        ))}
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#536471' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#71767B' }}>대본을 생성해보세요</div>
        <div style={{ fontSize: 13 }}>왼쪽에서 트렌드를 선택하고<br />포맷을 고른 후 생성 버튼을 누르세요</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', overflowY: 'auto', height: 'calc(100vh - 53px)' }}>
      <div style={{ marginBottom: 12, fontSize: 13, color: '#536471' }}>
        <span style={{ color: '#E7E9EA', fontWeight: 700 }}>"{keyword}"</span> — {format} {drafts.length}개 생성됨
      </div>
      {drafts.map((draft, i) => (
        <DraftCard
          key={i}
          draft={draft}
          index={i}
          format={format}
          onUpdate={content => updateDraft(i, content)}
          onSave={onHistoryRefresh}
          onDelete={() => {
            const next = drafts.filter((_, j) => j !== i);
            onDraftsChange(next);
          }}
        />
      ))}
    </div>
  );
}

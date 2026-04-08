'use client';

import { useState, useEffect } from 'react';
import { Draft } from '@/app/page';

const FORMAT_COLORS: Record<string, string> = {
  공감형: '#1D9BF0', 정보형: '#17BF60', 논쟁형: '#E0245E',
  반전형: '#F4900C', 감성형: '#794BC4', 병맛형: '#FF7A00',
};

const ALL_FORMATS = ['전체', '공감형', '정보형', '논쟁형', '반전형', '감성형', '병맛형'];

interface Props {
  refresh: number;
  onLoad: (draft: Draft) => void;
  compact?: boolean;
  savedOnly?: boolean;
}

export default function HistoryPanel({ refresh, onLoad, compact = false, savedOnly = false }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [filterFormat, setFilterFormat] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, [refresh, filterFormat, searchQuery, savedOnly]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterFormat !== '전체') params.set('format', filterFormat);
    if (searchQuery) params.set('q', searchQuery);
    if (savedOnly) params.set('saved', '1');

    try {
      const res = await fetch(`/api/drafts?${params}`);
      const data = await res.json();
      setDrafts(data.drafts || []);
    } finally {
      setLoading(false);
    }
  }

  async function toggleSave(draft: Draft) {
    await fetch('/api/drafts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: draft.id, is_saved: draft.is_saved ? 0 : 1 }),
    });
    load();
  }

  async function deleteDraft(id: number) {
    await fetch('/api/drafts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  }

  function getBodyText(content: string) {
    return content.split('\n').filter(l => !l.startsWith('[포인트:')).join('\n').trim();
  }

  function formatDate(dt: string) {
    const d = new Date(dt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    const diffM = Math.floor(diffMs / 60000);

    if (diffM < 1) return '방금';
    if (diffM < 60) return `${diffM}분 전`;
    if (diffH < 24) return `${diffH}시간 전`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  return (
    <div style={{ height: compact ? 'calc(100vh - 53px)' : 'calc(100vh - 53px)', overflowY: 'auto' }}>
      {/* 필터 (compact 모드에서는 간소화) */}
      {!compact && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2F3336', position: 'sticky', top: 0, background: '#000', zIndex: 10 }}>
          <input
            type="text"
            placeholder="키워드 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', marginBottom: 8, borderRadius: 8 }}
          />
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
            {ALL_FORMATS.map(f => (
              <button
                key={f}
                onClick={() => setFilterFormat(f)}
                style={{
                  whiteSpace: 'nowrap', padding: '4px 10px', borderRadius: 9999,
                  border: `1px solid ${filterFormat === f ? (FORMAT_COLORS[f] || '#1D9BF0') : '#2F3336'}`,
                  background: filterFormat === f ? `${FORMAT_COLORS[f] || '#1D9BF0'}22` : 'transparent',
                  color: filterFormat === f ? (FORMAT_COLORS[f] || '#1D9BF0') : '#536471',
                  fontSize: 12, cursor: 'pointer', fontWeight: filterFormat === f ? 700 : 400,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 70 }} />)}
        </div>
      )}

      {!loading && drafts.length === 0 && (
        <div style={{ padding: 30, textAlign: 'center', color: '#536471', fontSize: 13 }}>
          {savedOnly ? '저장된 대본이 없어요' : '생성된 대본이 없어요'}
        </div>
      )}

      <div style={{ padding: '8px' }}>
        {drafts.map(draft => {
          const body = getBodyText(draft.content);
          const color = FORMAT_COLORS[draft.format] || '#536471';
          return (
            <div
              key={draft.id}
              style={{
                padding: '12px', borderRadius: 10, marginBottom: 6,
                border: '1px solid #2F3336', background: '#16181C',
                cursor: 'pointer', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#536471')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#2F3336')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="tag" style={{ background: `${color}22`, color, fontSize: 10 }}>{draft.format}</span>
                  <span style={{ fontSize: 11, color: '#536471' }}>{draft.keyword}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: '#536471' }}>{formatDate(draft.created_at)}</span>
                  <button
                    onClick={e => { e.stopPropagation(); toggleSave(draft); }}
                    style={{ background: 'none', border: 'none', color: draft.is_saved ? '#F4900C' : '#536471', cursor: 'pointer', fontSize: 13, padding: '0 2px' }}
                  >{draft.is_saved ? '⭐' : '☆'}</button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteDraft(draft.id); }}
                    style={{ background: 'none', border: 'none', color: '#536471', cursor: 'pointer', fontSize: 13, padding: '0 2px' }}
                  >🗑</button>
                </div>
              </div>
              <p
                onClick={() => onLoad(draft)}
                style={{
                  margin: 0, fontSize: compact ? 12 : 13, lineHeight: 1.5, color: '#E7E9EA',
                  whiteSpace: 'pre-wrap',
                  display: '-webkit-box', WebkitLineClamp: compact ? 2 : 3,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}
              >
                {body}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { FormatKey } from '@/app/page';

const FORMATS: { key: FormatKey; color: string; emoji: string }[] = [
  { key: '공감형', color: '#1D9BF0', emoji: '🤝' },
  { key: '정보형', color: '#17BF60', emoji: '📌' },
  { key: '논쟁형', color: '#E0245E', emoji: '⚡' },
  { key: '반전형', color: '#F4900C', emoji: '🔄' },
  { key: '감성형', color: '#794BC4', emoji: '💜' },
  { key: '병맛형', color: '#FF7A00', emoji: '🤡' },
];

interface Trend {
  keyword: string;
  buzz_count: number;
  fetched_at?: string;
}

interface Preset {
  id: number;
  name: string;
}

interface Props {
  selectedKeyword: string;
  onSelect: (k: string) => void;
  selectedFormat: FormatKey;
  onFormatChange: (f: FormatKey) => void;
  selectedPresetId: number;
  onPresetChange: (id: number) => void;
  threadMode: boolean;
  onThreadModeChange: (v: boolean) => void;
  onGenerate: () => void;
  loading: boolean;
  onOpenSettings: () => void;
}

export default function TrendPanel({
  selectedKeyword, onSelect, selectedFormat, onFormatChange,
  selectedPresetId, onPresetChange, threadMode, onThreadModeChange,
  onGenerate, loading, onOpenSettings,
}: Props) {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState('');
  const [customKeyword, setCustomKeyword] = useState('');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [lastFetched, setLastFetched] = useState('');

  useEffect(() => {
    loadTrends();
    loadPresets();
  }, []);

  async function loadTrends() {
    setTrendLoading(true);
    try {
      const res = await fetch('/api/trends');
      const data = await res.json();
      setTrends(data.trends || []);
      if (data.error) setTrendError(data.error);
      setLastFetched(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setTrendError('네트워크 오류');
    } finally {
      setTrendLoading(false);
    }
  }

  async function loadPresets() {
    const res = await fetch('/api/presets');
    const data = await res.json();
    setPresets(data.presets || []);
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (customKeyword.trim()) {
      onSelect(customKeyword.trim());
      setCustomKeyword('');
    }
  }

  function formatBuzz(n: number) {
    if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}천`;
    return String(n);
  }

  return (
    <div style={{ padding: '0 0 80px' }}>
      {/* 헤더 */}
      <div style={{ padding: '16px', borderBottom: '1px solid #2F3336', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#1D9BF0' }}>𝕏</span>
          <span style={{ fontWeight: 800, fontSize: 15 }}>KoViralPost</span>
        </div>
        <button onClick={onOpenSettings} style={{ background: 'none', border: 'none', color: '#536471', cursor: 'pointer', fontSize: 18 }} title="설정">
          ⚙️
        </button>
      </div>

      {/* 포맷 선택 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #2F3336' }}>
        <div style={{ fontSize: 12, color: '#536471', marginBottom: 8, fontWeight: 700, letterSpacing: '0.05em' }}>포맷</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {FORMATS.map(({ key, color, emoji }) => (
            <button
              key={key}
              onClick={() => onFormatChange(key)}
              style={{
                padding: '7px 10px',
                borderRadius: 8,
                border: `1px solid ${selectedFormat === key ? color : '#2F3336'}`,
                background: selectedFormat === key ? `${color}22` : 'transparent',
                color: selectedFormat === key ? color : '#71767B',
                fontSize: 12,
                fontWeight: selectedFormat === key ? 700 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              {emoji} {key}
            </button>
          ))}
        </div>
      </div>

      {/* 톤 프리셋 */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #2F3336' }}>
        <div style={{ fontSize: 12, color: '#536471', marginBottom: 6, fontWeight: 700, letterSpacing: '0.05em' }}>말투</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => onPresetChange(p.id)}
              className={`btn-ghost${selectedPresetId === p.id ? ' active' : ''}`}
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* 스레드 모드 */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #2F3336', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: '#71767B' }}>스레드 모드</span>
        <button
          onClick={() => onThreadModeChange(!threadMode)}
          style={{
            width: 40, height: 22, borderRadius: 11,
            background: threadMode ? '#1D9BF0' : '#2F3336',
            border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
          }}
        >
          <div style={{
            width: 16, height: 16, borderRadius: '50%', background: 'white',
            position: 'absolute', top: 3,
            left: threadMode ? 21 : 3,
            transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* 키워드 직접 입력 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #2F3336' }}>
        <div style={{ fontSize: 12, color: '#536471', marginBottom: 6, fontWeight: 700, letterSpacing: '0.05em' }}>직접 입력</div>
        <form onSubmit={handleCustomSubmit} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={customKeyword}
            onChange={e => setCustomKeyword(e.target.value)}
            placeholder="키워드 직접 입력..."
            style={{ flex: 1, borderRadius: 8, fontSize: 13, padding: '7px 12px' }}
          />
          <button type="submit" className="btn-blue" style={{ padding: '7px 14px', fontSize: 13 }}>
            선택
          </button>
        </form>
      </div>

      {/* 선택된 키워드 표시 */}
      {selectedKeyword && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #2F3336' }}>
          <div style={{ fontSize: 12, color: '#536471', marginBottom: 4 }}>선택된 키워드</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background: '#1D9BF020', border: '1px solid #1D9BF0', borderRadius: 9999,
              padding: '4px 12px', color: '#1D9BF0', fontWeight: 700, fontSize: 14,
            }}>
              {selectedKeyword}
            </span>
            <button onClick={() => onSelect('')} style={{ background: 'none', border: 'none', color: '#536471', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        </div>
      )}

      {/* 생성 버튼 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #2F3336' }}>
        <button
          onClick={onGenerate}
          disabled={loading || !selectedKeyword.trim()}
          className="btn-blue"
          style={{ width: '100%', padding: '12px', fontSize: 15 }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span className="spinner" style={{ width: 16, height: 16 }} /> 생성 중...
            </span>
          ) : '✨ 대본 생성하기'}
        </button>
      </div>

      {/* 트렌드 목록 */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: '#536471', fontWeight: 700, letterSpacing: '0.05em' }}>
            실시간 트렌드 {lastFetched && <span style={{ fontWeight: 400 }}>({lastFetched} 기준)</span>}
          </div>
          <button onClick={loadTrends} style={{ background: 'none', border: 'none', color: '#536471', cursor: 'pointer', fontSize: 11 }}>
            🔄 새로고침
          </button>
        </div>

        {trendError && (
          <div style={{ fontSize: 11, color: '#F4900C', marginBottom: 8, padding: '6px 10px', background: '#F4900C11', borderRadius: 8 }}>
            {trendError}
          </div>
        )}

        {trendLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array(10).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 36 }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {trends.map((t, i) => (
              <button
                key={i}
                onClick={() => onSelect(t.keyword)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 8, border: 'none',
                  background: selectedKeyword === t.keyword ? '#1D9BF015' : 'transparent',
                  borderLeft: selectedKeyword === t.keyword ? '2px solid #1D9BF0' : '2px solid transparent',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#536471', minWidth: 16 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: selectedKeyword === t.keyword ? '#1D9BF0' : '#E7E9EA', fontWeight: selectedKeyword === t.keyword ? 700 : 400 }}>
                    {t.keyword}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#536471' }}>{formatBuzz(t.buzz_count)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

interface Preset {
  id: number;
  name: string;
  examples: string;
}

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedId, setSelectedId] = useState(1);
  const [newExample, setNewExample] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/presets').then(r => r.json()).then(d => setPresets(d.presets || []));
  }, []);

  const current = presets.find(p => p.id === selectedId);
  const examples: string[] = current ? JSON.parse(current.examples) : [];

  async function addExample() {
    if (!newExample.trim() || !current) return;
    const next = [...examples, newExample.trim()];
    await saveExamples(next);
    setNewExample('');
  }

  async function removeExample(idx: number) {
    if (!current) return;
    const next = examples.filter((_, i) => i !== idx);
    await saveExamples(next);
  }

  async function saveExamples(next: string[]) {
    setSaving(true);
    await fetch('/api/presets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedId, examples: next }),
    });
    const res = await fetch('/api/presets');
    const data = await res.json();
    setPresets(data.presets);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div
        style={{ background: '#16181C', border: '1px solid #2F3336', borderRadius: 16, width: 500, maxHeight: '80vh', overflow: 'auto', padding: 24 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>⚙️ 설정</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#536471', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        {/* 톤 프리셋 관리 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#E7E9EA' }}>내 말투 예시 관리</div>
          <div style={{ fontSize: 12, color: '#536471', marginBottom: 12, lineHeight: 1.5 }}>
            AI가 내 말투를 따라 쓸 수 있도록 실제 내 트윗 예시를 저장해요.<br />
            많을수록 더 잘 따라 씁니다 (3~5개 권장).
          </div>

          {/* 프리셋 탭 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {presets.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                style={{
                  padding: '6px 14px', borderRadius: 9999,
                  border: `1px solid ${selectedId === p.id ? '#1D9BF0' : '#2F3336'}`,
                  background: selectedId === p.id ? '#1D9BF020' : 'transparent',
                  color: selectedId === p.id ? '#1D9BF0' : '#536471',
                  fontSize: 13, fontWeight: selectedId === p.id ? 700 : 400, cursor: 'pointer',
                }}
              >{p.name}</button>
            ))}
          </div>

          {/* 예시 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {examples.length === 0 && (
              <div style={{ padding: '12px', background: '#0D0D0D', borderRadius: 8, fontSize: 13, color: '#536471', textAlign: 'center' }}>
                아직 예시가 없어요. 아래에서 추가해보세요.
              </div>
            )}
            {examples.map((ex, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', background: '#0D0D0D', borderRadius: 8 }}>
                <p style={{ margin: 0, flex: 1, fontSize: 13, color: '#E7E9EA', lineHeight: 1.5 }}>{ex}</p>
                <button
                  onClick={() => removeExample(i)}
                  style={{ background: 'none', border: 'none', color: '#536471', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}
                >×</button>
              </div>
            ))}
          </div>

          {/* 새 예시 추가 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              value={newExample}
              onChange={e => setNewExample(e.target.value)}
              placeholder="내가 쓴 트윗 예시를 붙여넣어요..."
              rows={2}
              style={{
                flex: 1, background: '#0D0D0D', border: '1px solid #2F3336',
                borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical',
              }}
            />
            <button
              onClick={addExample}
              disabled={!newExample.trim() || saving}
              className="btn-blue"
              style={{ alignSelf: 'flex-end', padding: '8px 16px', fontSize: 13 }}
            >
              {saving ? '...' : saved ? '✓' : '추가'}
            </button>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #2F3336', paddingTop: 16, fontSize: 12, color: '#536471' }}>
          💡 Claude API 키는 프로젝트 루트의 <code style={{ background: '#0D0D0D', padding: '2px 6px', borderRadius: 4 }}>.env.local</code> 파일에 설정하세요.
        </div>
      </div>
    </div>
  );
}

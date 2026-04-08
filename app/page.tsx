'use client';

import { useState, useCallback } from 'react';
import TrendPanel from '@/components/TrendPanel';
import EditorPanel from '@/components/EditorPanel';
import HistoryPanel from '@/components/HistoryPanel';
import SettingsModal from '@/components/SettingsModal';

export type FormatKey = '공감형' | '정보형' | '논쟁형' | '반전형' | '감성형' | '병맛형';

export interface Draft {
  id: number;
  created_at: string;
  keyword: string;
  format: string;
  content: string;
  is_saved: number;
}

export default function Home() {
  const [selectedKeyword, setSelectedKeyword] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<FormatKey>('공감형');
  const [selectedPresetId, setSelectedPresetId] = useState(1);
  const [threadMode, setThreadMode] = useState(false);
  const [drafts, setDrafts] = useState<{ content: string; id?: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');

  const generate = useCallback(async () => {
    if (!selectedKeyword.trim()) return;
    setLoading(true);
    setDrafts([]);
    setActiveTab('editor');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: selectedKeyword, format: selectedFormat, tonePresetId: selectedPresetId, threadMode }),
      });
      const data = await res.json();
      if (data.drafts) {
        setDrafts(data.drafts.map((content: string, i: number) => ({ content, id: data.ids?.[i] })));
        setHistoryRefresh(n => n + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedKeyword, selectedFormat, selectedPresetId, threadMode]);

  const loadFromHistory = (draft: Draft) => {
    setSelectedKeyword(draft.keyword);
    setSelectedFormat(draft.format as FormatKey);
    setDrafts([{ content: draft.content, id: draft.id }]);
    setActiveTab('editor');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 300px', height: '100vh' }}>
      <div className="panel">
        <TrendPanel
          selectedKeyword={selectedKeyword}
          onSelect={setSelectedKeyword}
          selectedFormat={selectedFormat}
          onFormatChange={setSelectedFormat}
          selectedPresetId={selectedPresetId}
          onPresetChange={setSelectedPresetId}
          threadMode={threadMode}
          onThreadModeChange={setThreadMode}
          onGenerate={generate}
          loading={loading}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>

      <div className="panel" style={{ borderRight: 'none' }}>
        <div style={{ borderBottom: '1px solid #2F3336', display: 'flex' }}>
          {(['editor', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '14px', background: 'none', border: 'none',
              borderBottom: activeTab === tab ? '2px solid #1D9BF0' : '2px solid transparent',
              color: activeTab === tab ? '#1D9BF0' : '#536471',
              fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}>
              {tab === 'editor' ? `에디터${drafts.length > 0 ? ` (${drafts.length})` : ''}` : '히스토리'}
            </button>
          ))}
        </div>
        {activeTab === 'editor'
          ? <EditorPanel drafts={drafts} loading={loading} keyword={selectedKeyword} format={selectedFormat} onDraftsChange={setDrafts} onHistoryRefresh={() => setHistoryRefresh(n => n + 1)} />
          : <HistoryPanel refresh={historyRefresh} onLoad={loadFromHistory} />}
      </div>

      <div className="panel" style={{ borderLeft: '1px solid #2F3336' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #2F3336', fontWeight: 700, fontSize: 15 }}>
          저장된 대본
        </div>
        <HistoryPanel refresh={historyRefresh} onLoad={loadFromHistory} compact savedOnly />
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

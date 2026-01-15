
import React, { useState, useEffect } from 'react';
import { Layers, Play, Download, Settings, FileText, Scissors, AlertTriangle, CheckCircle } from 'lucide-react';
import { ChunkingProcessor } from '../chunking/index';
import { ChunkingResult, InputStructure } from '../chunking/types';
import { ConfigManager } from '../chunking/config';

interface ChunkingViewProps {
  initialInput?: InputStructure | null;
  onChunkingComplete?: (result: ChunkingResult) => void;
}

export const ChunkingView: React.FC<ChunkingViewProps> = ({ initialInput, onChunkingComplete }) => {
  const [inputJson, setInputJson] = useState<string>('');
  const [result, setResult] = useState<ChunkingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Config State (mimicking env vars)
  const [config, setConfig] = useState({
    chunkSize: 512,
    chunkOverlap: 50,
    preserveDialogue: true
  });

  useEffect(() => {
    if (initialInput) {
      setInputJson(JSON.stringify(initialInput, null, 2));
    }
  }, [initialInput]);

  const handleRunChunking = () => {
    setError(null);
    setIsProcessing(true);
    setResult(null);

    // 1. Simulate Env Var update
    (window as any).process = {
        ...(window as any).process,
        env: {
            ...(window as any).process?.env,
            CHUNK_SIZE: config.chunkSize.toString(),
            CHUNK_OVERLAP: config.chunkOverlap.toString(),
            PRESERVE_DIALOGUE: config.preserveDialogue.toString(),
            TOKENIZER_MODEL: "cl100k_base"
        }
    };

    // 2. Reset Config Singleton to pick up new "Env Vars"
    ConfigManager.reset();

    setTimeout(() => {
      try {
        const processor = new ChunkingProcessor();
        const output = processor.run(inputJson);
        setResult(output);
        if (onChunkingComplete) {
            onChunkingComplete(output);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsProcessing(false);
      }
    }, 100); 
  };

  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chunked_output_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Configuration & Input */}
      <div className="glass-panel rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-subtle pb-3">
          <Scissors className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-white">أداة التقسيم (Semantic Splitting)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-textMuted">حجم المقطع (Tokens)</label>
            <input 
              type="number" 
              value={config.chunkSize}
              onChange={(e) => setConfig({...config, chunkSize: parseInt(e.target.value)})}
              className="w-full p-2 bg-input border border-subtle rounded focus:ring-2 focus:ring-primary outline-none text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-textMuted">التداخل (Overlap)</label>
             <input 
              type="number" 
              value={config.chunkOverlap}
              onChange={(e) => setConfig({...config, chunkOverlap: parseInt(e.target.value)})}
              className="w-full p-2 bg-input border border-subtle rounded focus:ring-2 focus:ring-primary outline-none text-white"
            />
          </div>
          <div className="flex items-end pb-2">
             <label className="flex items-center gap-2 cursor-pointer text-textMuted hover:text-white transition-colors">
               <input 
                  type="checkbox" 
                  checked={config.preserveDialogue}
                  onChange={(e) => setConfig({...config, preserveDialogue: e.target.checked})}
                  className="w-4 h-4 accent-primary bg-surface border-subtle rounded"
               />
               <span className="text-sm font-medium">الحفاظ على سياق الحوار</span>
             </label>
          </div>
        </div>

        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-textMuted">مدخلات التحليل (JSON Structure)</label>
                <span className="text-xs text-textMuted opacity-50">قم بلصق نتيجة المحلل الهيكلي هنا</span>
            </div>
            <textarea
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                placeholder='{"novel_metadata": ..., "chapters": ...}'
                className="w-full h-40 p-3 text-xs font-mono bg-input border border-subtle rounded-lg focus:ring-2 focus:ring-primary outline-none resize-y text-lavender"
            />
        </div>

        <div className="mt-6 flex justify-end">
             <button
               onClick={handleRunChunking}
               disabled={isProcessing || !inputJson}
               className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary/80 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
             >
               {isProcessing ? 'جاري التقسيم...' : (
                 <>
                   <Play className="w-4 h-4" />
                   بدء التقسيم
                 </>
               )}
             </button>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="p-4 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl shadow-sm">
                    <div className="text-xs text-textMuted mb-1">عدد المقاطع (Chunks)</div>
                    <div className="text-2xl font-bold text-primary">{result.metadata.total_chunks}</div>
                </div>
                <div className="glass-panel p-4 rounded-xl shadow-sm">
                    <div className="text-xs text-textMuted mb-1">إجمالي التوكنز</div>
                    <div className="text-2xl font-bold text-secondary">{result.metadata.total_tokens}</div>
                </div>
                 <div className="glass-panel p-4 rounded-xl shadow-sm">
                    <div className="text-xs text-textMuted mb-1">متوسط الحجم</div>
                    <div className="text-2xl font-bold text-white">{result.metadata.average_chunk_size.toFixed(0)}</div>
                </div>
                 <div className="glass-panel p-4 rounded-xl shadow-sm">
                    <div className="text-xs text-textMuted mb-1">وقت المعالجة</div>
                    <div className="text-2xl font-bold text-lavender">{result.metadata.processing_time_ms.toFixed(0)}ms</div>
                </div>
            </div>

            {/* Chunks Preview */}
            <div className="glass-panel rounded-xl shadow-lg overflow-hidden">
                 <div className="bg-surface/50 px-6 py-4 border-b border-subtle flex items-center justify-between">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Layers className="w-5 h-5 text-primary" />
                        المقاطع الناتجة (Chunks)
                    </h3>
                    <button 
                        onClick={downloadJson}
                        className="text-sm bg-surface border border-subtle px-3 py-1.5 rounded hover:bg-white/5 flex items-center gap-1 text-textMuted hover:text-white"
                    >
                        <Download className="w-4 h-4" />
                        تحميل JSON
                    </button>
                 </div>
                 <div className="p-6 grid gap-6">
                    {result.chunks.slice(0, 20).map((chunk) => (
                        <div key={chunk.chunk_id} className="border border-subtle rounded-lg overflow-hidden bg-input/50">
                            <div className="bg-surface/30 px-4 py-2 border-b border-subtle flex justify-between items-center text-xs text-textMuted">
                                <div className="flex gap-3">
                                    <span className="font-bold text-white">Chunk #{chunk.chunk_id}</span>
                                    <span>{chunk.chapter_title}</span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/20">{chunk.token_count} tokens</span>
                                    <span className="bg-surface border border-subtle px-2 py-0.5 rounded">Split: {chunk.split_point}</span>
                                </div>
                            </div>
                            <div className="p-4 text-white/90 leading-relaxed font-arabic" dir="rtl">
                                {chunk.overlap_text && (
                                    <span className="bg-yellow-500/10 text-yellow-500/70 select-none border-b border-yellow-500/20 inline" title="Overlap Context">
                                        {chunk.overlap_text} 
                                    </span>
                                )}
                                <span> {chunk.content.substring(chunk.overlap_text?.length || 0)}</span>
                            </div>
                        </div>
                    ))}
                    {result.chunks.length > 20 && (
                        <div className="text-center text-textMuted py-4 italic">
                            ... {result.chunks.length - 20} more chunks hidden ...
                        </div>
                    )}
                 </div>
            </div>
        </div>
      )}
    </div>
  );
};

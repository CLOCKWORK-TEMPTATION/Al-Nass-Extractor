
import React, { useState } from 'react';
import { Tag, Zap, BrainCircuit, Activity, Database, Play, CheckCircle, AlertTriangle, Settings, Key } from 'lucide-react';
import { ChunkingResult, EnrichedChunk } from '../types';
import { processEnrichedChunk } from '../services/geminiService';
import { createClassifierPipeline, ClassifierConfig } from '../services/classifierBrowserService';

interface ClassificationViewProps {
  inputChunks: ChunkingResult | null;
  enrichedResults: EnrichedChunk[];
  onResultsUpdate: React.Dispatch<React.SetStateAction<EnrichedChunk[]>>;
}

export const ClassificationView: React.FC<ClassificationViewProps> = ({ 
  inputChunks, 
  enrichedResults, 
  onResultsUpdate 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentProcessingId, setCurrentProcessingId] = useState<number | null>(null);
  
  // Configuration state for the new classifier
  const [useAdvancedClassifier, setUseAdvancedClassifier] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<ClassifierConfig>({
    hfApiKey: '',
    llmApiKey: '',
    hfDialectModel: 'CAMeL-Lab/bert-base-arabic-camelbert-mix-dialect-did',
    hfSentimentModel: 'CAMeL-Lab/bert-base-arabic-camelbert-mix-sentiment',
    llmModelName: 'claude-sonnet-4-20250514',
    llmTemperature: 0.3,
    llmMaxTokens: 2048,
    enableQA: true,
    enableReasoning: true,
    enableDialectNormalization: true,
    enableEntityExtraction: true,
  });

  const startClassification = async () => {
    if (!inputChunks || inputChunks.chunks.length === 0) return;
    
    setIsProcessing(true);
    onResultsUpdate([]); // Clear previous results
    setProgress(0);

    const total = inputChunks.chunks.length;
    
    // Check if using advanced classifier
    if (useAdvancedClassifier && config.hfApiKey && config.llmApiKey) {
      try {
        const pipeline = createClassifierPipeline(config);
        
        // Process with advanced BERT + Anthropic pipeline
        for (let i = 0; i < total; i++) {
          const chunk = inputChunks.chunks[i];
          setCurrentProcessingId(chunk.chunk_id);
          
          try {
            const result = await pipeline.processChunk(chunk.chunk_id, chunk.content);
            onResultsUpdate(prev => [...prev, result]);
          } catch (e) {
            console.error(`Failed to process chunk ${chunk.chunk_id}`, e);
          }
          
          setProgress(Math.round(((i + 1) / total) * 100));
        }
      } catch (e) {
        console.error('Failed to initialize advanced classifier:', e);
        alert('فشل في تهيئة المصنف المتقدم. تأكد من صحة مفاتيح API.');
      }
    } else {
      // Use original Gemini-based processing
      for (let i = 0; i < total; i++) {
        const chunk = inputChunks.chunks[i];
        setCurrentProcessingId(chunk.chunk_id);
        
        try {
          const result = await processEnrichedChunk(chunk.chunk_id, chunk.content);
          onResultsUpdate(prev => [...prev, result]);
        } catch (e) {
          console.error(`Failed to process chunk ${chunk.chunk_id}`, e);
        }
        
        setProgress(Math.round(((i + 1) / total) * 100));
      }
    }

    setIsProcessing(false);
    setCurrentProcessingId(null);
  };

  const downloadResults = () => {
    const jsonString = JSON.stringify(enrichedResults, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enriched_dataset_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!inputChunks) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-textMuted border-2 border-dashed border-subtle rounded-xl bg-input/50">
        <Database className="w-12 h-12 mb-4 opacity-50" />
        <p>يرجى إتمام عملية "التقطيع" (Splitting) أولاً لتوفير البيانات لهذا القسم.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Configuration Panel */}
      <div className="glass-panel rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4 border-b border-subtle pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-white">إعدادات المصنف (Classifier Config)</h3>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-1 text-xs border border-subtle rounded-lg hover:bg-white/5 text-textMuted hover:text-white"
          >
            {showConfig ? 'إخفاء' : 'عرض الإعدادات'}
          </button>
        </div>

        {showConfig && (
          <div className="space-y-4">
            {/* Mode Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => setUseAdvancedClassifier(false)}
                className={`cursor-pointer border rounded-lg p-4 transition-all ${
                  !useAdvancedClassifier ? 'bg-primary/10 border-primary ring-1 ring-primary/30' : 'bg-input border-subtle hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white">وضع Gemini (الافتراضي)</h4>
                  {!useAdvancedClassifier && <CheckCircle className="w-5 h-5 text-primary" />}
                </div>
                <p className="text-xs text-textMuted">
                  يستخدم Gemini Flash/Pro لجميع عمليات التصنيف والإثراء. بسيط وسريع.
                </p>
              </div>

              <div
                onClick={() => setUseAdvancedClassifier(true)}
                className={`cursor-pointer border rounded-lg p-4 transition-all ${
                  useAdvancedClassifier ? 'bg-primary/10 border-primary ring-1 ring-primary/30' : 'bg-input border-subtle hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white">وضع BERT + Claude (متقدم)</h4>
                  {useAdvancedClassifier && <CheckCircle className="w-5 h-5 text-primary" />}
                </div>
                <p className="text-xs text-textMuted">
                  يستخدم نماذج BERT العربية من HuggingFace + Claude من Anthropic. أكثر دقة وتخصصاً.
                </p>
              </div>
            </div>

            {/* API Keys (only show when advanced mode is selected) */}
            {useAdvancedClassifier && (
              <div className="space-y-3 border-t border-subtle pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-textMuted" />
                  <span className="text-sm font-semibold text-white">مفاتيح API المطلوبة</span>
                </div>
                
                <div>
                  <label className="block text-xs text-textMuted mb-1">HuggingFace API Key</label>
                  <input
                    type="password"
                    value={config.hfApiKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, hfApiKey: e.target.value }))}
                    placeholder="hf_xxxxxxxxxxxxx"
                    className="w-full px-3 py-2 bg-input border border-subtle rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-textMuted mt-1">احصل عليه من: https://huggingface.co/settings/tokens</p>
                </div>

                <div>
                  <label className="block text-xs text-textMuted mb-1">Anthropic API Key (Claude)</label>
                  <input
                    type="password"
                    value={config.llmApiKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, llmApiKey: e.target.value }))}
                    placeholder="sk-ant-xxxxxxxxxxxxx"
                    className="w-full px-3 py-2 bg-input border border-subtle rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-textMuted mt-1">احصل عليه من: https://console.anthropic.com/</p>
                </div>

                {(!config.hfApiKey || !config.llmApiKey) && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-500">
                      يجب إدخال كلا المفتاحين لاستخدام الوضع المتقدم. بدونهما سيتم استخدام وضع Gemini الافتراضي.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Header & Controls */}
      <div className="glass-panel rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6 border-b border-subtle pb-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/20 rounded-lg">
                <Tag className="w-6 h-6 text-primary" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-white">التصنيف والإثراء (Classification & Augmentation)</h2>
               <p className="text-sm text-textMuted">Fast Labels (Dialect/Sentiment) + Deep Augmentation (Q&A/Reasoning)</p>
             </div>
          </div>
          
          <div className="flex gap-3">
             <button
               onClick={startClassification}
               disabled={isProcessing}
               className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary/80 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
             >
               {isProcessing ? (
                 <>
                   <Activity className="w-4 h-4 animate-spin" />
                   جاري المعالجة ({progress}%)
                 </>
               ) : (
                 <>
                   <Play className="w-4 h-4" />
                   بدء المعالجة
                 </>
               )}
             </button>
             {enrichedResults.length > 0 && (
               <button onClick={downloadResults} className="px-4 py-2 border border-subtle rounded-lg hover:bg-white/5 font-medium text-textMuted hover:text-white bg-surface">
                 تحميل النتائج JSON
               </button>
             )}
          </div>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="mb-6">
             <div className="flex justify-between text-xs text-textMuted mb-1">
               <span>جاري معالجة المقطع ID: {currentProcessingId}</span>
               <span>{progress}%</span>
             </div>
             <div className="w-full bg-input rounded-full h-2.5 overflow-hidden border border-subtle">
               <div className="bg-secondary h-2.5 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(61,184,154,0.5)]" style={{ width: `${progress}%` }}></div>
             </div>
          </div>
        )}

        {/* Stats Summary */}
        {enrichedResults.length > 0 && (
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
              <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                <div className="text-xs text-green-400 font-medium">المقاطع المعالجة</div>
                <div className="text-2xl font-bold text-white">{enrichedResults.length}</div>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                <div className="text-xs text-blue-400 font-medium">معدل الثقة (Fast)</div>
                <div className="text-2xl font-bold text-white">
                  {(enrichedResults.reduce((acc, r) => acc + r.fast_labels.dialect_confidence, 0) / enrichedResults.length * 100).toFixed(0)}%
                </div>
              </div>
              <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                <div className="text-xs text-primary font-medium">أسئلة مولدة</div>
                <div className="text-2xl font-bold text-white">
                   {enrichedResults.filter(r => r.llm_augmentation?.instruction_pair).length}
                </div>
              </div>
              <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                <div className="text-xs text-amber-500 font-medium">زمن المعالجة (Avg)</div>
                <div className="text-2xl font-bold text-white">
                  {(enrichedResults.reduce((acc, r) => acc + r.processing_metadata.total_processing_ms, 0) / enrichedResults.length).toFixed(0)}ms
                </div>
              </div>
           </div>
        )}
      </div>

      {/* Results List */}
      <div className="grid gap-6">
        {enrichedResults.slice().reverse().map((result) => (
          <div key={result.chunk_id} className="glass-panel rounded-xl shadow-lg border border-subtle overflow-hidden group hover:border-primary/30 transition-colors">
             {/* Card Header */}
             <div className="bg-surface/50 px-6 py-3 border-b border-subtle flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <span className="font-mono text-xs font-bold bg-input border border-subtle px-2 py-1 rounded text-lavender">ID: {result.chunk_id}</span>
                   <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                     result.fast_labels.sentiment === 'positive' ? 'bg-green-500/20 text-green-400 border border-green-500/20' :
                     result.fast_labels.sentiment === 'negative' ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
                     'bg-input text-textMuted border border-subtle'
                   }`}>
                      {result.fast_labels.sentiment}
                   </span>
                   <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium border border-primary/20">
                      {result.fast_labels.text_type}
                   </span>
                </div>
                <div className="text-xs text-textMuted flex items-center gap-2">
                   <Zap className="w-3 h-3" />
                   {result.processing_metadata.total_processing_ms}ms
                </div>
             </div>

             {/* Content Grid */}
             <div className="grid md:grid-cols-2">
                {/* Left: Original Text & Fast Labels */}
                <div className="p-6 border-b md:border-b-0 md:border-r border-subtle">
                   <div className="mb-4">
                      <h4 className="text-xs font-bold text-textMuted uppercase mb-2">النص الأصلي</h4>
                      <p className="text-white text-sm leading-relaxed font-arabic" dir="rtl">{result.text}</p>
                   </div>
                   <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                         <span className="text-textMuted block mb-1">اللهجة</span>
                         <span className="font-semibold text-secondary">{result.fast_labels.dialect} ({(result.fast_labels.dialect_confidence * 100).toFixed(0)}%)</span>
                      </div>
                      <div>
                         <span className="text-textMuted block mb-1">الجنس</span>
                         <span className="font-semibold text-secondary">{result.fast_labels.speaker_gender}</span>
                      </div>
                   </div>
                </div>

                {/* Right: Deep Augmentation */}
                <div className="p-6 bg-input/30">
                   {result.llm_augmentation ? (
                     <div className="space-y-4">
                        {/* Q&A */}
                        {result.llm_augmentation.instruction_pair && (
                          <div className="bg-surface p-3 rounded-lg border border-subtle shadow-sm">
                             <div className="flex gap-2 items-start mb-2">
                                <span className="text-primary font-bold text-xs">س:</span>
                                <p className="text-xs text-white font-medium">{result.llm_augmentation.instruction_pair.question}</p>
                             </div>
                             <div className="flex gap-2 items-start">
                                <span className="text-secondary font-bold text-xs">ج:</span>
                                <p className="text-xs text-textMuted">{result.llm_augmentation.instruction_pair.answer}</p>
                             </div>
                          </div>
                        )}
                        
                        {/* Reasoning */}
                        <div>
                           <h4 className="text-xs font-bold text-textMuted uppercase mb-1 flex items-center gap-1">
                              <BrainCircuit className="w-3 h-3" /> التعليل (Reasoning)
                           </h4>
                           <p className="text-xs text-lavender leading-relaxed bg-input p-2 rounded border border-subtle">
                             {result.llm_augmentation.reasoning}
                           </p>
                        </div>

                        {/* Entities */}
                        {result.llm_augmentation.entities && (
                           <div className="flex flex-wrap gap-2">
                              {result.llm_augmentation.entities.emotions_expressed?.map(e => (
                                <span key={e} className="text-[10px] px-2 py-0.5 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-full">{e}</span>
                              ))}
                              {result.llm_augmentation.entities.characters?.map(c => (
                                <span key={c} className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">{c}</span>
                              ))}
                           </div>
                        )}
                     </div>
                   ) : (
                     <div className="flex items-center justify-center h-full text-textMuted text-xs italic">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        فشل الإثراء العميق لهذا المقطع
                     </div>
                   )}
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

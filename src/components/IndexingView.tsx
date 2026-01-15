
import React, { useState, useEffect } from 'react';
import { Database, Search, Settings, Server, Key, Play, AlertCircle, CheckCircle, Loader2, Edit3, Ruler, Trash2 } from 'lucide-react';
import { EnrichedChunk, ExtractedFile } from '../types';
import { IndexerPipeline, IndexingConfig, EMBEDDING_MODELS, getModelDimensions } from '../services/indexingService';

interface IndexingViewProps {
  enrichedChunks: EnrichedChunk[];
  files: ExtractedFile[];
}

export const IndexingView: React.FC<IndexingViewProps> = ({ enrichedChunks, files }) => {
  // Configuration State
  const [config, setConfig] = useState<IndexingConfig>({
    qdrantUrl: 'http://localhost:6333',
    qdrantApiKey: '',
    collectionName: 'arabic_novels',
    embeddingProvider: 'gemini',
    embeddingApiKey: '', // User must provide
    embeddingModel: 'gemini-embedding-001',
    customModelName: '',
    manualDimensions: 768,
    detectBoilerplate: true,
    batchSize: 10,
    maxRetries: 3,
    retryDelay: 2000,
    customRegexRules: [] // Custom regex rules for text cleaning during indexing
  });

  // Derived state for current model dimensions
  const [currentDimensions, setCurrentDimensions] = useState(1024);

  // Update dimensions display when model selection changes
  useEffect(() => {
    if (config.embeddingModel === 'custom') {
        setCurrentDimensions(config.manualDimensions || 0);
    } else {
        setCurrentDimensions(getModelDimensions(config.embeddingProvider, config.embeddingModel));
    }
  }, [config.embeddingProvider, config.embeddingModel, config.manualDimensions]);

  // When provider changes, reset model to the first available one for that provider
  useEffect(() => {
    const defaultModel = EMBEDDING_MODELS[config.embeddingProvider][0].id;
    setConfig(prev => ({ ...prev, embeddingModel: defaultModel, customModelName: '' }));
  }, [config.embeddingProvider]);

  // Processing State
  const [status, setStatus] = useState<'idle' | 'initializing' | 'indexing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [totalIndexed, setTotalIndexed] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Pipeline Instance Ref
  const [pipeline, setPipeline] = useState<IndexerPipeline | null>(null);

  const handleConfigChange = (key: keyof IndexingConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const startIndexing = async () => {
    if (!config.embeddingApiKey) {
        setErrorMsg("يرجى إدخال مفتاح API الخاص بمزود Embedding (Gemini/HuggingFace/OpenAI).");
        return;
    }

    if (config.embeddingModel === 'custom' && !config.customModelName) {
        setErrorMsg("يرجى إدخال اسم النموذج المخصص (Model Name).");
        return;
    }

    setStatus('initializing');
    setErrorMsg(null);
    setProgress(0);
    setTotalIndexed(0);

    try {
        const newPipeline = new IndexerPipeline(config);
        setPipeline(newPipeline);

        // 1. Initialize Collection
        // Use manual dimensions for custom models, otherwise look up standard dims
        const dimensions = config.embeddingModel === 'custom' 
            ? (config.manualDimensions || 768) 
            : getModelDimensions(config.embeddingProvider, config.embeddingModel);
        
        await newPipeline.initialize(dimensions);

        setStatus('indexing');
        
        // 2. Batch Processing
        const total = enrichedChunks.length;
        const sourceName = files.length > 0 ? files[0].name : "unknown_source";
        
        for (let i = 0; i < total; i += config.batchSize) {
            const batch = enrichedChunks.slice(i, i + config.batchSize);
            const count = await newPipeline.processBatch(batch, sourceName);
            setTotalIndexed(prev => prev + count);
            setProgress(Math.round(((i + batch.length) / total) * 100));
        }

        setStatus('completed');
    } catch (e: any) {
        console.error(e);
        setErrorMsg(e.message || "حدث خطأ غير متوقع أثناء الفهرسة.");
        setStatus('error');
    }
  };

  const handleSearch = async () => {
    if (!pipeline || !searchQuery) return;
    setIsSearching(true);
    try {
        const results = await pipeline.search(searchQuery);
        setSearchResults(results.result || []);
    } catch (e: any) {
        alert("Search failed: " + e.message);
    } finally {
        setIsSearching(false);
    }
  };

  if (enrichedChunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-textMuted border-2 border-dashed border-subtle rounded-xl bg-input/50">
        <Database className="w-12 h-12 mb-4 opacity-50" />
        <p>يرجى إتمام عملية "التصنيف" (Phase 4) لتوفير البيانات للفهرسة.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="glass-panel rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-subtle pb-4">
                <div className="p-2 bg-primary/20 rounded-lg">
                    <Database className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">الفهرسة المتجهة (Vector Indexing)</h2>
                    <p className="text-sm text-textMuted">بناء فهرس دلالي باستخدام Qdrant & Embeddings.</p>
                </div>
            </div>

            {/* Config Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                    <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
                        <Server className="w-4 h-4 text-secondary" /> إعدادات Qdrant
                    </h3>
                    <div className="space-y-2">
                        <label className="text-xs text-textMuted">Qdrant URL</label>
                        <input 
                            type="text" 
                            value={config.qdrantUrl}
                            onChange={e => handleConfigChange('qdrantUrl', e.target.value)}
                            className="w-full bg-input border border-subtle rounded p-2 text-sm text-white focus:border-primary outline-none"
                            placeholder="http://localhost:6333"
                        />
                    </div>
                    <div className="space-y-2">
                         <label className="text-xs text-textMuted">Collection Name</label>
                        <input 
                            type="text" 
                            value={config.collectionName}
                            onChange={e => handleConfigChange('collectionName', e.target.value)}
                            className="w-full bg-input border border-subtle rounded p-2 text-sm text-white focus:border-primary outline-none"
                        />
                    </div>
                     <div className="space-y-2">
                         <label className="text-xs text-textMuted">API Key (Optional)</label>
                        <input 
                            type="password" 
                            value={config.qdrantApiKey}
                            onChange={e => handleConfigChange('qdrantApiKey', e.target.value)}
                            className="w-full bg-input border border-subtle rounded p-2 text-sm text-white focus:border-primary outline-none"
                        />
                    </div>
                    
                    <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                                type="checkbox"
                                checked={config.detectBoilerplate}
                                onChange={e => handleConfigChange('detectBoilerplate', e.target.checked)}
                                className="w-4 h-4 accent-primary rounded cursor-pointer"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm text-white group-hover:text-primary transition-colors">كشف وإزالة النصوص المكررة (Boilerplate)</span>
                                <span className="text-[10px] text-textMuted">تجاهل الجمل الشائعة (مثل: "حقوق النشر"، "البسملة") أثناء الفهرسة</span>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="space-y-4">
                     <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
                        <Settings className="w-4 h-4 text-secondary" /> إعدادات التضمين (Embeddings)
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                        <button 
                            onClick={() => handleConfigChange('embeddingProvider', 'gemini')}
                            className={`p-2 rounded text-xs border ${config.embeddingProvider === 'gemini' ? 'bg-primary border-primary text-white' : 'bg-input border-subtle text-textMuted'}`}
                        >
                            Gemini
                        </button>
                        <button 
                            onClick={() => handleConfigChange('embeddingProvider', 'huggingface')}
                            className={`p-2 rounded text-xs border ${config.embeddingProvider === 'huggingface' ? 'bg-primary border-primary text-white' : 'bg-input border-subtle text-textMuted'}`}
                        >
                            HuggingFace
                        </button>
                        <button 
                             onClick={() => handleConfigChange('embeddingProvider', 'openai')}
                             className={`p-2 rounded text-xs border ${config.embeddingProvider === 'openai' ? 'bg-primary border-primary text-white' : 'bg-input border-subtle text-textMuted'}`}
                        >
                            OpenAI
                        </button>
                    </div>
                     
                     <div className="space-y-2">
                         <label className="text-xs text-textMuted flex items-center gap-1 justify-between">
                             <span>Model Selection</span>
                             <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white">{currentDimensions} dims</span>
                         </label>
                         <select
                            value={config.embeddingModel}
                            onChange={e => handleConfigChange('embeddingModel', e.target.value)}
                            className="w-full bg-input border border-subtle rounded p-2 text-sm text-white focus:border-primary outline-none"
                         >
                            {EMBEDDING_MODELS[config.embeddingProvider].map(model => (
                                <option key={model.id} value={model.id}>
                                    {model.name}
                                </option>
                            ))}
                            <option value="custom">Custom Model (Manual Input)</option>
                         </select>
                    </div>

                    {/* Custom Model Inputs */}
                    {config.embeddingModel === 'custom' && (
                        <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-1">
                                <label className="text-[10px] text-textMuted flex items-center gap-1">
                                    <Edit3 className="w-3 h-3" /> Model Name
                                </label>
                                <input 
                                    type="text" 
                                    value={config.customModelName}
                                    onChange={e => handleConfigChange('customModelName', e.target.value)}
                                    placeholder="e.g. sentence-transformers/all-MiniLM-L6-v2"
                                    className="w-full bg-input border border-subtle rounded p-2 text-xs text-white focus:border-secondary outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-textMuted flex items-center gap-1">
                                    <Ruler className="w-3 h-3" /> Dimensions
                                </label>
                                <input 
                                    type="number" 
                                    value={config.manualDimensions}
                                    onChange={e => handleConfigChange('manualDimensions', parseInt(e.target.value))}
                                    className="w-full bg-input border border-subtle rounded p-2 text-xs text-white focus:border-secondary outline-none"
                                />
                            </div>
                        </div>
                    )}

                     <div className="space-y-2">
                         <label className="text-xs text-textMuted flex items-center gap-1">
                             <Key className="w-3 h-3" /> API Key ({config.embeddingProvider === 'gemini' ? 'Gemini' : config.embeddingProvider === 'openai' ? 'OpenAI' : 'HF'})
                         </label>
                        <input 
                            type="password" 
                            value={config.embeddingApiKey}
                            onChange={e => handleConfigChange('embeddingApiKey', e.target.value)}
                            className="w-full bg-input border border-subtle rounded p-2 text-sm text-white focus:border-primary outline-none"
                            placeholder={config.embeddingProvider === 'openai' ? 'sk-...' : 'hf_...'}
                        />
                    </div>
                </div>
            </div>
            
            <div className="flex justify-end border-t border-subtle pt-4">
                <button
                    onClick={startIndexing}
                    disabled={status === 'indexing' || status === 'initializing'}
                    className="bg-primary text-white px-8 py-2 rounded-lg font-semibold hover:bg-primary/80 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                >
                    {status === 'indexing' || status === 'initializing' ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            جاري الفهرسة ({progress}%)
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4" />
                            بدء الفهرسة ({enrichedChunks.length} مقطع)
                        </>
                    )}
                </button>
            </div>

            {/* Status Messages */}
            {status === 'completed' && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    تمت فهرسة {totalIndexed} مقطع بنجاح في {config.collectionName}.
                </div>
            )}
             {errorMsg && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-5 h-5" />
                    {errorMsg}
                </div>
            )}
        </div>

        {/* Search Test Section */}
        {status === 'completed' && (
            <div className="glass-panel rounded-xl shadow-lg p-6">
                 <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-secondary" />
                    اختبار البحث الدلالي
                 </h3>
                 <div className="flex gap-2 mb-4">
                     <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ابحث عن مفهوم، شخصية، أو اقتباس..."
                        className="flex-1 bg-input border border-subtle rounded-lg p-3 text-white focus:border-secondary outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                     />
                     <button 
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="bg-secondary text-white px-6 rounded-lg font-semibold hover:bg-secondary/80 disabled:opacity-50"
                     >
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'بحث'}
                     </button>
                 </div>

                 <div className="space-y-3">
                     {searchResults.map((res: any) => (
                         <div key={res.id} className="p-4 bg-input/50 rounded-lg border border-subtle hover:border-primary/50 transition-colors">
                             <div className="flex justify-between text-xs text-textMuted mb-2">
                                 <span>Score: {res.score.toFixed(4)}</span>
                                 <span>{res.payload.classification.text_type}</span>
                             </div>
                             <p className="text-white text-sm leading-relaxed font-arabic" dir="rtl">
                                 {res.payload.content.raw_text}
                             </p>
                             {res.payload.metadata.augmented && (
                                 <div className="mt-2 pt-2 border-t border-subtle/50 text-xs text-lavender">
                                     🤖 Augmented: {res.payload.classification.dialect}
                                 </div>
                             )}
                         </div>
                     ))}
                     {searchResults.length === 0 && !isSearching && searchQuery && (
                         <p className="text-textMuted text-sm text-center">لا توجد نتائج.</p>
                     )}
                 </div>
            </div>
        )}
    </div>
  );
};


import React, { useState } from 'react';
import { ProcessingSettings, ExtractedFile, NovelStructure, ChunkingResult, EnrichedChunk, NovelMetadataResult } from './types';
import { extractArabicText } from './services/geminiService';
import { SettingsPanel } from './components/SettingsPanel';
import { UploadZone } from './components/UploadZone';
import { ResultCard } from './components/ResultCard';
import { ParserView } from './components/ParserView';
import { ChunkingView } from './src/components/ChunkingView';
import { ClassificationView } from './src/components/ClassificationView';
import { NovelAnalyzerView } from './src/components/NovelAnalyzerView';
import { ComprehensiveAnalysisView } from './src/components/ComprehensiveAnalysisView';
import { BookOpen, Sparkles, ScanText, FileJson, Scissors, Tag, BookText, Database } from 'lucide-react';

type Tab = 'ocr' | 'parser' | 'chunker' | 'classifier' | 'novel-analyzer' | 'comprehensive';

const App: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<Tab>('ocr');

  // State for Settings
  const [settings, setSettings] = useState<ProcessingSettings>({
    removeDiacritics: true,
    removeTatweel: true,
    normalizeLamAlef: true,
    ocrEngine: 'gemini-flash',
    ocrQuality: 'standard',
    directPdfExtraction: false,
    // Default Advanced Settings
    agenticPlus: true, // Enabled by default as requested
    invalidateCache: false,
    specializedChartParsingAgentic: false,
    preserveVerySmallText: false
  });

  // State for Files
  const [files, setFiles] = useState<ExtractedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // State for Pipeline Data Flow
  const [lastParsedStructure, setLastParsedStructure] = useState<NovelStructure | null>(null);
  const [lastChunkingResult, setLastChunkingResult] = useState<ChunkingResult | null>(null);
  const [enrichedChunks, setEnrichedChunks] = useState<EnrichedChunk[]>([]);
  const [lastNovelMetadata, setLastNovelMetadata] = useState<NovelMetadataResult | null>(null);

  const handleUpdateSettings = (key: keyof ProcessingSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleFilesSelected = async (newFiles: File[]) => {
    if (isProcessing) return;

    // Create queue items
    const queueItems: ExtractedFile[] = newFiles.map(f => ({
      id: Math.random().toString(36).substring(7),
      name: f.name,
      originalSize: f.size,
      status: 'pending',
      extractedText: '',
    }));

    // Add to state (prepend)
    setFiles(prev => [...queueItems, ...prev]);
    setIsProcessing(true);

    // Process files sequentially
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const id = queueItems[i].id;

      setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'processing' } : f));

      const startTime = performance.now();
      try {
        const text = await extractArabicText(file, settings);
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000;
        const words = text.split(/\s+/).length;

        setFiles(prev => prev.map(f => f.id === id ? { 
          ...f, 
          status: 'completed', 
          extractedText: text,
          processingTime: duration,
          wordCount: words
        } : f));

      } catch (error: any) {
        setFiles(prev => prev.map(f => f.id === id ? { 
          ...f, 
          status: 'error', 
          errorMsg: error.message || 'فشل في استخراج النص' 
        } : f));
      }
    }

    setIsProcessing(false);
  };

  // Helper to get text from latest completed file
  const getLastExtractedText = () => {
    const completed = files.find(f => f.status === 'completed');
    return completed ? completed.extractedText : '';
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      {/* Navbar */}
      <header className="bg-indigo-700 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg border border-indigo-500">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">مستخرج ومحلل النصوص العربي</h1>
              <p className="text-indigo-200 text-xs md:text-sm opacity-90">Arabic Text Suite (Extractor & Parser)</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs bg-indigo-800 py-1 px-3 rounded-full border border-indigo-600 text-indigo-200">
             <Sparkles className="w-3 h-3 text-yellow-400" />
             <span>Powered by Gemini 2.5</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="container mx-auto px-4 flex gap-1 mt-2 overflow-x-auto">
           <button 
             onClick={() => setActiveTab('ocr')}
             className={`flex-1 md:flex-none md:w-40 py-3 rounded-t-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap px-4 ${
               activeTab === 'ocr' 
               ? 'bg-slate-50 text-indigo-700 border-t-4 border-indigo-400' 
               : 'bg-indigo-800/50 text-indigo-100 hover:bg-indigo-600'
             }`}
           >
             <ScanText className="w-4 h-4" />
             1. الاستخراج
           </button>
           <button 
             onClick={() => setActiveTab('parser')}
             className={`flex-1 md:flex-none md:w-40 py-3 rounded-t-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap px-4 ${
               activeTab === 'parser' 
               ? 'bg-slate-50 text-indigo-700 border-t-4 border-indigo-400' 
               : 'bg-indigo-800/50 text-indigo-100 hover:bg-indigo-600'
             }`}
           >
             <FileJson className="w-4 h-4" />
             2. التحليل
           </button>
           <button 
             onClick={() => setActiveTab('chunker')}
             className={`flex-1 md:flex-none md:w-40 py-3 rounded-t-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap px-4 ${
               activeTab === 'chunker' 
               ? 'bg-slate-50 text-indigo-700 border-t-4 border-indigo-400' 
               : 'bg-indigo-800/50 text-indigo-100 hover:bg-indigo-600'
             }`}
           >
             <Scissors className="w-4 h-4" />
             3. التقطيع
           </button>
           <button 
             onClick={() => setActiveTab('classifier')}
             className={`flex-1 md:flex-none md:w-40 py-3 rounded-t-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap px-4 ${
               activeTab === 'classifier' 
               ? 'bg-slate-50 text-indigo-700 border-t-4 border-indigo-400' 
               : 'bg-indigo-800/50 text-indigo-100 hover:bg-indigo-600'
             }`}
           >
             <Tag className="w-4 h-4" />
             4. التصنيف
           </button>
           <button 
             onClick={() => setActiveTab('novel-analyzer')}
             className={`flex-1 md:flex-none md:w-40 py-3 rounded-t-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap px-4 ${
               activeTab === 'novel-analyzer' 
               ? 'bg-slate-50 text-indigo-700 border-t-4 border-indigo-400' 
               : 'bg-indigo-800/50 text-indigo-100 hover:bg-indigo-600'
             }`}
           >
             <BookText className="w-4 h-4" />
             5. تحليل الرواية
           </button>
           <button 
             onClick={() => setActiveTab('comprehensive')}
             className={`flex-1 md:flex-none md:w-40 py-3 rounded-t-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap px-4 ${
               activeTab === 'comprehensive' 
               ? 'bg-slate-50 text-indigo-700 border-t-4 border-indigo-400' 
               : 'bg-indigo-800/50 text-indigo-100 hover:bg-indigo-600'
             }`}
           >
             <Database className="w-4 h-4" />
             6. التحليل الشامل
           </button>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-5xl py-8">
        {activeTab === 'ocr' && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="mb-6 text-slate-600 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <p>
                <strong>الخطوة الأولى:</strong> استخدم هذه الأداة لاستخراج النصوص من ملفات PDF أو الصور وتنظيفها باستخدام Gemini AI.
              </p>
            </div>

            <SettingsPanel settings={settings} onUpdate={handleUpdateSettings} />
            <UploadZone onFilesSelected={handleFilesSelected} isProcessing={isProcessing} />

            <div className="space-y-6">
              {files.map(file => (
                <ResultCard key={file.id} file={file} />
              ))}
            </div>
            
            {files.length === 0 && (
              <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                 لا توجد ملفات معالجة حالياً
              </div>
            )}
          </div>
        )}

        {activeTab === 'parser' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="mb-6 text-slate-600 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <p>
                <strong>الخطوة الثانية:</strong> تحويل النص الخام إلى هيكل JSON منظم (فصول، حوار، سرد، شعر).
              </p>
            </div>
            <ParserView 
              initialText={getLastExtractedText()} 
              onParseComplete={(structure) => setLastParsedStructure(structure)}
            />
          </div>
        )}

        {activeTab === 'chunker' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="mb-6 text-slate-600 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <p>
                <strong>الخطوة الثالثة:</strong> تقطيع الهيكل المنظم إلى وحدات صغيرة (Chunks) جاهزة لـ RAG أو Embedding.
              </p>
            </div>
            {/* The Chunker now receives data from the Parser and outputs to state for the Classifier */}
            <ChunkingView 
              initialInput={lastParsedStructure} 
              onChunkingComplete={(result: any) => setLastChunkingResult(result)}
            />
           </div>
        )}

        {activeTab === 'classifier' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="mb-6 text-slate-600 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <p>
                <strong>الخطوة الرابعة:</strong> تصنيف المقاطع (لهجات، مشاعر) وإثرائها (أسئلة، تعليل) باستخدام ذكاء اصطناعي هجين (محاكاة).
              </p>
            </div>
            <ClassificationView 
                inputChunks={lastChunkingResult} 
                enrichedResults={enrichedChunks}
                onResultsUpdate={setEnrichedChunks}
            />
           </div>
        )}

        {activeTab === 'novel-analyzer' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="mb-6 text-slate-600 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <p>
                <strong>الخطوة الخامسة:</strong> تحليل نص الرواية العربية واستخراج بيانات شاملة (المؤلف، الشخصيات، الحبكة، السياق الثقافي، الجوائز) بتنسيق JSON منظم.
              </p>
            </div>
            <NovelAnalyzerView 
                initialText={getLastExtractedText()} 
                onAnalysisComplete={(result) => setLastNovelMetadata(result)}
            />
           </div>
        )}

        {activeTab === 'comprehensive' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="mb-6 text-slate-600 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <p>
                <strong>الخطوة السادسة (الشاملة):</strong> تحليل متكامل للرواية يجمع كل العناصر: البيانات الوصفية، الشخصيات، الحوارات، أحداث الحبكة، الأماكن، والسياق الثقافي. يتم تصدير كل شيء بصيغة JSONL للتدريب.
              </p>
            </div>
            <ComprehensiveAnalysisView 
                initialText={getLastExtractedText()} 
            />
           </div>
        )}
      </main>
    </div>
  );
};

export default App;

import React, { useState, useEffect } from 'react';
import { ProcessingSettings, ExtractedFile, NovelStructure, ChunkingResult, EnrichedChunk, NovelMetadataResult } from './types';
import { extractArabicText, extractArabicTextWithSmartBatching } from './services/geminiService';
import { ParsingService } from '../services/parserService'; // Added import
import { chunker } from './chunking/index'; // Added import
import { SettingsPanel } from './components/SettingsPanel';
import { UploadZone } from './components/UploadZone';
import { ResultCard } from './components/ResultCard';
import { ParserView } from './components/ParserView';
import { ChunkingView } from './components/ChunkingView';
import { ClassificationView } from './components/ClassificationView';
import { NovelAnalyzerView } from './components/NovelAnalyzerView';
import { ArchivingView, ProjectState } from './components/ArchivingView';
import { IndexingView } from './components/IndexingView';
import { ImageStudioView } from './components/ImageStudioView';
import { ResearchView } from './components/ResearchView';
<<<<<<< HEAD
import { DatasetManagerView } from './components/DatasetManagerView';
import { TextConversionView } from './components/TextConversionView';
import { BookOpen, Sparkles, ScanText, FileJson, Scissors, Tag, Archive, Database, Moon, Sun, BookText, Image, Globe, FolderOpen, FileText } from 'lucide-react';

type Tab = 'ocr' | 'parser' | 'chunker' | 'classifier' | 'indexing' | 'archiving' | 'novel-analyzer' | 'images' | 'research' | 'datasets' | 'text-export';
=======
import { VerificationView } from './components/VerificationView';
import { convertPdfToImages } from './services/pdfToImageService';
import { BookOpen, Sparkles, ScanText, FileJson, Scissors, Tag, Archive, Database, Moon, Sun, BookText, Image, Globe, CheckSquare } from 'lucide-react';

type Tab = 'ocr' | 'verification' | 'parser' | 'chunker' | 'classifier' | 'indexing' | 'archiving' | 'novel-analyzer' | 'images' | 'research';
>>>>>>> 0c90ff251e7c572ef83423c7b1a71c1d8dd3948d

const App: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<Tab>('ocr');

  // Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) {
        return saved === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true; 
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // State for Settings
  const [settings, setSettings] = useState<ProcessingSettings>({
    removeDiacritics: true,
    removeTatweel: true,
    normalizeLamAlef: true,
    ocrEngine: 'gemini-flash',
    ocrQuality: 'standard',
    directPdfExtraction: false,
    customRegexRules: [], // Custom regex rules for advanced text cleaning
    agenticPlus: true,
    invalidateCache: false,
    specializedChartParsingAgentic: false,
    preserveVerySmallText: false,
    correctOcrErrors: true, // Enable OCR error correction by default
    imagePreprocessing: true,
    preprocessingPreset: 'standard',
    enableSmartBatching: true,  // Enable smart batching by default
    batchSize: undefined,        // Auto-calculate
    maxConcurrentBatches: 3      // Default concurrency
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

    const queueItems: ExtractedFile[] = newFiles.map(f => ({
      id: Math.random().toString(36).substring(7),
      name: f.name,
      originalSize: f.size,
      status: 'pending',
      extractedText: '',
      progress: 0,
      currentStep: 'In Queue',
      originalFile: f,
      isPDF: f.type === 'application/pdf'
    }));

    setFiles(prev => [...queueItems, ...prev]);
    setIsProcessing(true);

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const id = queueItems[i].id;
      
      // Initial Processing Estimate (30s baseline for OCR)
      let estimatedTime = 30;

      // Helper to update file state
      const updateFileState = (updates: Partial<ExtractedFile>) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
      };

      updateFileState({ 
        status: 'processing', 
        currentStep: 'OCR Extraction', 
        progress: 10,
        estimatedRemainingTime: estimatedTime
      });

      const startTime = performance.now();

      try {
        // --- STEP 1: OCR with Smart Batching ---
        let text = '';
        let batchMetadata = null;

        // Check if it's a PDF and use smart batching if enabled
        if (file.type === 'application/pdf' && settings.enableSmartBatching !== false) {
          const result = await extractArabicTextWithSmartBatching(
            file,
            settings,
            (progress) => {
              // Update progress during batch processing
              const overallProgress = 10 + (progress.percentage * 0.4); // OCR is 10-50% of total
              updateFileState({
                progress: overallProgress,
                currentStep: `معالجة الدفعة ${progress.batchNumber}/${progress.totalBatches}`,
                batchProgress: {
                  currentBatch: progress.batchNumber,
                  totalBatches: progress.totalBatches,
                  successfulBatches: progress.status === 'completed' ? progress.batchNumber : progress.batchNumber - 1,
                  failedBatches: progress.status === 'error' ? 1 : 0,
                  processingMode: 'batched'
                }
              });
            }
          );

          text = result.extractedText;
          batchMetadata = result.metadata;

          console.log('Smart Batching Results:', {
            mode: batchMetadata.processingMode,
            totalBatches: batchMetadata.totalBatches,
            successful: batchMetadata.successfulBatches,
            failed: batchMetadata.failedBatches,
            avgTime: batchMetadata.averageTimePerBatch.toFixed(2) + 'ms'
          });
        } else {
          // Use standard extraction for non-PDF or small files
          text = await extractArabicText(file, settings);
        }

        // Update estimate based on text length (approx word count / speed)
        const wordCount = text.split(/\s+/).length;
        estimatedTime = Math.max(5, wordCount / 500); // Heuristic

        updateFileState({
          extractedText: text,
          wordCount: wordCount,
          currentStep: 'Parsing Structure',
          progress: 50, // Jump to 50%
          estimatedRemainingTime: 2 // Parsing is fast
        });

        // --- STEP 2: PARSING ---
        // Automatically run parsing to prepare for export/downstream tasks
        const parseConfig = {
            max_sentence_words: 150,
            detect_poetry: true,
            detect_quran: true
        };
        const parsedStructure = await ParsingService.parseNovel(text, file.name, parseConfig);
        
        // Set global app state if it's the latest file
        setLastParsedStructure(parsedStructure);

        updateFileState({ 
          parsedData: parsedStructure,
          currentStep: 'Semantic Chunking',
          progress: 80,
          estimatedRemainingTime: 1
        });

        // --- STEP 3: CHUNKING ---
        // Automatically run chunking
        const chunkResult = chunker.run({
            novel_metadata: parsedStructure.novel_metadata,
            chapters: parsedStructure.chapters
        });
        
        setLastChunkingResult(chunkResult);

        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000;

        // --- STEP 4: PDF TO IMAGES (for verification) ---
        let pdfPages = undefined;
        if (file.type === 'application/pdf') {
          try {
            updateFileState({
              currentStep: 'Converting PDF to Images',
              progress: 95,
              estimatedRemainingTime: 1
            });
            pdfPages = await convertPdfToImages(file, 1.5);
            console.log(`Converted ${pdfPages.length} PDF pages to images`);
          } catch (error: any) {
            console.warn('Failed to convert PDF to images:', error);
            // Don't fail the whole process if PDF conversion fails
          }
        }

        updateFileState({
          chunkingResult: chunkResult,
          pdfPages: pdfPages,
          status: 'completed',
          currentStep: 'Completed',
          progress: 100,
          processingTime: duration,
          estimatedRemainingTime: 0
        });

      } catch (error: any) {
        updateFileState({ 
          status: 'error', 
          errorMsg: error.message || 'فشل في استخراج النص',
          currentStep: 'Failed',
          progress: 0
        });
      }
    }

    setIsProcessing(false);
  };

  const handleRestoreProject = (project: ProjectState) => {
    setFiles(project.files);
    setLastParsedStructure(project.structure);
    setLastChunkingResult(project.chunks);
    setEnrichedChunks(project.enriched);
    setActiveTab('ocr');
  };

  const getLastExtractedText = () => {
    const completed = files.find(f => f.status === 'completed');
    return completed ? completed.extractedText : '';
  };

  return (
    <div className={`min-h-screen pb-20 transition-colors duration-300 ${darkMode ? 'bg-[#0A0A0F] text-white' : 'bg-slate-50 text-slate-900'} selection:bg-primary/30`}>
      <header className={`backdrop-blur-md border-b sticky top-0 z-50 transition-colors duration-300 ${
        darkMode ? 'bg-surface/80 border-subtle' : 'bg-white/80 border-slate-200'
      }`}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${darkMode ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-indigo-100 border-indigo-200 text-indigo-700'}`}>
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">مستخرج ومحلل النصوص العربي</h1>
              <p className={`text-xs md:text-sm opacity-90 ${darkMode ? 'text-textMuted' : 'text-slate-500'}`}>Arabic Text Suite (Extractor & Parser)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`hidden md:flex items-center gap-2 text-xs py-1 px-3 rounded-full border ${
              darkMode ? 'bg-background/50 border-subtle text-lavender' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
               <Sparkles className={`w-3 h-3 ${darkMode ? 'text-secondary' : 'text-indigo-500'}`} />
               <span>Powered by Gemini 2.5</span>
            </div>
            
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg border transition-all ${
                darkMode 
                  ? 'bg-white/5 border-subtle text-yellow-400 hover:bg-white/10' 
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="container mx-auto px-4 flex gap-1 mt-2 overflow-x-auto no-scrollbar">
<<<<<<< HEAD
           {['ocr', 'parser', 'chunker', 'classifier', 'novel-analyzer', 'datasets', 'text-export', 'images', 'research', 'indexing', 'archiving'].map((tab) => {
=======
           {['ocr', 'verification', 'parser', 'chunker', 'classifier', 'novel-analyzer', 'images', 'research', 'indexing', 'archiving'].map((tab) => {
>>>>>>> 0c90ff251e7c572ef83423c7b1a71c1d8dd3948d
             const isActive = activeTab === tab;
             return (
               <button
                  key={tab}
                  onClick={() => setActiveTab(tab as Tab)}
                  className={`flex-1 md:flex-none md:w-32 py-3 rounded-t-lg font-medium text-xs flex items-center justify-center gap-2 transition-all whitespace-nowrap px-4 border-t-2 ${
                    isActive
                    ? darkMode
                      ? 'bg-background border-primary text-primary'
                      : 'bg-slate-50 border-indigo-500 text-indigo-700'
                    : darkMode
                      ? 'bg-surface/50 border-transparent text-textMuted hover:bg-surface hover:text-white'
                      : 'bg-slate-200/50 border-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                  }`}
               >
                  {tab === 'ocr' && <ScanText className="w-4 h-4" />}
                  {tab === 'verification' && <CheckSquare className="w-4 h-4" />}
                  {tab === 'parser' && <FileJson className="w-4 h-4" />}
                  {tab === 'chunker' && <Scissors className="w-4 h-4" />}
                  {tab === 'classifier' && <Tag className="w-4 h-4" />}
                  {tab === 'novel-analyzer' && <BookText className="w-4 h-4" />}
                  {tab === 'datasets' && <FolderOpen className="w-4 h-4" />}
                  {tab === 'text-export' && <FileText className="w-4 h-4" />}
                  {tab === 'images' && <Image className="w-4 h-4" />}
                  {tab === 'research' && <Globe className="w-4 h-4" />}
                  {tab === 'indexing' && <Database className="w-4 h-4" />}
                  {tab === 'archiving' && <Archive className="w-4 h-4" />}

                  {tab === 'ocr' && '1. الاستخراج'}
<<<<<<< HEAD
                  {tab === 'parser' && '2. التحليل'}
                  {tab === 'chunker' && '3. التقطيع'}
                  {tab === 'classifier' && '4. التصنيف'}
                  {tab === 'novel-analyzer' && '5. الرواية'}
                  {tab === 'datasets' && '6. البيانات'}
                  {tab === 'text-export' && '7. TXT'}
                  {tab === 'images' && '8. الصور'}
                  {tab === 'research' && '9. البحث'}
                  {tab === 'indexing' && '10. الفهرسة'}
                  {tab === 'archiving' && '11. الأرشفة'}
=======
                  {tab === 'verification' && '2. التدقيق'}
                  {tab === 'parser' && '3. التحليل'}
                  {tab === 'chunker' && '4. التقطيع'}
                  {tab === 'classifier' && '5. التصنيف'}
                  {tab === 'novel-analyzer' && '6. الرواية'}
                  {tab === 'images' && '7. الصور'}
                  {tab === 'research' && '8. البحث'}
                  {tab === 'indexing' && '9. الفهرسة'}
                  {tab === 'archiving' && '10. الأرشفة'}
>>>>>>> 0c90ff251e7c572ef83423c7b1a71c1d8dd3948d
               </button>
             );
           })}
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-5xl py-8">
        {activeTab === 'ocr' && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <div className={`mb-6 p-4 rounded-lg shadow-sm ${darkMode ? 'glass-panel text-textMuted' : 'bg-white border border-slate-200 text-slate-600'}`}>
              <p>
                <strong className={darkMode ? 'text-white' : 'text-slate-900'}>الخطوة الأولى:</strong> 
                استخدم هذه الأداة لاستخراج النصوص من ملفات PDF أو الصور. 
                <br/>
                <span className="text-xs opacity-70 mt-1 block">
                  سيقوم النظام تلقائياً بتشغيل: الاستخراج (OCR) ← التحليل (Parsing) ← التقطيع (Chunking).
                </span>
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
              <div className={`text-center py-12 border-2 border-dashed rounded-xl ${
                darkMode ? 'text-textMuted border-subtle bg-surface/30' : 'text-slate-400 border-slate-200 bg-white'
              }`}>
                 لا توجد ملفات معالجة حالياً
              </div>
            )}
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className={`mb-6 p-4 rounded-lg shadow-sm ${darkMode ? 'glass-panel text-textMuted' : 'bg-white border border-slate-200 text-slate-600'}`}>
              <p>
                <strong className={darkMode ? 'text-white' : 'text-slate-900'}>الخطوة الثانية:</strong> مراجعة النص المستخرج مع الصفحة الأصلية للتأكد من دقة الاستخراج.
              </p>
            </div>
            <VerificationView files={files} />
          </div>
        )}

        {activeTab === 'parser' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className={`mb-6 p-4 rounded-lg shadow-sm ${darkMode ? 'glass-panel text-textMuted' : 'bg-white border border-slate-200 text-slate-600'}`}>
              <p>
                <strong className={darkMode ? 'text-white' : 'text-slate-900'}>الخطوة الثالثة:</strong> معاينة وتعديل الهيكل المنظم (فصول، حوار، سرد).
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
             <div className={`mb-6 p-4 rounded-lg shadow-sm ${darkMode ? 'glass-panel text-textMuted' : 'bg-white border border-slate-200 text-slate-600'}`}>
              <p>
                <strong className={darkMode ? 'text-white' : 'text-slate-900'}>الخطوة الرابعة:</strong> مراجعة استراتيجية التقطيع (Chunks) قبل الفهرسة.
              </p>
            </div>
            <ChunkingView 
              initialInput={lastParsedStructure} 
              onChunkingComplete={(result: any) => setLastChunkingResult(result)}
            />
           </div>
        )}

        {activeTab === 'classifier' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className={`mb-6 p-4 rounded-lg shadow-sm ${darkMode ? 'glass-panel text-textMuted' : 'bg-white border border-slate-200 text-slate-600'}`}>
              <p>
                <strong className={darkMode ? 'text-white' : 'text-slate-900'}>الخطوة الخامسة:</strong> تصنيف المقاطع (لهجات، مشاعر) وإثرائها (أسئلة، تعليل) باستخدام ذكاء اصطناعي هجين.
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
             <div className={`mb-6 p-4 rounded-lg shadow-sm ${darkMode ? 'glass-panel text-textMuted' : 'bg-white border border-slate-200 text-slate-600'}`}>
              <p>
                <strong className={darkMode ? 'text-white' : 'text-slate-900'}>الخطوة السادسة:</strong> تحليل نص الرواية العربية واستخراج بيانات شاملة.
              </p>
            </div>
            <NovelAnalyzerView 
                initialText={getLastExtractedText()} 
                onAnalysisComplete={(result) => setLastNovelMetadata(result)}
            />
           </div>
        )}

        {activeTab === 'datasets' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className={`mb-6 p-4 rounded-lg shadow-sm ${darkMode ? 'glass-panel text-textMuted' : 'bg-white border border-slate-200 text-slate-600'}`}>
              <p>
                <strong className={darkMode ? 'text-white' : 'text-slate-900'}>إدارة البيانات:</strong> استيراد وتصدير وتحليل مجموعات البيانات (الشخصيات، الحوارات، الأحداث، الأماكن).
              </p>
            </div>
            <DatasetManagerView />
           </div>
        )}

        {activeTab === 'text-export' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className={`mb-6 p-4 rounded-lg shadow-sm ${darkMode ? 'glass-panel text-textMuted' : 'bg-white border border-slate-200 text-slate-600'}`}>
              <p>
                <strong className={darkMode ? 'text-white' : 'text-slate-900'}>تحويل النصوص:</strong> تحويل الروايات إلى ملفات TXT بأفضل جودة عربية مع تنظيف النصوص والمعالجة المتقدمة (إزالة التشكيل، توحيد الأحرف، معالجة الأرقام).
              </p>
            </div>
            <TextConversionView darkMode={darkMode} />
           </div>
        )}

        {activeTab === 'images' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className={`mb-6 p-4 rounded-lg shadow-sm ${darkMode ? 'glass-panel text-textMuted' : 'bg-white border border-slate-200 text-slate-600'}`}>
              <p>
                <strong className={darkMode ? 'text-white' : 'text-slate-900'}>الخطوة السابعة:</strong> ستوديو الصور. تحليل الصور وتعديلها باستخدام أوامر نصية.
              </p>
            </div>
            <ImageStudioView />
           </div>
        )}

        {activeTab === 'research' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className={`mb-6 p-4 rounded-lg shadow-sm ${darkMode ? 'glass-panel text-textMuted' : 'bg-white border border-slate-200 text-slate-600'}`}>
              <p>
                <strong className={darkMode ? 'text-white' : 'text-slate-900'}>الخطوة الثامنة:</strong> البحث الذكي. احصل على إجابات موثقة من الويب.
              </p>
            </div>
            <ResearchView />
           </div>
        )}
        
        {activeTab === 'indexing' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className={`mb-6 p-4 rounded-lg shadow-sm ${darkMode ? 'glass-panel text-textMuted' : 'bg-white border border-slate-200 text-slate-600'}`}>
              <p>
                <strong className={darkMode ? 'text-white' : 'text-slate-900'}>الخطوة التاسعة:</strong> إنشاء فهرس دلالي (Vector Index) باستخدام Qdrant.
              </p>
            </div>
            <IndexingView 
                enrichedChunks={enrichedChunks}
                files={files}
            />
           </div>
        )}

        {activeTab === 'archiving' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className={`mb-6 p-4 rounded-lg shadow-sm ${darkMode ? 'glass-panel text-textMuted' : 'bg-white border border-slate-200 text-slate-600'}`}>
              <p>
                <strong className={darkMode ? 'text-white' : 'text-slate-900'}>الخطوة العاشرة:</strong> حفظ المشروع محلياً أو تصديره للمشاركة.
              </p>
            </div>
            <ArchivingView 
                currentFiles={files}
                currentStructure={lastParsedStructure}
                currentChunks={lastChunkingResult}
                currentEnriched={enrichedChunks}
                onRestore={handleRestoreProject}
            />
           </div>
        )}
      </main>
    </div>
  );
};

export default App;

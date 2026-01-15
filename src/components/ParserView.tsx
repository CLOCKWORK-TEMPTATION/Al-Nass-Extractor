
import React, { useState } from 'react';
import { NovelStructure, ParserConfig } from '../types';
import { ParsingService } from '../../services/parserService';
import { FileJson, PieChart, Layers, Download, Play, BookOpen } from 'lucide-react';

interface ParserViewProps {
  initialText: string;
  onParseComplete?: (structure: NovelStructure) => void;
}

export const ParserView: React.FC<ParserViewProps> = ({ initialText, onParseComplete }) => {
  const [inputText, setInputText] = useState(initialText);
  const [result, setResult] = useState<NovelStructure | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  
  const [config, setConfig] = useState<ParserConfig>({
    max_sentence_words: 150,
    detect_poetry: true,
    detect_quran: true
  });

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setIsParsing(true);
    try {
      const structure = await ParsingService.parseNovel(inputText, "Novel Draft", config);
      setResult(structure);
      if (onParseComplete) {
        onParseComplete(structure);
      }
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء التحليل");
    } finally {
      setIsParsing(false);
    }
  };

  const downloadJson = () => {
    if (!result) return;
    const jsonString = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `${result.novel_metadata.title}_structure.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Input Section */}
      <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200 dark:border-subtle p-6 transition-colors duration-300 glass-panel-adapter">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-primary" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">المحلل الهيكلي (Structural Parser)</h2>
          </div>
          <div className="flex gap-2">
             <button
               onClick={handleParse}
               disabled={isParsing || !inputText}
               className="bg-indigo-600 dark:bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 dark:hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-lg shadow-indigo-200 dark:shadow-primary/20"
             >
               {isParsing ? 'جاري التحليل...' : (
                 <>
                   <Play className="w-4 h-4" fill="currentColor" />
                   بدء التحليل
                 </>
               )}
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
           <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-textMuted bg-slate-50 dark:bg-input p-3 rounded border border-slate-200 dark:border-subtle">
             <input 
               type="checkbox" 
               checked={config.detect_poetry} 
               onChange={e => setConfig({...config, detect_poetry: e.target.checked})}
               className="w-4 h-4 text-indigo-600 dark:accent-primary rounded"
             />
             <span>اكتشاف الشعر</span>
           </label>
           <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-textMuted bg-slate-50 dark:bg-input p-3 rounded border border-slate-200 dark:border-subtle">
             <input 
               type="checkbox" 
               checked={config.detect_quran} 
               onChange={e => setConfig({...config, detect_quran: e.target.checked})}
               className="w-4 h-4 text-indigo-600 dark:accent-primary rounded"
             />
             <span>اكتشاف القرآن</span>
           </label>
           <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-textMuted bg-slate-50 dark:bg-input p-3 rounded border border-slate-200 dark:border-subtle">
             <span>أقصى طول للجملة:</span>
             <input 
               type="number" 
               value={config.max_sentence_words}
               onChange={e => setConfig({...config, max_sentence_words: parseInt(e.target.value) || 150})}
               className="w-20 p-1 border rounded text-center bg-white dark:bg-surface dark:border-subtle dark:text-white"
             />
           </div>
        </div>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="ضع النص الكامل للرواية هنا..."
          className="w-full h-64 p-4 text-slate-800 dark:text-white text-base leading-relaxed bg-slate-50 dark:bg-input border border-slate-200 dark:border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-primary font-arabic resize-y"
          style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}
        />
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-card p-4 rounded-xl border border-slate-200 dark:border-subtle shadow-sm glass-panel-adapter">
              <div className="text-xs text-slate-500 dark:text-textMuted mb-1">نسبة السرد</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{result.statistics.narration_percentage.toFixed(1)}%</div>
            </div>
            <div className="bg-white dark:bg-card p-4 rounded-xl border border-slate-200 dark:border-subtle shadow-sm glass-panel-adapter">
              <div className="text-xs text-slate-500 dark:text-textMuted mb-1">نسبة الحوار</div>
              <div className="text-2xl font-bold text-green-600 dark:text-secondary">{result.statistics.dialogue_percentage.toFixed(1)}%</div>
            </div>
            <div className="bg-white dark:bg-card p-4 rounded-xl border border-slate-200 dark:border-subtle shadow-sm glass-panel-adapter">
              <div className="text-xs text-slate-500 dark:text-textMuted mb-1">عدد الفصول</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-primary">{result.novel_metadata.total_chapters}</div>
            </div>
            <div className="bg-white dark:bg-card p-4 rounded-xl border border-slate-200 dark:border-subtle shadow-sm glass-panel-adapter">
              <div className="text-xs text-slate-500 dark:text-textMuted mb-1">أبيات الشعر</div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">{result.statistics.poetry_count}</div>
            </div>
          </div>

          {/* Detailed View */}
          <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200 dark:border-subtle overflow-hidden glass-panel-adapter">
            <div className="bg-slate-50 dark:bg-surface/50 px-6 py-4 border-b border-slate-200 dark:border-subtle flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileJson className="w-5 h-5 text-indigo-600 dark:text-primary" />
                النتيجة المهيكلة (JSON)
              </h3>
              <button 
                onClick={downloadJson}
                className="text-sm bg-white dark:bg-surface border border-slate-300 dark:border-subtle px-3 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-1 text-slate-700 dark:text-textMuted dark:hover:text-white"
              >
                <Download className="w-4 h-4" />
                تحميل JSON
              </button>
            </div>
            <div className="p-0">
               <div className="h-96 overflow-y-auto p-4 bg-slate-900 text-slate-300 dark:text-lavender font-mono text-sm" dir="ltr">
                 <pre>{JSON.stringify(result, null, 2)}</pre>
               </div>
            </div>
          </div>

           {/* Visual Preview of First Chapter */}
           {result.chapters.length > 0 && (
             <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200 dark:border-subtle p-6 glass-panel-adapter">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600 dark:text-primary" />
                  معاينة الفصل الأول
                </h3>
                <div className="space-y-3">
                   <h4 className="font-bold text-center text-xl mb-6 bg-slate-100 dark:bg-surface/50 dark:border dark:border-subtle py-2 rounded text-slate-800 dark:text-white">{result.chapters[0].title}</h4>
                   {result.chapters[0].segments.slice(0, 10).map((seg) => (
                     <div key={seg.segment_id} className={`p-3 rounded-lg border-r-4 ${
                       seg.type === 'dialogue' ? 'bg-green-50 dark:bg-secondary/5 border-green-400 dark:border-secondary mr-8' :
                       seg.type === 'poetry' ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-400 dark:border-amber-500 text-center italic text-slate-800 dark:text-amber-100' :
                       seg.type === 'quran' ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-600 dark:border-emerald-500 font-bold text-center text-slate-900 dark:text-emerald-100' :
                       'bg-slate-50 dark:bg-input border-blue-400'
                     }`}>
                        <div className="text-[10px] uppercase text-slate-400 dark:text-textMuted mb-1 tracking-wider flex justify-between">
                          <span>{seg.type}</span>
                          <span>ID: {seg.segment_id}</span>
                        </div>
                        <p className="text-slate-800 dark:text-white/90">{seg.text}</p>
                     </div>
                   ))}
                   {result.chapters[0].segments.length > 10 && (
                     <p className="text-center text-slate-400 dark:text-textMuted italic mt-4">... تم عرض أول 10 مقاطع فقط للمعاينة ...</p>
                   )}
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

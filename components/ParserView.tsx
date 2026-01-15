

import React, { useState } from 'react';
import { NovelStructure, ParserConfig } from '../types';
import { ParsingService } from '../services/parserService';
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">المحلل الهيكلي (Structural Parser)</h2>
          </div>
          <div className="flex gap-2">
             <button
               onClick={handleParse}
               disabled={isParsing || !inputText}
               className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
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
           <label className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
             <input 
               type="checkbox" 
               checked={config.detect_poetry} 
               onChange={e => setConfig({...config, detect_poetry: e.target.checked})}
               className="w-4 h-4 text-indigo-600 rounded"
             />
             <span>اكتشاف الشعر</span>
           </label>
           <label className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
             <input 
               type="checkbox" 
               checked={config.detect_quran} 
               onChange={e => setConfig({...config, detect_quran: e.target.checked})}
               className="w-4 h-4 text-indigo-600 rounded"
             />
             <span>اكتشاف القرآن</span>
           </label>
           <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
             <span>أقصى طول للجملة:</span>
             <input 
               type="number" 
               value={config.max_sentence_words}
               onChange={e => setConfig({...config, max_sentence_words: parseInt(e.target.value) || 150})}
               className="w-20 p-1 border rounded text-center"
             />
           </div>
        </div>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="ضع النص الكامل للرواية هنا..."
          className="w-full h-64 p-4 text-slate-800 text-base leading-relaxed bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-arabic resize-y"
          style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}
        />
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 mb-1">نسبة السرد</div>
              <div className="text-2xl font-bold text-blue-600">{result.statistics.narration_percentage.toFixed(1)}%</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 mb-1">نسبة الحوار</div>
              <div className="text-2xl font-bold text-green-600">{result.statistics.dialogue_percentage.toFixed(1)}%</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 mb-1">عدد الفصول</div>
              <div className="text-2xl font-bold text-purple-600">{result.novel_metadata.total_chapters}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 mb-1">أبيات الشعر</div>
              <div className="text-2xl font-bold text-amber-600">{result.statistics.poetry_count}</div>
            </div>
          </div>

          {/* Detailed View */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileJson className="w-5 h-5 text-indigo-600" />
                النتيجة المهيكلة (JSON)
              </h3>
              <button 
                onClick={downloadJson}
                className="text-sm bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50 flex items-center gap-1 text-slate-700"
              >
                <Download className="w-4 h-4" />
                تحميل JSON
              </button>
            </div>
            <div className="p-0">
               <div className="h-96 overflow-y-auto p-4 bg-slate-900 text-slate-300 font-mono text-sm" dir="ltr">
                 <pre>{JSON.stringify(result, null, 2)}</pre>
               </div>
            </div>
          </div>

           {/* Visual Preview of First Chapter */}
           {result.chapters.length > 0 && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  معاينة الفصل الأول
                </h3>
                <div className="space-y-3">
                   <h4 className="font-bold text-center text-xl mb-6 bg-slate-100 py-2 rounded">{result.chapters[0].title}</h4>
                   {result.chapters[0].segments.slice(0, 10).map((seg) => (
                     <div key={seg.segment_id} className={`p-3 rounded-lg border-r-4 ${
                       seg.type === 'dialogue' ? 'bg-green-50 border-green-400 mr-8' :
                       seg.type === 'poetry' ? 'bg-amber-50 border-amber-400 text-center italic' :
                       seg.type === 'quran' ? 'bg-emerald-50 border-emerald-600 font-bold text-center' :
                       'bg-slate-50 border-blue-400'
                     }`}>
                        <div className="text-[10px] uppercase text-slate-400 mb-1 tracking-wider flex justify-between">
                          <span>{seg.type}</span>
                          <span>ID: {seg.segment_id}</span>
                        </div>
                        <p className="text-slate-800">{seg.text}</p>
                     </div>
                   ))}
                   {result.chapters[0].segments.length > 10 && (
                     <p className="text-center text-slate-400 italic mt-4">... تم عرض أول 10 مقاطع فقط للمعاينة ...</p>
                   )}
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

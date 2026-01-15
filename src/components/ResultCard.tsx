
import React, { useState } from 'react';
import { ExtractedFile } from '../types';
import { FileText, Loader2, CheckCircle, AlertCircle, Copy, Download, FileJson, FileType as FileIcon } from 'lucide-react';

interface ResultCardProps {
  file: ExtractedFile;
}

export const ResultCard: React.FC<ResultCardProps> = ({ file }) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(file.extractedText);
  };

  const handleDownloadTxt = () => {
    const element = document.createElement("a");
    const fileBlob = new Blob([file.extractedText], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(fileBlob);
    element.download = `${file.name.split('.')[0]}_extracted.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setShowExportMenu(false);
  };

  const handleDownloadJson = () => {
    const exportData = {
      meta: {
        filename: file.name,
        original_size: file.originalSize,
        processed_at: new Date().toISOString(),
        processing_time: file.processingTime,
        pipeline_status: file.status
      },
      content: {
        text: file.extractedText,
        structure: file.parsedData || null,
        chunks: file.chunkingResult || null
      }
    };

    const element = document.createElement("a");
    const fileBlob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json;charset=utf-8'});
    element.href = URL.createObjectURL(fileBlob);
    element.download = `${file.name.split('.')[0]}_full_data.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setShowExportMenu(false);
  };

  return (
    <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200 dark:border-subtle overflow-visible mb-4 transition-colors duration-300 glass-panel-adapter relative">
      {/* Header */}
      <div className="bg-slate-50 dark:bg-surface/50 px-6 py-4 border-b border-slate-200 dark:border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-input p-2 rounded shadow-sm border border-slate-100 dark:border-subtle">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-primary" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white text-sm">{file.name}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-textMuted">
               <span>{(file.originalSize / 1024).toFixed(1)} KB</span>
               {file.processingTime && <span>• {file.processingTime.toFixed(2)}s</span>}
               {file.wordCount && <span>• {file.wordCount} كلمة</span>}
               {file.extractionMethod && (
                 <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                   file.extractionMethod === 'local'
                     ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                     : file.extractionMethod === 'ocr'
                     ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                     : 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400'
                 }`}>
                   {file.extractionMethod === 'local' ? '⚡ Local' : file.extractionMethod === 'ocr' ? '🔍 OCR' : '🔀 Hybrid'}
                 </span>
               )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {file.status === 'processing' && (
             <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 rounded-full text-xs font-medium flex items-center gap-1 dark:border dark:border-blue-500/20">
                <Loader2 className="w-3 h-3 animate-spin" /> {file.currentStep || 'جاري المعالجة'}
             </span>
          )}
          {file.status === 'completed' && (
             <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-secondary/10 dark:text-secondary rounded-full text-xs font-medium flex items-center gap-1 dark:border dark:border-secondary/20">
                <CheckCircle className="w-3 h-3" /> مكتمل
             </span>
          )}
          {file.status === 'error' && (
             <span className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 rounded-full text-xs font-medium flex items-center gap-1 dark:border dark:border-red-500/20">
                <AlertCircle className="w-3 h-3" /> خطأ
             </span>
          )}
        </div>
      </div>

      {/* Progress Bar (Visible only during processing) */}
      {file.status === 'processing' && (
        <div className="w-full h-1 bg-slate-100 dark:bg-input">
          <div 
            className="h-full bg-indigo-500 dark:bg-primary transition-all duration-300 ease-out relative overflow-hidden"
            style={{ width: `${file.progress || 0}%` }}
          >
            <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {file.status === 'processing' && (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 dark:text-textMuted gap-4">
             <div className="relative">
               <Loader2 className="w-10 h-10 animate-spin text-indigo-400 dark:text-primary" />
               <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-600 dark:text-white">
                 {file.progress || 0}%
               </span>
             </div>
             <div className="text-center">
               <p className="text-sm font-medium text-slate-600 dark:text-white mb-1">{file.currentStep}...</p>
               {file.estimatedRemainingTime && (
                 <p className="text-xs text-slate-400 dark:text-textMuted/70">
                   الوقت المتبقي المتوقع: {Math.ceil(file.estimatedRemainingTime)} ثانية
                 </p>
               )}
             </div>
          </div>
        )}

        {file.status === 'error' && (
          <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded border border-red-100 dark:border-red-500/20 text-sm">
            {file.errorMsg || 'حدث خطأ غير متوقع أثناء الاستخراج.'}
          </div>
        )}

        {file.status === 'completed' && (
          <>
            {/* Quality Metrics Panel */}
            {file.qualityMetrics && (
              <div className="mb-4 p-3 bg-slate-50 dark:bg-surface/50 rounded-lg border border-slate-200 dark:border-subtle">
                <div className="text-xs font-semibold text-slate-700 dark:text-white mb-2">📊 مقاييس الجودة (Hybrid Router)</div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-slate-500 dark:text-textMuted">كثافة النص</div>
                    <div className="font-bold text-slate-700 dark:text-white">{file.qualityMetrics.textDensity.toFixed(0)} حرف/صفحة</div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-textMuted">نسبة الأخطاء</div>
                    <div className="font-bold text-slate-700 dark:text-white">{(file.qualityMetrics.garbageRatio * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-textMuted">نسبة العربية</div>
                    <div className="font-bold text-slate-700 dark:text-white">{(file.qualityMetrics.arabicRatio * 100).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-subtle text-xs text-slate-600 dark:text-textMuted">
                  <span className="font-medium">القرار:</span> {file.qualityMetrics.reason}
                </div>
              </div>
            )}

            <div className="relative group">
              <textarea 
               readOnly 
               value={file.extractedText}
               className="w-full h-64 p-4 text-slate-800 dark:text-white text-lg leading-relaxed bg-slate-50 dark:bg-input border border-slate-200 dark:border-subtle rounded-lg focus:outline-none resize-y font-arabic scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-primary/50 scrollbar-track-transparent"
               style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}
            />
            
            {/* Action Buttons Overlay */}
            <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button 
                onClick={handleCopy}
                className="p-2 bg-white dark:bg-surface text-slate-600 dark:text-textMuted hover:text-indigo-600 dark:hover:text-primary rounded shadow border border-slate-200 dark:border-subtle transition-colors" 
                title="نسخ النص"
               >
                 <Copy className="w-4 h-4" />
               </button>
               
               {/* Export Dropdown */}
               <div className="relative">
                 <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-2 bg-white dark:bg-surface text-slate-600 dark:text-textMuted hover:text-indigo-600 dark:hover:text-primary rounded shadow border border-slate-200 dark:border-subtle transition-colors flex items-center gap-1" 
                  title="تصدير"
                 >
                   <Download className="w-4 h-4" />
                 </button>
                 
                 {showExportMenu && (
                   <div className="absolute top-full left-0 mt-2 w-40 bg-white dark:bg-surface rounded-lg shadow-xl border border-slate-200 dark:border-subtle z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                     <button 
                       onClick={handleDownloadTxt}
                       className="w-full px-4 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 text-slate-700 dark:text-white"
                     >
                       <FileIcon className="w-3 h-3" />
                       Text File (.txt)
                     </button>
                     <button 
                       onClick={handleDownloadJson}
                       className="w-full px-4 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 text-slate-700 dark:text-white border-t border-slate-100 dark:border-subtle"
                     >
                       <FileJson className="w-3 h-3" />
                       Full Data (.json)
                     </button>
                   </div>
                 )}
               </div>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
};

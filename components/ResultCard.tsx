import React from 'react';
import { ExtractedFile } from '../types';
import { FileText, Loader2, CheckCircle, AlertCircle, Copy, Download } from 'lucide-react';

interface ResultCardProps {
  file: ExtractedFile;
}

export const ResultCard: React.FC<ResultCardProps> = ({ file }) => {
  
  const handleCopy = () => {
    navigator.clipboard.writeText(file.extractedText);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const fileBlob = new Blob([file.extractedText], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(fileBlob);
    element.download = `${file.name.split('.')[0]}_extracted.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
      {/* Header */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded shadow-sm border border-slate-100">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">{file.name}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-500">
               <span>{(file.originalSize / 1024).toFixed(1)} KB</span>
               {file.processingTime && <span>• {file.processingTime.toFixed(2)}s</span>}
               {file.wordCount && <span>• {file.wordCount} كلمة</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {file.status === 'processing' && (
             <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> جاري المعالجة
             </span>
          )}
          {file.status === 'completed' && (
             <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> مكتمل
             </span>
          )}
          {file.status === 'error' && (
             <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> خطأ
             </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {file.status === 'processing' && (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-3">
             <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
             <p className="text-sm">يقوم Gemini بتحليل النص وتنظيفه...</p>
          </div>
        )}

        {file.status === 'error' && (
          <div className="p-4 bg-red-50 text-red-700 rounded border border-red-100 text-sm">
            {file.errorMsg || 'حدث خطأ غير متوقع أثناء الاستخراج.'}
          </div>
        )}

        {file.status === 'completed' && (
          <div className="relative group">
            <textarea 
               readOnly 
               value={file.extractedText}
               className="w-full h-64 p-4 text-slate-800 text-lg leading-relaxed bg-slate-50 border border-slate-200 rounded-lg focus:outline-none resize-y font-arabic"
               style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}
            />
            <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button 
                onClick={handleCopy}
                className="p-2 bg-white text-slate-600 hover:text-indigo-600 rounded shadow border border-slate-200" title="نسخ النص">
                 <Copy className="w-4 h-4" />
               </button>
               <button 
                onClick={handleDownload}
                className="p-2 bg-white text-slate-600 hover:text-indigo-600 rounded shadow border border-slate-200" title="تحميل ملف txt">
                 <Download className="w-4 h-4" />
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { ProcessingSettings } from '../types';
import { Settings, Check, Type, FileText, AlignJustify, Zap, Star, FileSearch, Info, Bot, Activity, TableProperties, ZoomIn } from 'lucide-react';

interface SettingsPanelProps {
  settings: ProcessingSettings;
  onUpdate: (key: keyof ProcessingSettings, value: any) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <Settings className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-slate-800">إعدادات المعالجة (Config)</h2>
      </div>

      <div className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
        مستوى دقة التحليل (OCR Model)
        <Info className="w-3 h-3 text-slate-400" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Standard Quality */}
        <div 
          onClick={() => onUpdate('ocrQuality', 'standard')}
          className={`relative cursor-pointer border rounded-lg p-4 flex items-start gap-3 transition-all group ${
            settings.ocrQuality === 'standard' ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'
          }`}
        >
          <div className={`mt-1 p-2 rounded-full transition-colors ${settings.ocrQuality === 'standard' ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300'}`}>
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">جودة قياسية (Standard)</h3>
              {settings.ocrQuality === 'standard' && <Check className="w-4 h-4 text-indigo-600" />}
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              يعتمد على نموذج <strong>Gemini 3 Flash</strong>. مثالي للمستندات الواضحة والسرعة العالية.
            </p>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-green-600 font-medium">
              <span>⚡ سرعة عالية (Fast & Cost-effective)</span>
            </div>
          </div>
        </div>

        {/* High Quality */}
        <div 
          onClick={() => onUpdate('ocrQuality', 'high')}
          className={`relative cursor-pointer border rounded-lg p-4 flex items-start gap-3 transition-all group ${
            settings.ocrQuality === 'high' ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'
          }`}
        >
          <div className={`mt-1 p-2 rounded-full transition-colors ${settings.ocrQuality === 'high' ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300'}`}>
            <Star className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">جودة فائقة (High)</h3>
              {settings.ocrQuality === 'high' && <Check className="w-4 h-4 text-indigo-600" />}
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              يعتمد على نموذج <strong>Gemini 3 Pro</strong>. أدق في التعامل مع الخطوط اليدوية، التخطيطات المعقدة، أو الصور المشوشة.
            </p>
             <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-600 font-medium">
              <span>🐢 دقة أعلى (Slower, Higher Precision)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">خيارات الاستخراج والتنظيف</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Direct PDF Extraction Toggle */}
        <div 
          onClick={() => onUpdate('directPdfExtraction', !settings.directPdfExtraction)}
          className={`cursor-pointer border rounded-lg p-4 flex items-start gap-3 transition-all md:col-span-2 ${
            settings.directPdfExtraction ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'
          }`}
        >
          <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${
             settings.directPdfExtraction ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
          }`}>
            {settings.directPdfExtraction && <Check className="w-3 h-3 text-white" />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-slate-500" />
              استخراج مباشر للنص (Direct PDF Text)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              تجاوز الـ OCR لملفات PDF التي تحتوي على نص رقمي قابل للتحديد. <span className="text-red-500 font-medium">لا يعمل مع الصور الممسوحة ضوئياً.</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Remove Diacritics */}
        <div 
          onClick={() => onUpdate('removeDiacritics', !settings.removeDiacritics)}
          className={`cursor-pointer border rounded-lg p-4 flex items-start gap-3 transition-all ${
            settings.removeDiacritics ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'
          }`}
        >
          <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${
             settings.removeDiacritics ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
          }`}>
            {settings.removeDiacritics && <Check className="w-3 h-3 text-white" />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Type className="w-4 h-4 text-slate-500" />
              إزالة التشكيل
            </h3>
            <p className="text-xs text-slate-500 mt-1">حذف الفتحة، الضمة، الكسرة...</p>
          </div>
        </div>

        {/* Remove Tatweel */}
        <div 
          onClick={() => onUpdate('removeTatweel', !settings.removeTatweel)}
          className={`cursor-pointer border rounded-lg p-4 flex items-start gap-3 transition-all ${
            settings.removeTatweel ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'
          }`}
        >
          <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${
             settings.removeTatweel ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
          }`}>
            {settings.removeTatweel && <Check className="w-3 h-3 text-white" />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <AlignJustify className="w-4 h-4 text-slate-500" />
              إزالة التطويل
            </h3>
            <p className="text-xs text-slate-500 mt-1">حذف المد (مثل: بــــــسم)</p>
          </div>
        </div>

        {/* Normalize Lam Alef */}
        <div 
          onClick={() => onUpdate('normalizeLamAlef', !settings.normalizeLamAlef)}
          className={`cursor-pointer border rounded-lg p-4 flex items-start gap-3 transition-all ${
            settings.normalizeLamAlef ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'
          }`}
        >
          <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${
             settings.normalizeLamAlef ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
          }`}>
            {settings.normalizeLamAlef && <Check className="w-3 h-3 text-white" />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              توحيد اللام ألف
            </h3>
            <p className="text-xs text-slate-500 mt-1">توحيد أشكال الهمزات واللام ألف</p>
          </div>
        </div>
      </div>

      <div className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-t border-slate-100 pt-4 flex items-center gap-1">
         خيارات متقدمة (Advanced Flags)
         <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded">PRO</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {/* Agentic Plus */}
         <div 
          onClick={() => onUpdate('agenticPlus', !settings.agenticPlus)}
          className={`cursor-pointer border rounded-lg p-3 flex flex-col gap-2 transition-all ${
            settings.agenticPlus ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'
          }`}
        >
          <div className="flex justify-between items-start">
            <Bot className="w-4 h-4 text-slate-500" />
            <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
               settings.agenticPlus ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
            }`}>
              {settings.agenticPlus && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-xs">Agentic Plus</h3>
            <p className="text-[10px] text-slate-500 mt-1">تفعيل الاستدلال المتقدم للتخطيطات المعقدة.</p>
          </div>
        </div>

        {/* Specialized Chart Parsing */}
        <div 
          onClick={() => onUpdate('specializedChartParsingAgentic', !settings.specializedChartParsingAgentic)}
          className={`cursor-pointer border rounded-lg p-3 flex flex-col gap-2 transition-all ${
            settings.specializedChartParsingAgentic ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'
          }`}
        >
          <div className="flex justify-between items-start">
             <TableProperties className="w-4 h-4 text-slate-500" />
            <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
               settings.specializedChartParsingAgentic ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
            }`}>
              {settings.specializedChartParsingAgentic && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-xs">Chart Parsing</h3>
            <p className="text-[10px] text-slate-500 mt-1">تحليل متخصص للجداول والمخططات.</p>
          </div>
        </div>

        {/* Preserve Very Small Text */}
        <div 
          onClick={() => onUpdate('preserveVerySmallText', !settings.preserveVerySmallText)}
          className={`cursor-pointer border rounded-lg p-3 flex flex-col gap-2 transition-all ${
            settings.preserveVerySmallText ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'
          }`}
        >
           <div className="flex justify-between items-start">
            <ZoomIn className="w-4 h-4 text-slate-500" />
            <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
               settings.preserveVerySmallText ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
            }`}>
              {settings.preserveVerySmallText && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-xs">Small Text</h3>
            <p className="text-[10px] text-slate-500 mt-1">الحفاظ على الهوامش والنصوص الدقيقة.</p>
          </div>
        </div>

        {/* Invalidate Cache */}
        <div 
          onClick={() => onUpdate('invalidateCache', !settings.invalidateCache)}
          className={`cursor-pointer border rounded-lg p-3 flex flex-col gap-2 transition-all ${
            settings.invalidateCache ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'
          }`}
        >
          <div className="flex justify-between items-start">
             <Activity className="w-4 h-4 text-slate-500" />
            <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
               settings.invalidateCache ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
            }`}>
              {settings.invalidateCache && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-xs">Invalidate Cache</h3>
            <p className="text-[10px] text-slate-500 mt-1">تجاوز التخزين المؤقت (فرض تحليل جديد).</p>
          </div>
        </div>
      </div>
    </div>
  );
};

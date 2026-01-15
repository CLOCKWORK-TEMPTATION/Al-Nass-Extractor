
import React from 'react';
import { ProcessingSettings, CustomRegexRule } from '../types';
import { Settings, Check, Type, FileText, AlignJustify, Zap, Star, FileSearch, Info, Bot, Activity, TableProperties, ZoomIn, Wand2, ImagePlus, Sparkles, Layers, Gauge } from 'lucide-react';
import { RegexRuleEditor } from './RegexRuleEditor';

interface SettingsPanelProps {
  settings: ProcessingSettings;
  onUpdate: (key: keyof ProcessingSettings, value: any) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate }) => {
  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-subtle rounded-xl shadow-sm p-6 mb-8 transition-colors duration-300 glass-panel-adapter">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-subtle pb-3">
        <Settings className="w-5 h-5 text-indigo-600 dark:text-primary" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">إعدادات المعالجة (Config)</h2>
      </div>

      <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-textMuted uppercase tracking-wider flex items-center gap-1">
        مستوى دقة التحليل (OCR Model)
        <Info className="w-3 h-3 text-slate-400 dark:text-textMuted" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Standard Quality */}
        <div 
          onClick={() => onUpdate('ocrQuality', 'standard')}
          className={`relative cursor-pointer border rounded-lg p-4 flex items-start gap-3 transition-all group ${
            settings.ocrQuality === 'standard' 
              ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200 dark:bg-primary/10 dark:border-primary dark:ring-primary/30' 
              : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-input dark:border-subtle dark:hover:bg-white/5'
          }`}
        >
          <div className={`mt-1 p-2 rounded-full transition-colors ${
            settings.ocrQuality === 'standard' 
              ? 'bg-indigo-200 text-indigo-700 dark:bg-primary dark:text-white' 
              : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300 dark:bg-white/10 dark:text-textMuted dark:group-hover:bg-white/20'
          }`}>
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 dark:text-white">جودة قياسية (Standard)</h3>
              {settings.ocrQuality === 'standard' && <Check className="w-4 h-4 text-indigo-600 dark:text-primary" />}
            </div>
            <p className="text-xs text-slate-500 dark:text-textMuted mt-1 leading-relaxed">
              يعتمد على نموذج <strong>Gemini 3 Flash</strong>. مثالي للمستندات الواضحة والسرعة العالية.
            </p>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-green-600 dark:text-secondary font-medium">
              <span>⚡ سرعة عالية (Fast & Cost-effective)</span>
            </div>
          </div>
        </div>

        {/* High Quality */}
        <div 
          onClick={() => onUpdate('ocrQuality', 'high')}
          className={`relative cursor-pointer border rounded-lg p-4 flex items-start gap-3 transition-all group ${
            settings.ocrQuality === 'high' 
              ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200 dark:bg-primary/10 dark:border-primary dark:ring-primary/30' 
              : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-input dark:border-subtle dark:hover:bg-white/5'
          }`}
        >
          <div className={`mt-1 p-2 rounded-full transition-colors ${
            settings.ocrQuality === 'high' 
              ? 'bg-indigo-200 text-indigo-700 dark:bg-primary dark:text-white' 
              : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300 dark:bg-white/10 dark:text-textMuted dark:group-hover:bg-white/20'
          }`}>
            <Star className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 dark:text-white">جودة فائقة (High)</h3>
              {settings.ocrQuality === 'high' && <Check className="w-4 h-4 text-indigo-600 dark:text-primary" />}
            </div>
            <p className="text-xs text-slate-500 dark:text-textMuted mt-1 leading-relaxed">
              يعتمد على نموذج <strong>Gemini 3 Pro</strong>. أدق في التعامل مع الخطوط اليدوية، التخطيطات المعقدة، أو الصور المشوشة.
            </p>
             <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-500 font-medium">
              <span>🐢 دقة أعلى (Slower, Higher Precision)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-textMuted uppercase tracking-wider">خيارات الاستخراج والتنظيف</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Direct PDF Extraction Toggle */}
        <div 
          onClick={() => onUpdate('directPdfExtraction', !settings.directPdfExtraction)}
          className={`cursor-pointer border rounded-lg p-4 flex items-start gap-3 transition-all md:col-span-2 ${
            settings.directPdfExtraction 
              ? 'bg-indigo-50 border-indigo-200 dark:bg-primary/10 dark:border-primary' 
              : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-input dark:border-subtle dark:hover:bg-white/5'
          }`}
        >
          <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${
             settings.directPdfExtraction 
               ? 'bg-indigo-600 border-indigo-600 dark:bg-primary dark:border-primary' 
               : 'bg-white border-slate-300 dark:bg-transparent dark:border-textMuted'
          }`}>
            {settings.directPdfExtraction && <Check className="w-3 h-3 text-white" />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-slate-500 dark:text-textMuted" />
              استخراج مباشر للنص (Direct PDF Text)
            </h3>
            <p className="text-xs text-slate-500 dark:text-textMuted mt-1">
              تجاوز الـ OCR لملفات PDF التي تحتوي على نص رقمي قابل للتحديد. <span className="text-red-500 dark:text-red-400 font-medium">لا يعمل مع الصور الممسوحة ضوئياً.</span>
            </p>
          </div>
        </div>

        {/* Hybrid Mode Info */}
        <div className="md:col-span-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 border border-purple-200 dark:border-purple-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-1">🔀 الوضع الهجين الذكي (Hybrid Smart Router)</h3>
              <p className="text-xs text-purple-700 dark:text-purple-400 leading-relaxed">
                النظام يعمل الآن بوضع هجين ذكي تلقائياً لجميع ملفات PDF:
              </p>
              <ul className="text-xs text-purple-600 dark:text-purple-400 mt-2 space-y-1 list-disc list-inside">
                <li>يحاول الاستخراج المحلي أولاً (سريع ومجاني)</li>
                <li>يقيس جودة النص: كثافة النص، نسبة الأخطاء، نسبة الأحرف العربية</li>
                <li>إذا كان النص نظيفاً → يستخدمه مباشرة ✅</li>
                <li>إذا كان النص مشوهاً → يحول الصفحات لصور ويرسلها لـ Gemini OCR 🔍</li>
              </ul>
              <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-500/30">
                <p className="text-[10px] text-purple-600 dark:text-purple-500 font-medium">
                  💡 الفائدة: توفير التكلفة، تسريع العملية، وحل مشكلة النصوص العربية المقلوبة أو المتقطعة في PDFs القديمة
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Remove Diacritics */}
        <div
          onClick={() => onUpdate('removeDiacritics', !settings.removeDiacritics)}
          className={`cursor-pointer border rounded-lg p-4 flex items-start gap-3 transition-all ${
            settings.removeDiacritics
              ? 'bg-indigo-50 border-indigo-200 dark:bg-primary/10 dark:border-primary'
              : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-input dark:border-subtle dark:hover:bg-white/5'
          }`}
        >
          <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${
             settings.removeDiacritics
               ? 'bg-indigo-600 border-indigo-600 dark:bg-primary dark:border-primary'
               : 'bg-white border-slate-300 dark:bg-transparent dark:border-textMuted'
          }`}>
            {settings.removeDiacritics && <Check className="w-3 h-3 text-white" />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Type className="w-4 h-4 text-slate-500 dark:text-textMuted" />
              إزالة التشكيل
            </h3>
            <p className="text-xs text-slate-500 dark:text-textMuted mt-1">حذف الفتحة، الضمة، الكسرة...</p>
          </div>
        </div>

        {/* Remove Tatweel */}
        <div
          onClick={() => onUpdate('removeTatweel', !settings.removeTatweel)}
          className={`cursor-pointer border rounded-lg p-4 flex items-start gap-3 transition-all ${
            settings.removeTatweel
              ? 'bg-indigo-50 border-indigo-200 dark:bg-primary/10 dark:border-primary'
              : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-input dark:border-subtle dark:hover:bg-white/5'
          }`}
        >
          <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${
             settings.removeTatweel
               ? 'bg-indigo-600 border-indigo-600 dark:bg-primary dark:border-primary'
               : 'bg-white border-slate-300 dark:bg-transparent dark:border-textMuted'
          }`}>
            {settings.removeTatweel && <Check className="w-3 h-3 text-white" />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <AlignJustify className="w-4 h-4 text-slate-500 dark:text-textMuted" />
              إزالة التطويل
            </h3>
            <p className="text-xs text-slate-500 dark:text-textMuted mt-1">حذف المد (مثل: بــــــسم)</p>
          </div>
        </div>

        {/* Normalize Lam Alef */}
        <div
          onClick={() => onUpdate('normalizeLamAlef', !settings.normalizeLamAlef)}
          className={`cursor-pointer border rounded-lg p-4 flex items-start gap-3 transition-all ${
            settings.normalizeLamAlef
              ? 'bg-indigo-50 border-indigo-200 dark:bg-primary/10 dark:border-primary'
              : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-input dark:border-subtle dark:hover:bg-white/5'
          }`}
        >
          <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${
             settings.normalizeLamAlef
               ? 'bg-indigo-600 border-indigo-600 dark:bg-primary dark:border-primary'
               : 'bg-white border-slate-300 dark:bg-transparent dark:border-textMuted'
          }`}>
            {settings.normalizeLamAlef && <Check className="w-3 h-3 text-white" />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500 dark:text-textMuted" />
              توحيد اللام ألف
            </h3>
            <p className="text-xs text-slate-500 dark:text-textMuted mt-1">توحيد أشكال الهمزات واللام ألف</p>
          </div>
        </div>

        {/* Correct OCR Errors - NEW */}
        <div
          onClick={() => onUpdate('correctOcrErrors', !settings.correctOcrErrors)}
          className={`cursor-pointer border rounded-lg p-4 flex items-start gap-3 transition-all ${
            settings.correctOcrErrors
              ? 'bg-indigo-50 border-indigo-200 dark:bg-primary/10 dark:border-primary'
              : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-input dark:border-subtle dark:hover:bg-white/5'
          }`}
        >
          <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${
             settings.correctOcrErrors
               ? 'bg-indigo-600 border-indigo-600 dark:bg-primary dark:border-primary'
               : 'bg-white border-slate-300 dark:bg-transparent dark:border-textMuted'
          }`}>
            {settings.correctOcrErrors && <Check className="w-3 h-3 text-white" />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-slate-500 dark:text-textMuted" />
              تصحيح أخطاء OCR
            </h3>
            <p className="text-xs text-slate-500 dark:text-textMuted mt-1">تصحيح الأخطاء الشائعة: ى/ي، ه/ة، الهمزات</p>
          </div>
        </div>
      </div>

      {/* Image Preprocessing Section */}
      <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-textMuted uppercase tracking-wider border-t border-slate-100 dark:border-subtle pt-4 flex items-center gap-1">
        <ImagePlus className="w-3 h-3" />
        معالجة الصور قبل OCR (Image Preprocessing)
      </div>

      {/* Enable Preprocessing Toggle */}
      <div className="mb-4">
        <div
          onClick={() => onUpdate('imagePreprocessing', !settings.imagePreprocessing)}
          className={`cursor-pointer border rounded-lg p-4 flex items-start gap-3 transition-all ${
            settings.imagePreprocessing
              ? 'bg-indigo-50 border-indigo-200 dark:bg-primary/10 dark:border-primary'
              : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-input dark:border-subtle dark:hover:bg-white/5'
          }`}
        >
          <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${
            settings.imagePreprocessing
              ? 'bg-indigo-600 border-indigo-600 dark:bg-primary dark:border-primary'
              : 'bg-white border-slate-300 dark:bg-transparent dark:border-textMuted'
          }`}>
            {settings.imagePreprocessing && <Check className="w-3 h-3 text-white" />}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-500 dark:text-textMuted" />
              تفعيل معالجة الصور
            </h3>
            <p className="text-xs text-slate-500 dark:text-textMuted mt-1">
              تطبيق فلاتر على الصور قبل إرسالها للـ OCR لتحسين دقة استخراج النصوص العربية (خاصة الممسوحة ضوئياً).
            </p>
          </div>
        </div>
      </div>

      {/* Preprocessing Presets - Only show if preprocessing is enabled */}
      {settings.imagePreprocessing && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {/* None Preset */}
          <div
            onClick={() => onUpdate('preprocessingPreset', 'none')}
            className={`cursor-pointer border rounded-lg p-3 flex flex-col gap-2 transition-all ${
              settings.preprocessingPreset === 'none'
                ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200 dark:bg-primary/10 dark:border-primary dark:ring-primary/30'
                : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-input dark:border-subtle dark:hover:bg-white/5'
            }`}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-slate-800 dark:text-white text-sm">بدون</h3>
              {settings.preprocessingPreset === 'none' && <Check className="w-4 h-4 text-indigo-600 dark:text-primary" />}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-textMuted">الصورة الأصلية بدون معالجة</p>
          </div>

          {/* Basic Preset */}
          <div
            onClick={() => onUpdate('preprocessingPreset', 'basic')}
            className={`cursor-pointer border rounded-lg p-3 flex flex-col gap-2 transition-all ${
              settings.preprocessingPreset === 'basic'
                ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200 dark:bg-primary/10 dark:border-primary dark:ring-primary/30'
                : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-input dark:border-subtle dark:hover:bg-white/5'
            }`}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-slate-800 dark:text-white text-sm">بسيط</h3>
              {settings.preprocessingPreset === 'basic' && <Check className="w-4 h-4 text-indigo-600 dark:text-primary" />}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-textMuted">تحويل لـ Grayscale فقط</p>
          </div>

          {/* Standard Preset */}
          <div
            onClick={() => onUpdate('preprocessingPreset', 'standard')}
            className={`cursor-pointer border rounded-lg p-3 flex flex-col gap-2 transition-all ${
              settings.preprocessingPreset === 'standard'
                ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200 dark:bg-primary/10 dark:border-primary dark:ring-primary/30'
                : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-input dark:border-subtle dark:hover:bg-white/5'
            }`}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-slate-800 dark:text-white text-sm">قياسي</h3>
              {settings.preprocessingPreset === 'standard' && <Check className="w-4 h-4 text-indigo-600 dark:text-primary" />}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-textMuted">
              Grayscale + Binarization + Deskewing
            </p>
            <span className="text-[9px] text-green-600 dark:text-green-400 font-medium">✓ موصى به</span>
          </div>

          {/* Aggressive Preset */}
          <div
            onClick={() => onUpdate('preprocessingPreset', 'aggressive')}
            className={`cursor-pointer border rounded-lg p-3 flex flex-col gap-2 transition-all ${
              settings.preprocessingPreset === 'aggressive'
                ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200 dark:bg-primary/10 dark:border-primary dark:ring-primary/30'
                : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-input dark:border-subtle dark:hover:bg-white/5'
            }`}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-slate-800 dark:text-white text-sm">متقدم</h3>
              {settings.preprocessingPreset === 'aggressive' && <Check className="w-4 h-4 text-indigo-600 dark:text-primary" />}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-textMuted">
              كل الفلاتر + Denoise + تعديل التباين
            </p>
            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">⚠️ للصور المشوشة جداً</span>
          </div>
        </div>
      )}

      <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-textMuted uppercase tracking-wider border-t border-slate-100 dark:border-subtle pt-4 flex items-center gap-1">
         معالجة ملفات PDF الضخمة (Smart Batching)
         <span className="text-[10px] text-slate-400 dark:text-secondary bg-green-50 dark:bg-secondary/10 dark:border dark:border-secondary/20 px-1 rounded">NEW</span>
      </div>
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-lg">
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          <strong>Smart Batching</strong> يقوم بتقسيم ملفات PDF الكبيرة (أكثر من 50 صفحة أو 10MB) تلقائياً إلى دفعات صغيرة،
          ومعالجتها بشكل متوازٍ مع مراعاة حدود API. هذا يحسن الدقة ويمنع فشل المعالجة للروايات الطويلة.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Enable Smart Batching */}
        <div
          onClick={() => onUpdate('enableSmartBatching', !settings.enableSmartBatching)}
          className={`cursor-pointer border rounded-lg p-4 flex items-start gap-3 transition-all ${
            settings.enableSmartBatching
              ? 'bg-green-50 border-green-200 dark:bg-secondary/10 dark:border-secondary'
              : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-input dark:border-subtle dark:hover:bg-white/5'
          }`}
        >
          <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${
             settings.enableSmartBatching
               ? 'bg-green-600 border-green-600 dark:bg-secondary dark:border-secondary'
               : 'bg-white border-slate-300 dark:bg-transparent dark:border-textMuted'
          }`}>
            {settings.enableSmartBatching && <Check className="w-3 h-3 text-white" />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-500 dark:text-textMuted" />
              تفعيل Smart Batching
            </h3>
            <p className="text-xs text-slate-500 dark:text-textMuted mt-1">
              معالجة تلقائية بالدفعات للملفات الكبيرة
            </p>
          </div>
        </div>

        {/* Batch Size */}
        <div className="border rounded-lg p-4 bg-slate-50 dark:bg-input dark:border-subtle">
          <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-slate-500 dark:text-textMuted" />
            حجم الدفعة
          </h3>
          <input
            type="number"
            min="5"
            max="50"
            value={settings.batchSize || ''}
            placeholder="تلقائي (Auto)"
            onChange={(e) => onUpdate('batchSize', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full p-2 border rounded text-sm bg-white dark:bg-surface dark:border-subtle dark:text-white"
            disabled={!settings.enableSmartBatching}
          />
          <p className="text-xs text-slate-500 dark:text-textMuted mt-1">
            عدد الصفحات لكل دفعة (5-50). اترك فارغاً للحساب التلقائي.
          </p>
        </div>

        {/* Max Concurrent Batches */}
        <div className="border rounded-lg p-4 bg-slate-50 dark:bg-input dark:border-subtle">
          <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-slate-500 dark:text-textMuted" />
            التوازي
          </h3>
          <input
            type="number"
            min="1"
            max="5"
            value={settings.maxConcurrentBatches || 3}
            onChange={(e) => onUpdate('maxConcurrentBatches', parseInt(e.target.value) || 3)}
            className="w-full p-2 border rounded text-sm bg-white dark:bg-surface dark:border-subtle dark:text-white"
            disabled={!settings.enableSmartBatching}
          />
          <p className="text-xs text-slate-500 dark:text-textMuted mt-1">
            عدد الدفعات المعالجة في نفس الوقت (1-5). القيمة الافتراضية: 3
          </p>
        </div>
      </div>

      <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-textMuted uppercase tracking-wider border-t border-slate-100 dark:border-subtle pt-4 flex items-center gap-1">
         خيارات متقدمة (Advanced Flags)
         <span className="text-[10px] text-slate-400 dark:text-primary bg-slate-100 dark:bg-primary/10 dark:border dark:border-primary/20 px-1 rounded">PRO</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {/* Agentic Plus */}
         <div 
          onClick={() => onUpdate('agenticPlus', !settings.agenticPlus)}
          className={`cursor-pointer border rounded-lg p-3 flex flex-col gap-2 transition-all ${
            settings.agenticPlus 
              ? 'bg-indigo-50 border-indigo-200 dark:bg-primary/10 dark:border-primary' 
              : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-input dark:border-subtle dark:hover:bg-white/5'
          }`}
        >
          <div className="flex justify-between items-start">
            <Bot className="w-4 h-4 text-slate-500 dark:text-textMuted" />
            <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
               settings.agenticPlus 
                 ? 'bg-indigo-600 border-indigo-600 dark:bg-primary dark:border-primary' 
                 : 'bg-white border-slate-300 dark:bg-transparent dark:border-textMuted'
            }`}>
              {settings.agenticPlus && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white text-xs">Agentic Plus</h3>
            <p className="text-[10px] text-slate-500 dark:text-textMuted mt-1">تفعيل الاستدلال المتقدم للتخطيطات المعقدة.</p>
          </div>
        </div>

        {/* Specialized Chart Parsing */}
        <div 
          onClick={() => onUpdate('specializedChartParsingAgentic', !settings.specializedChartParsingAgentic)}
          className={`cursor-pointer border rounded-lg p-3 flex flex-col gap-2 transition-all ${
            settings.specializedChartParsingAgentic 
              ? 'bg-indigo-50 border-indigo-200 dark:bg-primary/10 dark:border-primary' 
              : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-input dark:border-subtle dark:hover:bg-white/5'
          }`}
        >
          <div className="flex justify-between items-start">
             <TableProperties className="w-4 h-4 text-slate-500 dark:text-textMuted" />
            <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
               settings.specializedChartParsingAgentic 
                 ? 'bg-indigo-600 border-indigo-600 dark:bg-primary dark:border-primary' 
                 : 'bg-white border-slate-300 dark:bg-transparent dark:border-textMuted'
            }`}>
              {settings.specializedChartParsingAgentic && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white text-xs">Chart Parsing</h3>
            <p className="text-[10px] text-slate-500 dark:text-textMuted mt-1">تحليل متخصص للجداول والمخططات.</p>
          </div>
        </div>

        {/* Preserve Very Small Text */}
        <div 
          onClick={() => onUpdate('preserveVerySmallText', !settings.preserveVerySmallText)}
          className={`cursor-pointer border rounded-lg p-3 flex flex-col gap-2 transition-all ${
            settings.preserveVerySmallText 
              ? 'bg-indigo-50 border-indigo-200 dark:bg-primary/10 dark:border-primary' 
              : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-input dark:border-subtle dark:hover:bg-white/5'
          }`}
        >
           <div className="flex justify-between items-start">
            <ZoomIn className="w-4 h-4 text-slate-500 dark:text-textMuted" />
            <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
               settings.preserveVerySmallText 
                 ? 'bg-indigo-600 border-indigo-600 dark:bg-primary dark:border-primary' 
                 : 'bg-white border-slate-300 dark:bg-transparent dark:border-textMuted'
            }`}>
              {settings.preserveVerySmallText && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white text-xs">Small Text</h3>
            <p className="text-[10px] text-slate-500 dark:text-textMuted mt-1">الحفاظ على الهوامش والنصوص الدقيقة.</p>
          </div>
        </div>

        {/* Invalidate Cache */}
        <div
          onClick={() => onUpdate('invalidateCache', !settings.invalidateCache)}
          className={`cursor-pointer border rounded-lg p-3 flex flex-col gap-2 transition-all ${
            settings.invalidateCache
              ? 'bg-indigo-50 border-indigo-200 dark:bg-primary/10 dark:border-primary'
              : 'bg-slate-50 border-transparent hover:bg-slate-100 dark:bg-input dark:border-subtle dark:hover:bg-white/5'
          }`}
        >
          <div className="flex justify-between items-start">
             <Activity className="w-4 h-4 text-slate-500 dark:text-textMuted" />
            <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
               settings.invalidateCache
                 ? 'bg-indigo-600 border-indigo-600 dark:bg-primary dark:border-primary'
                 : 'bg-white border-slate-300 dark:bg-transparent dark:border-textMuted'
            }`}>
              {settings.invalidateCache && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white text-xs">Invalidate Cache</h3>
            <p className="text-[10px] text-slate-500 dark:text-textMuted mt-1">تجاوز التخزين المؤقت (فرض تحليل جديد).</p>
          </div>
        </div>
      </div>

      {/* Custom Regex Rules Section */}
      <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-textMuted uppercase tracking-wider border-t border-slate-100 dark:border-subtle pt-4">
        قواعد التنظيف المخصصة (Custom Regex Rules)
      </div>
      <RegexRuleEditor
        rules={settings.customRegexRules}
        onUpdate={(rules: CustomRegexRule[]) => onUpdate('customRegexRules', rules)}
      />
    </div>
  );
};

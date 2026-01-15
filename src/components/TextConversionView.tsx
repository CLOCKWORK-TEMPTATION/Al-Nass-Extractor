/**
 * Text Conversion & Export View
 * واجهة تحويل وتصدير النصوص إلى TXT
 */

import React, { useState, useCallback } from 'react';
import {
  FileText,
  Upload,
  Download,
  Settings,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Loader,
  Copy,
  Eye,
  RefreshCw,
} from 'lucide-react';
import {
  ArabicTextConverter,
  FileFormatDetector,
  TextExportUtility,
  ArabicNormalizationOptions,
  TextConversionResult,
} from '../services/textConversionService';

interface TextExportViewProps {
  darkMode?: boolean;
}

export const TextConversionView: React.FC<TextExportViewProps> = ({ darkMode = true }) => {
  // File handling
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileFormat, setFileFormat] = useState<string>('unknown');
  const [isProcessing, setIsProcessing] = useState(false);

  // Normalization options
  const [options, setOptions] = useState<ArabicNormalizationOptions>({
    removeDiacritics: true,
    removeTatweel: true,
    normalizeLamAlef: true,
    removeExtraSpaces: true,
    normalizeQuotes: true,
    normalizeHyphens: true,
    normalizeNumbers: true,
    removeHiddenChars: true,
  });

  // Conversion result
  const [result, setResult] = useState<TextConversionResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // File selection handler
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const detected = FileFormatDetector.detectFormat(file.name);
      setFileFormat(detected);
      setResult(null);
    }
  }, []);

  // Convert file
  const handleConvert = useCallback(async () => {
    if (!selectedFile) {
      alert('يرجى اختيار ملف أولاً');
      return;
    }

    setIsProcessing(true);

    try {
      const fileContent = await selectedFile.arrayBuffer();
      const uint8Array = new Uint8Array(fileContent);
      let conversionResult: TextConversionResult;

      if (fileFormat === 'kfx') {
        conversionResult = await ArabicTextConverter.convertKFXToText(uint8Array);
        if (conversionResult.success) {
          conversionResult = await ArabicTextConverter.convertToArabicText(
            conversionResult.content,
            options
          );
        }
      } else if (fileFormat === 'html') {
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(uint8Array);
        conversionResult = await ArabicTextConverter.convertHTMLToText(text);
      } else {
        // Try UTF-8 first, then fallback
        let text = '';
        try {
          const decoder = new TextDecoder('utf-8');
          text = decoder.decode(uint8Array);
        } catch {
          const decoder = new TextDecoder('iso-8859-6');
          text = decoder.decode(uint8Array);
        }
        conversionResult = await ArabicTextConverter.convertToArabicText(text, options);
      }

      setResult(conversionResult);
    } catch (error: any) {
      setResult({
        success: false,
        content: '',
        originalLength: selectedFile.size,
        convertedLength: 0,
        paragraphCount: 0,
        sentenceCount: 0,
        wordCount: 0,
        encoding: 'unknown',
        message: `❌ خطأ: ${error.message}`,
        warnings: [],
        statistics: {
          arabicCharacters: 0,
          englishCharacters: 0,
          numbers: 0,
          punctuation: 0,
          whitespace: 0,
        },
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, fileFormat, options]);

  // Download converted text
  const handleDownload = useCallback(() => {
    if (!result || !result.success) {
      alert('لا توجد بيانات قابلة للتحميل');
      return;
    }

    const filename = selectedFile
      ? TextExportUtility.generateFilename(
        selectedFile.name.split('.')[0],
        'txt'
      )
      : 'output.txt';

    TextExportUtility.downloadAsText(result.content, filename, 'UTF-8');
  }, [result, selectedFile]);

  // Copy to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    if (!result || !result.success) return;

    const copied = await TextExportUtility.copyToClipboard(result.content);
    if (copied) {
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    }
  }, [result]);

  // Toggle option
  const toggleOption = (key: keyof ArabicNormalizationOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Quality check
  const qualityData = result
    ? {
        isValid: result.content.length > 0,
        arabicRatio: ((result.statistics.arabicCharacters / (result.convertedLength || 1)) * 100).toFixed(1),
      }
    : null;

  return (
    <div className={`min-h-screen p-6 ${darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white' : 'bg-gray-50 text-slate-900'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="w-8 h-8" />
              تحويل النصوص إلى TXT بجودة عربية
            </h1>
            <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              تحويل احترافي مع تطبيع عربي متقدم
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Upload & Options */}
          <div className="lg:col-span-1 space-y-6">
            {/* File Upload */}
            <div className={`rounded-lg p-6 border-2 border-dashed ${
              darkMode
                ? 'bg-gray-800/50 border-purple-500/30 hover:border-purple-500/50'
                : 'bg-white border-purple-300 hover:border-purple-500'
            } transition-all`}>
              <label className="cursor-pointer block">
                <div className="flex flex-col items-center justify-center gap-3">
                  <Upload className="w-8 h-8 text-purple-500" />
                  <div className="text-center">
                    <p className="font-semibold">اختر ملفاً</p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      KFX, PDF, DOCX, TXT, HTML
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".txt,.pdf,.docx,.doc,.html,.htm,.kfx,.epub,.mobi"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>

              {selectedFile && (
                <div className={`mt-4 p-3 rounded ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                  <p className="text-sm font-semibold text-green-500">
                    ✓ {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    الصيغة: <strong>{fileFormat}</strong> | الحجم: <strong>{(selectedFile.size / 1024).toFixed(2)} KB</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Conversion Options */}
            <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800/50' : 'bg-white'} border ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                خيارات التطبيع
              </h3>

              <div className="space-y-3">
                {Object.entries(options).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer hover:opacity-80">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() => toggleOption(key as keyof ArabicNormalizationOptions)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">
                      {key === 'removeDiacritics' && 'إزالة التشكيل'}
                      {key === 'removeTatweel' && 'إزالة الكاشيدة'}
                      {key === 'normalizeLamAlef' && 'توحيد اللام ألف'}
                      {key === 'removeExtraSpaces' && 'إزالة المسافات الزائدة'}
                      {key === 'normalizeQuotes' && 'توحيد علامات التنصيص'}
                      {key === 'normalizeHyphens' && 'توحيد الشرطات'}
                      {key === 'normalizeNumbers' && 'توحيد الأرقام'}
                      {key === 'removeHiddenChars' && 'إزالة الأحرف المخفية'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleConvert}
              disabled={!selectedFile || isProcessing}
              className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                isProcessing
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : selectedFile
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  تحويل
                </>
              )}
            </button>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-2">
            {!result ? (
              <div className={`rounded-lg p-12 border-2 border-dashed text-center ${
                darkMode
                  ? 'bg-gray-800/50 border-gray-700 text-gray-400'
                  : 'bg-gray-100 border-gray-300 text-gray-600'
              }`}>
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-semibold">ابدأ بتحميل ملف</p>
                <p className="text-sm mt-2">سيتم عرض نتائج التحويل هنا</p>
              </div>
            ) : result.success ? (
              <div className="space-y-6">
                {/* Status */}
                <div className={`rounded-lg p-4 border-l-4 ${
                  darkMode
                    ? 'bg-green-900/20 border-green-500 text-green-400'
                    : 'bg-green-50 border-green-500 text-green-700'
                }`}>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6" />
                    <div>
                      <p className="font-semibold">{result.message}</p>
                      <p className="text-sm opacity-80">
                        تم تحويل {result.convertedLength:,} حرف من {result.originalLength:,}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <div className="space-y-2">
                    {result.warnings.map((warning, idx) => (
                      <div
                        key={idx}
                        className={`rounded-lg p-3 flex items-center gap-3 ${
                          darkMode
                            ? 'bg-yellow-900/20 text-yellow-400'
                            : 'bg-yellow-50 text-yellow-700'
                        }`}
                      >
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm">{warning}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Statistics */}
                <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800/50' : 'bg-white'} border ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    الإحصائيات
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className={`p-3 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                      <p className="text-xs opacity-70">الفقرات</p>
                      <p className="text-2xl font-bold">{result.paragraphCount}</p>
                    </div>
                    <div className={`p-3 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                      <p className="text-xs opacity-70">الجمل</p>
                      <p className="text-2xl font-bold">{result.sentenceCount}</p>
                    </div>
                    <div className={`p-3 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                      <p className="text-xs opacity-70">الكلمات</p>
                      <p className="text-2xl font-bold">{result.wordCount}</p>
                    </div>
                    <div className={`p-3 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                      <p className="text-xs opacity-70">أحرف عربي</p>
                      <p className="text-2xl font-bold">{result.statistics.arabicCharacters}</p>
                    </div>
                    <div className={`p-3 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                      <p className="text-xs opacity-70">أحرف إنجليزي</p>
                      <p className="text-2xl font-bold">{result.statistics.englishCharacters}</p>
                    </div>
                    <div className={`p-3 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                      <p className="text-xs opacity-70">الأرقام</p>
                      <p className="text-2xl font-bold">{result.statistics.numbers}</p>
                    </div>
                  </div>

                  {qualityData && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">نسبة العربية</span>
                        <span className="text-lg font-bold text-purple-400">
                          {qualityData.arabicRatio}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                          style={{ width: `${qualityData.arabicRatio}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div className={`rounded-lg overflow-hidden border ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className={`w-full p-4 flex items-center justify-between font-semibold ${
                      darkMode ? 'bg-gray-800/50 hover:bg-gray-800' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      معاينة النص
                    </span>
                    <span className={`transform transition-transform ${showPreview ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>

                  {showPreview && (
                    <div className={`p-6 max-h-64 overflow-y-auto ${
                      darkMode ? 'bg-gray-900' : 'bg-white'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {result.content.slice(0, 1000)}
                        {result.content.length > 1000 && '...'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleDownload}
                    className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-5 h-5" />
                    تحميل TXT
                  </button>

                  <button
                    onClick={handleCopyToClipboard}
                    className={`py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                      copiedToClipboard
                        ? 'bg-green-600 text-white'
                        : darkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-300 hover:bg-gray-400 text-slate-900'
                    }`}
                  >
                    <Copy className="w-5 h-5" />
                    {copiedToClipboard ? 'تم النسخ!' : 'نسخ إلى الحافظة'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={`rounded-lg p-6 border-l-4 ${
                darkMode
                  ? 'bg-red-900/20 border-red-500 text-red-400'
                  : 'bg-red-50 border-red-500 text-red-700'
              }`}>
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6" />
                  <div>
                    <p className="font-semibold">{result.message}</p>
                    {result.warnings.length > 0 && (
                      <ul className="text-sm mt-2 space-y-1">
                        {result.warnings.map((w, idx) => (
                          <li key={idx}>• {w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className={`mt-8 rounded-lg p-6 ${
          darkMode ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-blue-50 border border-blue-200'
        }`}>
          <h3 className="font-semibold mb-3">📋 نصائح الاستخدام</h3>
          <ul className="text-sm space-y-2">
            <li>✓ يدعم صيغ متعددة: TXT, PDF, DOCX, KFX, HTML وغيره</li>
            <li>✓ يطبع النصوص العربية تلقائياً (إزالة التشكيل والكاشيدة وتوحيد النصوص)</li>
            <li>✓ يحافظ على تنسيق الفقرات والأسطر</li>
            <li>✓ يكتشف المشاكل المحتملة ويحذرك منها</li>
            <li>✓ يسمح بتنزيل النص أو نسخه مباشرة</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TextConversionView;

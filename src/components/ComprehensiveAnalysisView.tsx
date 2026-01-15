/**
 * Comprehensive Novel Analysis View
 * عرض تحليل رواية شامل يجمع كل المهام
 */

import React, { useState } from 'react';
import { BookText, Users, MessageSquare, MapPin, Globe, TrendingUp, Download, Play, AlertTriangle } from 'lucide-react';
import { extractNovelMetadata } from '../services/novelMetadataService';
import { extractPlotEvents } from '../services/plotEventsService';
import { extractSettings } from '../services/settingsAnalysisService';
import { extractCulturalContext } from '../services/culturalContextService';
import { ArabicCharacterDataset } from '../services/characterAnalysisService';
import { ArabicDialogueAnalyzer } from '../services/dialogueAnalysisService';
import { DataExportService } from '../services/dataExportService';

interface ComprehensiveAnalysisViewProps {
  initialText?: string;
}

export const ComprehensiveAnalysisView: React.FC<ComprehensiveAnalysisViewProps> = ({ initialText = '' }) => {
  const [text, setText] = useState(initialText);
  const [novelId, setNovelId] = useState('');
  const [novelTitle, setNovelTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Results
  const [metadata, setMetadata] = useState<any>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [dialogues, setDialogues] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [culturalContext, setCulturalContext] = useState<any>(null);

  const handleComprehensiveAnalysis = async () => {
    if (!text.trim()) {
      setError('يرجى إدخال نص الرواية');
      return;
    }

    const id = novelId || 'novel_' + Date.now();
    const title = novelTitle || 'رواية عربية';

    setIsProcessing(true);
    setError(null);
    setProgress('جاري استخراج البيانات الوصفية...');

    try {
      // Step 1: Extract Metadata
      setProgress('⚙️ جاري استخراج البيانات الوصفية...');
      const meta = await extractNovelMetadata(text, title);
      setMetadata(meta);

      // Step 2: Extract Characters (using Gemini)
      setProgress('👥 جاري استخراج الشخصيات...');
      // This would need a character extraction function similar to plot events
      // For now, we'll skip or use existing data
      
      // Step 3: Extract Dialogues
      setProgress('💬 جاري تحليل الحوارات...');
      // Similar to characters
      
      // Step 4: Extract Plot Events
      setProgress('📖 جاري استخراج أحداث الحبكة...');
      const plotEvents = await extractPlotEvents(text, id, title);
      setEvents(plotEvents);

      // Step 5: Extract Settings
      setProgress('📍 جاري تحليل الأماكن...');
      const novelSettings = await extractSettings(text, id, title);
      setSettings(novelSettings);

      // Step 6: Extract Cultural Context
      setProgress('🌍 جاري استخراج السياق الثقافي...');
      const context = await extractCulturalContext(text, id, title);
      setCulturalContext(context);

      setProgress('✅ اكتمل التحليل الشامل!');
      
    } catch (e: any) {
      setError(e.message || 'حدث خطأ أثناء التحليل');
      setProgress('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportAll = () => {
    const completeDataset = {
      metadata: {
        novel_id: novelId || 'novel_' + Date.now(),
        novel_title: novelTitle || 'رواية عربية',
        export_date: new Date().toISOString(),
        dataset_version: '1.0'
      },
      novel_metadata: metadata,
      characters,
      dialogues,
      plot_events: events,
      settings,
      cultural_context: culturalContext,
      statistics: {
        total_characters: characters.length,
        total_dialogues: dialogues.length,
        total_events: events.length,
        total_settings: settings.length
      }
    };

    const json = JSON.stringify(completeDataset, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${novelId || 'novel'}_complete_analysis.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasResults = metadata || events.length > 0 || settings.length > 0 || culturalContext;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="glass-panel rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-subtle pb-3">
          <BookText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-white">التحليل الشامل للرواية العربية</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-textMuted block mb-2">معرف الرواية</label>
            <input
              type="text"
              value={novelId}
              onChange={(e) => setNovelId(e.target.value)}
              placeholder="novel_001"
              className="w-full p-2 bg-input border border-subtle rounded focus:ring-2 focus:ring-primary outline-none text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-textMuted block mb-2">عنوان الرواية</label>
            <input
              type="text"
              value={novelTitle}
              onChange={(e) => setNovelTitle(e.target.value)}
              placeholder="عنوان الرواية"
              className="w-full p-2 bg-input border border-subtle rounded focus:ring-2 focus:ring-primary outline-none text-white"
            />
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <label className="text-sm font-medium text-textMuted">نص الرواية</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ضع نص الرواية العربية هنا للتحليل الشامل..."
            className="w-full h-64 p-4 text-white text-base leading-relaxed bg-input border border-subtle rounded-lg focus:ring-2 focus:ring-primary outline-none font-arabic resize-y"
            dir="rtl"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-textMuted">
            {progress && <span className="text-primary">{progress}</span>}
          </div>
          <button
            onClick={handleComprehensiveAnalysis}
            disabled={isProcessing || !text.trim()}
            className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary/80 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جاري التحليل...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                بدء التحليل الشامل
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Dashboard */}
      {hasResults && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <BookText className="w-4 h-4 text-primary" />
                <span className="text-xs text-textMuted">البيانات الوصفية</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {metadata ? '✓' : '-'}
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-secondary" />
                <span className="text-xs text-textMuted">الأحداث</span>
              </div>
              <div className="text-2xl font-bold text-secondary">
                {events.length}
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-lavender" />
                <span className="text-xs text-textMuted">الأماكن</span>
              </div>
              <div className="text-2xl font-bold text-lavender">
                {settings.length}
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-xs text-textMuted">السياق الثقافي</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {culturalContext ? '✓' : '-'}
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <button
              onClick={handleExportAll}
              className="bg-surface border border-subtle px-4 py-2 rounded-lg hover:bg-white/5 flex items-center gap-2 text-white"
            >
              <Download className="w-4 h-4" />
              تحميل التحليل الكامل (JSON)
            </button>
          </div>

          {/* Detailed Results (Tabs or Accordions) */}
          <div className="glass-panel rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">نتائج التحليل التفصيلية</h3>
            
            {/* Display condensed results */}
            {events.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  أحداث الحبكة ({events.length})
                </h4>
                <div className="space-y-2">
                  {events.slice(0, 5).map((event, i) => (
                    <div key={i} className="bg-input/50 p-3 rounded border border-subtle">
                      <div className="font-medium text-white">{event.basic_info.event_title}</div>
                      <div className="text-xs text-textMuted">
                        {event.basic_info.event_type} - {event.basic_info.importance_level}
                      </div>
                    </div>
                  ))}
                  {events.length > 5 && (
                    <div className="text-xs text-textMuted text-center">
                      و {events.length - 5} حدث آخر...
                    </div>
                  )}
                </div>
              </div>
            )}

            {settings.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  الأماكن ({settings.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {settings.map((setting, i) => (
                    <span key={i} className="px-3 py-1 bg-lavender/20 text-lavender rounded-full text-sm border border-lavender/30">
                      {setting.basic_info.place_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {culturalContext && (
              <div>
                <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  السياق الثقافي
                </h4>
                <div className="bg-input/50 p-4 rounded border border-subtle">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-textMuted">الفترة التاريخية:</span>
                      <p className="text-white">{culturalContext.historical_period.era}</p>
                    </div>
                    <div>
                      <span className="text-textMuted">النظام السياسي:</span>
                      <p className="text-white">{culturalContext.political_context.regime_type}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

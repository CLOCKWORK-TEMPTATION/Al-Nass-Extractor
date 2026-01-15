
import React, { useState, useEffect } from 'react';
import { BookText, Play, Download, AlertTriangle, CheckCircle, FileJson, Users, MapPin, Clock, Sparkles, Award, Clapperboard } from 'lucide-react';
import { NovelMetadataResult } from '../types';
import { extractNovelMetadata } from '../services/novelMetadataService';

interface NovelAnalyzerViewProps {
  initialText?: string;
  onAnalysisComplete?: (result: NovelMetadataResult) => void;
}

export const NovelAnalyzerView: React.FC<NovelAnalyzerViewProps> = ({ initialText = '', onAnalysisComplete }) => {
  const [inputText, setInputText] = useState<string>(initialText);
  const [filename, setFilename] = useState<string>('novel.txt');
  const [result, setResult] = useState<NovelMetadataResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('basic_info');

  useEffect(() => {
    if (initialText) {
      setInputText(initialText);
    }
  }, [initialText]);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    
    setError(null);
    setIsProcessing(true);
    setResult(null);

    try {
      const metadata = await extractNovelMetadata(inputText, filename);
      setResult(metadata);
      if (onAnalysisComplete) {
        onAnalysisComplete(metadata);
      }
    } catch (e: any) {
      setError(e.message || 'حدث خطأ أثناء التحليل');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `novel_metadata_${result.novel_metadata.basic_info.novel_id || Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sections = [
    { id: 'basic_info', label: 'معلومات أساسية', icon: BookText },
    { id: 'literary_classification', label: 'التصنيف الأدبي', icon: Sparkles },
    { id: 'characters', label: 'الشخصيات', icon: Users },
    { id: 'setting', label: 'الإطار الزماني والمكاني', icon: MapPin },
    { id: 'plot', label: 'هيكل الحبكة', icon: Clock },
    { id: 'awards', label: 'الجوائز والاقتباسات', icon: Award },
    { id: 'adaptations', label: 'الاقتباسات والتعديلات', icon: Clapperboard },
    { id: 'json', label: 'JSON الكامل', icon: FileJson },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Input Section */}
      <div className="glass-panel rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-subtle pb-3">
          <BookText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-white">محلل الروايات (Novel Metadata Extractor)</h2>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-textMuted block mb-2">اسم الملف (اختياري)</label>
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="novel.txt"
            className="w-full md:w-64 p-2 bg-input border border-subtle rounded focus:ring-2 focus:ring-primary outline-none text-white"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-textMuted">نص الرواية العربية</label>
            <span className="text-xs text-textMuted opacity-50">قم بلصق نص الرواية هنا للتحليل الشامل</span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="ضع نص الرواية العربية هنا..."
            className="w-full h-64 p-4 text-white text-base leading-relaxed bg-input border border-subtle rounded-lg focus:ring-2 focus:ring-primary outline-none font-arabic resize-y"
            dir="rtl"
          />
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleAnalyze}
            disabled={isProcessing || !inputText.trim()}
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
                تحليل الرواية
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="p-4 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5" />
              <span>تم استخراج بيانات الرواية بنجاح!</span>
            </div>
            <button
              onClick={downloadJson}
              className="text-sm bg-surface border border-subtle px-3 py-1.5 rounded hover:bg-white/5 flex items-center gap-1 text-textMuted hover:text-white"
            >
              <Download className="w-4 h-4" />
              تحميل JSON
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-xl shadow-sm">
              <div className="text-xs text-textMuted mb-1">عنوان الرواية</div>
              <div className="text-lg font-bold text-primary truncate" title={result.novel_metadata.basic_info.title.primary}>
                {result.novel_metadata.basic_info.title.primary}
              </div>
            </div>
            <div className="glass-panel p-4 rounded-xl shadow-sm">
              <div className="text-xs text-textMuted mb-1">المؤلف</div>
              <div className="text-lg font-bold text-secondary truncate" title={result.novel_metadata.basic_info.author.full_name}>
                {result.novel_metadata.basic_info.author.full_name}
              </div>
            </div>
            <div className="glass-panel p-4 rounded-xl shadow-sm">
              <div className="text-xs text-textMuted mb-1">النوع الأدبي</div>
              <div className="text-lg font-bold text-white">
                {result.novel_metadata.literary_classification.genre.primary}
              </div>
            </div>
            <div className="glass-panel p-4 rounded-xl shadow-sm">
              <div className="text-xs text-textMuted mb-1">درجة الثقة</div>
              <div className="text-lg font-bold text-lavender">
                {((result.novel_metadata.extraction_metadata.confidence_score || 0) * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Section Navigator */}
          <div className="glass-panel rounded-xl shadow-lg overflow-hidden">
            <div className="bg-surface/50 px-4 py-3 border-b border-subtle flex gap-2 overflow-x-auto">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                    activeSection === section.id
                      ? 'bg-primary text-white'
                      : 'bg-input text-textMuted hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <section.icon className="w-3.5 h-3.5" />
                  {section.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Basic Info Section */}
              {activeSection === 'basic_info' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookText className="w-5 h-5 text-primary" />
                    المعلومات الأساسية
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Title Info */}
                    <div className="bg-input/50 p-4 rounded-lg border border-subtle">
                      <h4 className="text-sm font-semibold text-primary mb-3">العنوان</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-textMuted">العنوان الرئيسي:</span>
                          <p className="text-white font-medium">{result.novel_metadata.basic_info.title.primary}</p>
                        </div>
                        {result.novel_metadata.basic_info.title.english_translation && (
                          <div>
                            <span className="text-xs text-textMuted">الترجمة الإنجليزية:</span>
                            <p className="text-white">{result.novel_metadata.basic_info.title.english_translation}</p>
                          </div>
                        )}
                        {result.novel_metadata.basic_info.title.alternative_titles.length > 0 && (
                          <div>
                            <span className="text-xs text-textMuted">عناوين بديلة:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {result.novel_metadata.basic_info.title.alternative_titles.map((t, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 bg-surface rounded text-lavender border border-subtle">{t}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Author Info */}
                    <div className="bg-input/50 p-4 rounded-lg border border-subtle">
                      <h4 className="text-sm font-semibold text-primary mb-3">المؤلف</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-textMuted">الاسم الكامل:</span>
                          <p className="text-white font-medium">{result.novel_metadata.basic_info.author.full_name}</p>
                        </div>
                        <div>
                          <span className="text-xs text-textMuted">الجنسية:</span>
                          <p className="text-white">{result.novel_metadata.basic_info.author.nationality}</p>
                        </div>
                        {(result.novel_metadata.basic_info.author.birth_year || result.novel_metadata.basic_info.author.death_year) && (
                          <div>
                            <span className="text-xs text-textMuted">سنوات الحياة:</span>
                            <p className="text-white">
                              {result.novel_metadata.basic_info.author.birth_year || '?'} - {result.novel_metadata.basic_info.author.death_year || 'حي'}
                            </p>
                          </div>
                        )}
                        {result.novel_metadata.basic_info.author.biography_summary && (
                          <div>
                            <span className="text-xs text-textMuted">نبذة:</span>
                            <p className="text-white/80 text-sm">{result.novel_metadata.basic_info.author.biography_summary}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Publication Info */}
                    <div className="bg-input/50 p-4 rounded-lg border border-subtle md:col-span-2">
                      <h4 className="text-sm font-semibold text-primary mb-3">معلومات النشر</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-xs text-textMuted">الناشر:</span>
                          <p className="text-white">{result.novel_metadata.basic_info.publication.publisher || '-'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-textMuted">مكان النشر:</span>
                          <p className="text-white">{result.novel_metadata.basic_info.publication.place || '-'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-textMuted">تاريخ النشر الأول:</span>
                          <p className="text-white">{result.novel_metadata.basic_info.publication.first_published || '-'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-textMuted">اللغة الأصلية:</span>
                          <p className="text-white">{result.novel_metadata.basic_info.publication.original_language || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Literary Classification Section */}
              {activeSection === 'literary_classification' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    التصنيف الأدبي
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Genre */}
                    <div className="bg-input/50 p-4 rounded-lg border border-subtle">
                      <h4 className="text-sm font-semibold text-primary mb-3">النوع الأدبي</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-textMuted">النوع الرئيسي:</span>
                          <p className="text-white font-medium">{result.novel_metadata.literary_classification.genre.primary}</p>
                        </div>
                        {result.novel_metadata.literary_classification.genre.secondary.length > 0 && (
                          <div>
                            <span className="text-xs text-textMuted">أنواع ثانوية:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {result.novel_metadata.literary_classification.genre.secondary.map((g, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded border border-primary/20">{g}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <span className="text-xs text-textMuted">الحركة الأدبية:</span>
                          <p className="text-white">{result.novel_metadata.literary_classification.literary_movement || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Narrative Style */}
                    <div className="bg-input/50 p-4 rounded-lg border border-subtle">
                      <h4 className="text-sm font-semibold text-primary mb-3">الأسلوب السردي</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-textMuted">المنظور:</span>
                          <p className="text-white">{result.novel_metadata.literary_classification.narrative_style.perspective}</p>
                        </div>
                        <div>
                          <span className="text-xs text-textMuted">الزمن:</span>
                          <p className="text-white">{result.novel_metadata.literary_classification.narrative_style.tense}</p>
                        </div>
                        {result.novel_metadata.literary_classification.narrative_style.tone.length > 0 && (
                          <div>
                            <span className="text-xs text-textMuted">النغمة:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {result.novel_metadata.literary_classification.narrative_style.tone.map((t, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 bg-secondary/20 text-secondary rounded border border-secondary/20">{t}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Themes */}
                    <div className="bg-input/50 p-4 rounded-lg border border-subtle md:col-span-2">
                      <h4 className="text-sm font-semibold text-primary mb-3">المواضيع والثيمات</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.novel_metadata.literary_classification.themes.map((theme, i) => (
                          <div key={i} className="bg-surface px-3 py-2 rounded-lg border border-subtle">
                            <span className="text-white font-medium">{theme.theme}</span>
                            <span className="text-xs text-textMuted ml-2">({theme.prominence})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Characters Section */}
              {activeSection === 'characters' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    الشخصيات
                  </h3>
                  
                  <div className="bg-input/50 p-4 rounded-lg border border-subtle mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-primary">الشخصيات الرئيسية</h4>
                      {result.novel_metadata.character_summary.total_characters && (
                        <span className="text-xs text-textMuted">
                          إجمالي الشخصيات: {result.novel_metadata.character_summary.total_characters}
                        </span>
                      )}
                    </div>
                    <div className="grid gap-3">
                      {result.novel_metadata.character_summary.main_characters.map((char, i) => (
                        <div key={i} className="bg-surface p-3 rounded-lg border border-subtle flex items-center justify-between">
                          <div>
                            <span className="text-white font-medium">{char.name}</span>
                            <span className="text-xs text-textMuted mx-2">-</span>
                            <span className="text-lavender text-sm">{char.role}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            char.gender === 'male' ? 'bg-blue-500/20 text-blue-400' :
                            char.gender === 'female' ? 'bg-pink-500/20 text-pink-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {char.gender}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-input/50 p-4 rounded-lg border border-subtle">
                    <h4 className="text-sm font-semibold text-primary mb-3">ديناميكيات الشخصيات</h4>
                    <p className="text-white/90 leading-relaxed">{result.novel_metadata.character_summary.character_dynamics}</p>
                  </div>
                </div>
              )}

              {/* Setting Section */}
              {activeSection === 'setting' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    الإطار الزماني والمكاني
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Geographical Setting */}
                    <div className="bg-input/50 p-4 rounded-lg border border-subtle">
                      <h4 className="text-sm font-semibold text-primary mb-3">الموقع الجغرافي الرئيسي</h4>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-xs text-textMuted">البلد:</span>
                            <p className="text-white">{result.novel_metadata.geographical_setting.primary_location.country || '-'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-textMuted">المدينة:</span>
                            <p className="text-white">{result.novel_metadata.geographical_setting.primary_location.city || '-'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-textMuted">الحي:</span>
                            <p className="text-white">{result.novel_metadata.geographical_setting.primary_location.district || '-'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-textMuted">المكان المحدد:</span>
                            <p className="text-white">{result.novel_metadata.geographical_setting.primary_location.specific_place || '-'}</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-subtle mt-2">
                          <span className="text-xs text-textMuted">النطاق:</span>
                          <p className="text-white">{result.novel_metadata.geographical_setting.urban_rural} - {result.novel_metadata.geographical_setting.cultural_region}</p>
                        </div>
                      </div>
                    </div>

                    {/* Temporal Setting */}
                    <div className="bg-input/50 p-4 rounded-lg border border-subtle">
                      <h4 className="text-sm font-semibold text-primary mb-3">الإطار الزمني</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-textMuted">الفترة:</span>
                          <p className="text-white">
                            {result.novel_metadata.temporal_setting.time_period.start} - {result.novel_metadata.temporal_setting.time_period.end}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-textMuted">الوصف:</span>
                          <p className="text-white/80 text-sm">{result.novel_metadata.temporal_setting.time_period.description}</p>
                        </div>
                        <div className="pt-2 border-t border-subtle mt-2">
                          <span className="text-xs text-textMuted">نوع المدى الزمني:</span>
                          <p className="text-white">{result.novel_metadata.temporal_setting.timeline_coverage.span_type}</p>
                        </div>
                        <div>
                          <span className="text-xs text-textMuted">الإيقاع:</span>
                          <p className="text-white">{result.novel_metadata.temporal_setting.timeline_coverage.pacing}</p>
                        </div>
                      </div>
                    </div>

                    {/* Historical Context */}
                    <div className="bg-input/50 p-4 rounded-lg border border-subtle md:col-span-2">
                      <h4 className="text-sm font-semibold text-primary mb-3">السياق التاريخي</h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-xs text-textMuted">النظام السياسي:</span>
                          <p className="text-white">{result.novel_metadata.temporal_setting.historical_context.political_regime || '-'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-textMuted">الأحوال الاجتماعية:</span>
                          <p className="text-white">{result.novel_metadata.temporal_setting.historical_context.social_conditions || '-'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-textMuted">الأحداث الكبرى:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {result.novel_metadata.temporal_setting.historical_context.major_events.map((e, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-surface rounded text-lavender border border-subtle">{e}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Plot Section */}
              {activeSection === 'plot' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    هيكل الحبكة
                  </h3>
                  
                  <div className="bg-input/50 p-4 rounded-lg border border-subtle">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-primary">نوع الحبكة</h4>
                      <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded border border-primary/20">
                        {result.novel_metadata.plot_structure.plot_type}
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="relative pl-6 border-l-2 border-primary/30">
                        <div className="absolute left-0 top-0 w-3 h-3 bg-primary rounded-full -translate-x-[7px]" />
                        <h5 className="text-xs text-textMuted uppercase tracking-wider mb-1">الافتتاحية</h5>
                        <p className="text-white/90 text-sm">{result.novel_metadata.plot_structure.narrative_arc.opening}</p>
                      </div>
                      
                      <div className="relative pl-6 border-l-2 border-secondary/30">
                        <div className="absolute left-0 top-0 w-3 h-3 bg-secondary rounded-full -translate-x-[7px]" />
                        <h5 className="text-xs text-textMuted uppercase tracking-wider mb-1">الحدث المحرك</h5>
                        <p className="text-white/90 text-sm">{result.novel_metadata.plot_structure.narrative_arc.inciting_incident}</p>
                      </div>
                      
                      <div className="relative pl-6 border-l-2 border-lavender/30">
                        <div className="absolute left-0 top-0 w-3 h-3 bg-lavender rounded-full -translate-x-[7px]" />
                        <h5 className="text-xs text-textMuted uppercase tracking-wider mb-1">الصعود</h5>
                        <ul className="text-white/90 text-sm list-disc list-inside">
                          {result.novel_metadata.plot_structure.narrative_arc.rising_action.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="relative pl-6 border-l-2 border-red-500/30">
                        <div className="absolute left-0 top-0 w-3 h-3 bg-red-500 rounded-full -translate-x-[7px]" />
                        <h5 className="text-xs text-textMuted uppercase tracking-wider mb-1">الذروة</h5>
                        <p className="text-white/90 text-sm font-medium">{result.novel_metadata.plot_structure.narrative_arc.climax}</p>
                      </div>
                      
                      <div className="relative pl-6 border-l-2 border-amber-500/30">
                        <div className="absolute left-0 top-0 w-3 h-3 bg-amber-500 rounded-full -translate-x-[7px]" />
                        <h5 className="text-xs text-textMuted uppercase tracking-wider mb-1">الهبوط</h5>
                        <ul className="text-white/90 text-sm list-disc list-inside">
                          {result.novel_metadata.plot_structure.narrative_arc.falling_action.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="relative pl-6">
                        <div className="absolute left-0 top-0 w-3 h-3 bg-green-500 rounded-full -translate-x-[7px]" />
                        <h5 className="text-xs text-textMuted uppercase tracking-wider mb-1">الحل</h5>
                        <p className="text-white/90 text-sm">{result.novel_metadata.plot_structure.narrative_arc.resolution}</p>
                      </div>
                    </div>
                  </div>

                  {result.novel_metadata.plot_structure.subplots.length > 0 && (
                    <div className="bg-input/50 p-4 rounded-lg border border-subtle">
                      <h4 className="text-sm font-semibold text-primary mb-3">الحبكات الفرعية</h4>
                      <ul className="space-y-2">
                        {result.novel_metadata.plot_structure.subplots.map((subplot, i) => (
                          <li key={i} className="text-white/90 text-sm flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {subplot}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Awards Section */}
              {activeSection === 'awards' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    الجوائز والتكريمات
                  </h3>
                  
                  {result.novel_metadata.awards_recognition.major_awards.length > 0 ? (
                    <div className="grid gap-4">
                      {result.novel_metadata.awards_recognition.major_awards.map((award, i) => (
                        <div key={i} className="bg-input/50 p-4 rounded-lg border border-subtle">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-white font-medium">{award.award_name}</h4>
                            {award.year && (
                              <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded">{award.year}</span>
                            )}
                          </div>
                          {award.citation && (
                            <p className="text-white/80 text-sm italic mb-2">"{award.citation}"</p>
                          )}
                          <p className="text-textMuted text-xs">{award.significance}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-textMuted">
                      لا توجد جوائز مسجلة
                    </div>
                  )}

                  {result.novel_metadata.awards_recognition.other_honors.length > 0 && (
                    <div className="bg-input/50 p-4 rounded-lg border border-subtle">
                      <h4 className="text-sm font-semibold text-primary mb-3">تكريمات أخرى</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.novel_metadata.awards_recognition.other_honors.map((honor, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-surface rounded text-lavender border border-subtle">{honor}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Adaptations Section */}
              {activeSection === 'adaptations' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clapperboard className="w-5 h-5 text-primary" />
                    الاقتباسات والتعديلات
                  </h3>
                  
                  {result.novel_metadata.adaptations.length > 0 ? (
                    <div className="grid gap-4">
                      {result.novel_metadata.adaptations.map((adaptation, i) => (
                        <div key={i} className="bg-input/50 p-4 rounded-lg border border-subtle">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-white font-medium">{adaptation.type}</h4>
                            {adaptation.year && (
                              <span className="text-xs px-2 py-0.5 bg-secondary/20 text-secondary rounded">{adaptation.year}</span>
                            )}
                          </div>
                          {adaptation.director && (
                            <p className="text-textMuted text-sm mb-2">
                              <span className="text-xs">المخرج:</span> {adaptation.director}
                            </p>
                          )}
                          {adaptation.cast.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {adaptation.cast.map((actor, j) => (
                                <span key={j} className="text-xs px-2 py-0.5 bg-surface rounded text-white border border-subtle">{actor}</span>
                              ))}
                            </div>
                          )}
                          <p className="text-white/80 text-sm">{adaptation.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-textMuted">
                      لا توجد اقتباسات مسجلة
                    </div>
                  )}
                </div>
              )}

              {/* Full JSON Section */}
              {activeSection === 'json' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <FileJson className="w-5 h-5 text-primary" />
                      البيانات الكاملة (JSON)
                    </h3>
                    <button
                      onClick={downloadJson}
                      className="text-sm bg-surface border border-subtle px-3 py-1.5 rounded hover:bg-white/5 flex items-center gap-1 text-textMuted hover:text-white"
                    >
                      <Download className="w-4 h-4" />
                      تحميل
                    </button>
                  </div>
                  <div className="h-[500px] overflow-auto p-4 bg-surface rounded-lg border border-subtle font-mono text-sm" dir="ltr">
                    <pre className="text-lavender">{JSON.stringify(result, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tags & Keywords */}
          {result.novel_metadata.tags_keywords.length > 0 && (
            <div className="glass-panel rounded-xl shadow-lg p-6">
              <h3 className="text-sm font-semibold text-primary mb-3">الكلمات المفتاحية</h3>
              <div className="flex flex-wrap gap-2">
                {result.novel_metadata.tags_keywords.map((tag, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20 hover:bg-primary/20 transition-colors cursor-default">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
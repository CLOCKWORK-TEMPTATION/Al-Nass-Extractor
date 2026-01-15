/**
 * Dataset Management View
 * واجهة إدارة مجموعات البيانات
 */

import React, { useState, useCallback } from 'react';
import {
  Database,
  Upload,
  Download,
  FileJson,
  FileText,
  Table,
  Search,
  Filter,
  Trash2,
  Plus,
  BarChart3,
  Users,
  MessageSquare,
  MapPin,
  BookOpen,
} from 'lucide-react';
import { ArabicCharacterDataset } from '../services/characterAnalysisService';
import { ArabicDialogueAnalyzer } from '../services/dialogueAnalysisService';
import {
  DataExportService,
  DataImportService,
  DataConversionService,
} from '../services/dataExportService';
import type { ExportFormat, CharacterProfile, DialogueEntry } from '../schemas/templates';

type DatasetType = 'characters' | 'dialogues' | 'events' | 'settings' | 'cultural';

interface DatasetManagerProps {
  onClose?: () => void;
}

export const DatasetManagerView: React.FC<DatasetManagerProps> = ({ onClose }) => {
  const [activeDataset, setActiveDataset] = useState<DatasetType>('characters');
  const [characterDataset] = useState(() => new ArabicCharacterDataset());
  const [dialogueDataset] = useState(() => new ArabicDialogueAnalyzer());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('jsonl');

  // Import handlers
  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await DataImportService.readFile(file);
      const format = file.name.endsWith('.json') ? 'json' :
                     file.name.endsWith('.jsonl') ? 'jsonl' :
                     file.name.endsWith('.csv') ? 'csv' : 'json';

      const data = await DataImportService.import(content, format);

      if (activeDataset === 'characters') {
        data.forEach((char: CharacterProfile) => {
          try {
            characterDataset.addCharacter(char);
          } catch (e) {
            console.warn('تخطي شخصية:', e);
          }
        });
      } else if (activeDataset === 'dialogues') {
        const jsonlContent = data.map(d => JSON.stringify(d)).join('\n');
        dialogueDataset.loadDialogues(jsonlContent);
      }

      alert(`✓ تم استيراد ${data.length} عنصر`);
    } catch (error: any) {
      alert(`خطأ في الاستيراد: ${error.message}`);
    }
  }, [activeDataset, characterDataset, dialogueDataset]);

  // Export handlers
  const handleExport = useCallback(() => {
    try {
      let content: string;
      let filename: string;

      if (activeDataset === 'characters') {
        const data = characterDataset.getAllCharacters();
        content = DataExportService.export(data, selectedFormat, {
          format: selectedFormat,
          include_metadata: true,
        }) as string;
        filename = `characters_dataset.${selectedFormat}`;
      } else if (activeDataset === 'dialogues') {
        const data = dialogueDataset.getAllDialogues();
        content = DataExportService.export(data, selectedFormat, {
          format: selectedFormat,
          include_metadata: true,
        }) as string;
        filename = `dialogues_dataset.${selectedFormat}`;
      } else {
        content = '[]';
        filename = `dataset.${selectedFormat}`;
      }

      DataExportService.downloadAsFile(content, filename);
      alert('✓ تم التصدير بنجاح');
    } catch (error: any) {
      alert(`خطأ في التصدير: ${error.message}`);
    }
  }, [activeDataset, selectedFormat, characterDataset, dialogueDataset]);

  // Get statistics
  const getStatistics = useCallback(() => {
    if (activeDataset === 'characters') {
      return characterDataset.getStatistics();
    } else if (activeDataset === 'dialogues') {
      return dialogueDataset.getDialogueStatistics();
    }
    return null;
  }, [activeDataset, characterDataset, dialogueDataset]);

  const stats = getStatistics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Database className="w-8 h-8" />
              إدارة مجموعات البيانات
            </h1>
            <p className="text-gray-400 mt-2">
              استيراد وتصدير وتحليل بيانات الروايات العربية
            </p>
          </div>
        </div>

        {/* Dataset Type Selector */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => setActiveDataset('characters')}
            className={`p-4 rounded-lg border-2 transition-all ${
              activeDataset === 'characters'
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-gray-700 bg-gray-800/50 hover:border-purple-500/50'
            }`}
          >
            <Users className="w-6 h-6 mx-auto mb-2" />
            <div className="text-sm font-semibold">الشخصيات</div>
            <div className="text-xs text-gray-400">
              {characterDataset.getCount()} عنصر
            </div>
          </button>

          <button
            onClick={() => setActiveDataset('dialogues')}
            className={`p-4 rounded-lg border-2 transition-all ${
              activeDataset === 'dialogues'
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-gray-700 bg-gray-800/50 hover:border-purple-500/50'
            }`}
          >
            <MessageSquare className="w-6 h-6 mx-auto mb-2" />
            <div className="text-sm font-semibold">الحوارات</div>
            <div className="text-xs text-gray-400">
              {dialogueDataset.getAllDialogues().length} عنصر
            </div>
          </button>

          <button
            onClick={() => setActiveDataset('events')}
            className={`p-4 rounded-lg border-2 transition-all ${
              activeDataset === 'events'
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-gray-700 bg-gray-800/50 hover:border-purple-500/50'
            }`}
          >
            <BookOpen className="w-6 h-6 mx-auto mb-2" />
            <div className="text-sm font-semibold">الأحداث</div>
            <div className="text-xs text-gray-400">0 عنصر</div>
          </button>

          <button
            onClick={() => setActiveDataset('settings')}
            className={`p-4 rounded-lg border-2 transition-all ${
              activeDataset === 'settings'
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-gray-700 bg-gray-800/50 hover:border-purple-500/50'
            }`}
          >
            <MapPin className="w-6 h-6 mx-auto mb-2" />
            <div className="text-sm font-semibold">الأماكن</div>
            <div className="text-xs text-gray-400">0 عنصر</div>
          </button>

          <button
            onClick={() => setActiveDataset('cultural')}
            className={`p-4 rounded-lg border-2 transition-all ${
              activeDataset === 'cultural'
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-gray-700 bg-gray-800/50 hover:border-purple-500/50'
            }`}
          >
            <Database className="w-6 h-6 mx-auto mb-2" />
            <div className="text-sm font-semibold">السياق الثقافي</div>
            <div className="text-xs text-gray-400">0 عنصر</div>
          </button>
        </div>

        {/* Action Bar */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Import */}
            <label className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>استيراد</span>
              <input
                type="file"
                accept=".json,.jsonl,.csv"
                onChange={handleImport}
                className="hidden"
              />
            </label>

            {/* Export Format Selector */}
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
              className="px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500 outline-none"
            >
              <option value="json">JSON</option>
              <option value="jsonl">JSONL</option>
              <option value="csv">CSV</option>
              <option value="txt">TXT</option>
            </select>

            {/* Export */}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              تصدير ({selectedFormat.toUpperCase()})
            </button>

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Panel */}
        {stats && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              إحصائيات
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {activeDataset === 'characters' && 'character_stats' in stats && (
                <>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-400">إجمالي الشخصيات</div>
                    <div className="text-2xl font-bold">{stats.total_characters}</div>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-400">متوسط العمر</div>
                    <div className="text-2xl font-bold">
                      {stats.character_stats.avg_age.toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-400">الروايات</div>
                    <div className="text-2xl font-bold">{stats.total_novels}</div>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-400">الأدوار المختلفة</div>
                    <div className="text-2xl font-bold">
                      {Object.keys(stats.character_stats.by_role).length}
                    </div>
                  </div>
                </>
              )}

              {activeDataset === 'dialogues' && 'total_dialogues' in stats && (
                <>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-400">إجمالي الحوارات</div>
                    <div className="text-2xl font-bold">{stats.total_dialogues}</div>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-400">إجمالي التبادلات</div>
                    <div className="text-2xl font-bold">{stats.total_exchanges}</div>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-400">إجمالي الكلمات</div>
                    <div className="text-2xl font-bold">{stats.total_words}</div>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-400">متوسط التبادلات</div>
                    <div className="text-2xl font-bold">
                      {stats.avg_exchanges_per_dialogue.toFixed(1)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Data Preview */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">معاينة البيانات</h2>
          
          <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-auto font-mono text-sm">
            <pre className="text-gray-300">
              {activeDataset === 'characters'
                ? JSON.stringify(characterDataset.getAllCharacters().slice(0, 3), null, 2)
                : activeDataset === 'dialogues'
                ? JSON.stringify(dialogueDataset.getAllDialogues().slice(0, 3), null, 2)
                : '[]'}
            </pre>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <h3 className="font-semibold mb-2">📋 إرشادات الاستخدام</h3>
          <ul className="text-sm text-gray-300 space-y-1 mr-4">
            <li>• استخدم "استيراد" لتحميل ملفات JSON أو JSONL أو CSV</li>
            <li>• اختر صيغة التصدير المطلوبة ثم اضغط "تصدير"</li>
            <li>• استخدم البحث للعثور على عناصر محددة</li>
            <li>• راجع الإحصائيات للحصول على نظرة عامة على البيانات</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DatasetManagerView;

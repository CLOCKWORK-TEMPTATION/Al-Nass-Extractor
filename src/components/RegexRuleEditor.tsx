import React, { useState } from 'react';
import { CustomRegexRule } from '../types';
import { Plus, Trash2, Power, Edit2, Check, X, Code, HelpCircle, TestTube2 } from 'lucide-react';

interface RegexRuleEditorProps {
  rules: CustomRegexRule[];
  onUpdate: (rules: CustomRegexRule[]) => void;
}

// Default preset rules that users can enable
export const DEFAULT_REGEX_RULES: Omit<CustomRegexRule, 'id' | 'enabled'>[] = [
  {
    name: 'إزالة أرقام الصفحات',
    pattern: '^\\d+$',
    replacement: '',
    flags: 'gm',
    description: 'يحذف الأسطر التي تحتوي على أرقام الصفحات فقط'
  },
  {
    name: 'إزالة أرقام الصفحات المركزية',
    pattern: '^\\s*-\\s*\\d+\\s*-\\s*$',
    replacement: '',
    flags: 'gm',
    description: 'يحذف أرقام الصفحات المحاطة بشرطات مثل: - 123 -'
  },
  {
    name: 'إزالة اسم المطبعة المتكرر',
    pattern: 'مطبعة.*?\\d{4}',
    replacement: '',
    flags: 'gi',
    description: 'مثال: مطبعة الهلال 2020'
  },
  {
    name: 'إزالة رؤوس الصفحات (العناوين المتكررة)',
    pattern: '^[\\u0600-\\u06FF\\s]{3,30}$',
    replacement: '',
    flags: 'gm',
    description: 'يحذف الأسطر القصيرة التي قد تكون عناوين متكررة في رؤوس الصفحات'
  },
  {
    name: 'إزالة التذييلات القانونية',
    pattern: '(حقوق النشر|جميع الحقوق محفوظة|©|®|™).*',
    replacement: '',
    flags: 'gi',
    description: 'يحذف نصوص حقوق النشر والعلامات التجارية'
  },
  {
    name: 'إزالة الفواصل المتعددة (****)',
    pattern: '[\\*\\-_=]{3,}',
    replacement: '',
    flags: 'g',
    description: 'يحذف خطوط الفصل المكونة من رموز متكررة'
  },
  {
    name: 'إزالة المسافات الزائدة',
    pattern: '\\s{2,}',
    replacement: ' ',
    flags: 'g',
    description: 'يستبدل المسافات المتعددة بمسافة واحدة'
  },
  {
    name: 'إزالة الأسطر الفارغة المتعددة',
    pattern: '\\n\\s*\\n\\s*\\n+',
    replacement: '\\n\\n',
    flags: 'g',
    description: 'يستبدل الأسطر الفارغة المتعددة بسطرين فارغين فقط'
  }
];

export const RegexRuleEditor: React.FC<RegexRuleEditorProps> = ({ rules, onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CustomRegexRule | null>(null);
  const [testText, setTestText] = useState<string>('');
  const [testResult, setTestResult] = useState<string>('');
  const [showTestPanel, setShowTestPanel] = useState<boolean>(false);

  const handleAddRule = () => {
    const newRule: CustomRegexRule = {
      id: Date.now().toString(),
      name: 'قاعدة جديدة',
      pattern: '',
      replacement: '',
      flags: 'g',
      enabled: true,
      description: ''
    };
    onUpdate([...rules, newRule]);
    setEditingId(newRule.id);
    setEditForm(newRule);
  };

  const handleAddPreset = (preset: Omit<CustomRegexRule, 'id' | 'enabled'>) => {
    const newRule: CustomRegexRule = {
      ...preset,
      id: Date.now().toString(),
      enabled: true
    };
    onUpdate([...rules, newRule]);
  };

  const handleDeleteRule = (id: string) => {
    onUpdate(rules.filter(r => r.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleToggleRule = (id: string) => {
    onUpdate(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleStartEdit = (rule: CustomRegexRule) => {
    setEditingId(rule.id);
    setEditForm({ ...rule });
  };

  const handleSaveEdit = () => {
    if (!editForm) return;
    onUpdate(rules.map(r => r.id === editForm.id ? editForm : r));
    setEditingId(null);
    setEditForm(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleTestRules = () => {
    let result = testText;

    // Apply all enabled rules in order
    rules.filter(r => r.enabled).forEach(rule => {
      try {
        const regex = new RegExp(
          rule.pattern,
          rule.flags || 'g'
        );

        // Handle escape sequences in replacement (like \n)
        const replacementText = rule.replacement.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        result = result.replace(regex, replacementText);
      } catch (error) {
        console.error(`Error applying rule ${rule.name}:`, error);
      }
    });

    setTestResult(result);
  };

  // Available presets that aren't already added
  const availablePresets = DEFAULT_REGEX_RULES.filter(preset =>
    !rules.some(rule => rule.name === preset.name)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-indigo-600 dark:text-primary" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            قواعد التنظيف المخصصة (Regex Playground)
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTestPanel(!showTestPanel)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 dark:bg-input dark:hover:bg-white/5 dark:border-subtle dark:text-textMuted flex items-center gap-1"
          >
            <TestTube2 className="w-3 h-3" />
            {showTestPanel ? 'إخفاء الاختبار' : 'اختبار القواعد'}
          </button>
          <button
            onClick={handleAddRule}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-primary/10 dark:hover:bg-primary/20 dark:border-primary dark:text-primary flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            إضافة قاعدة
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3 flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-800 dark:text-blue-300">
          <p className="font-semibold mb-1">ما فائدة قواعد Regex المخصصة؟</p>
          <p>
            تسمح لك بحذف الهوامش والرؤوس والتذييلات المزعجة (مثل أرقام الصفحات، أسماء المطابع المتكررة)
            التي تكسر سياق الجمل أثناء التقطيع (Chunking) والفهرسة. استخدم القواعد الجاهزة أو أضف قواعدك الخاصة.
          </p>
        </div>
      </div>

      {/* Test Panel */}
      {showTestPanel && (
        <div className="bg-slate-50 dark:bg-input border border-slate-200 dark:border-subtle rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-white mb-2">
              النص التجريبي (اكتب نصاً لاختبار القواعد)
            </label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-background border border-slate-200 dark:border-subtle rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-primary focus:border-transparent resize-none text-slate-800 dark:text-white font-mono"
              rows={4}
              placeholder="مثال: هذا نص تجريبي&#10;- 123 -&#10;مطبعة الهلال 2020&#10;حقوق النشر محفوظة"
              dir="rtl"
            />
          </div>
          <button
            onClick={handleTestRules}
            disabled={!testText}
            className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:bg-primary dark:hover:bg-primary/80 dark:disabled:bg-subtle text-white transition-colors"
          >
            تطبيق القواعد
          </button>
          {testResult && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-white mb-2">
                النتيجة بعد التنظيف
              </label>
              <div className="w-full px-3 py-2 text-sm bg-white dark:bg-background border border-slate-200 dark:border-subtle rounded-lg text-slate-800 dark:text-white font-mono whitespace-pre-wrap" dir="rtl">
                {testResult || '(نص فارغ)'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preset Rules */}
      {availablePresets.length > 0 && (
        <div className="bg-slate-50 dark:bg-input border border-slate-200 dark:border-subtle rounded-lg p-3">
          <div className="text-xs font-semibold text-slate-600 dark:text-textMuted mb-2">
            قواعد جاهزة (اضغط لإضافتها)
          </div>
          <div className="flex flex-wrap gap-2">
            {availablePresets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleAddPreset(preset)}
                className="px-2 py-1 text-xs rounded-md bg-white dark:bg-background border border-slate-200 dark:border-subtle hover:border-indigo-300 dark:hover:border-primary hover:bg-indigo-50 dark:hover:bg-primary/10 text-slate-700 dark:text-white transition-colors"
                title={preset.description}
              >
                + {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-2">
        {rules.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-textMuted text-sm">
            لا توجد قواعد مخصصة. اضغط "إضافة قاعدة" أو اختر من القواعد الجاهزة.
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={`border rounded-lg p-3 transition-all ${
                rule.enabled
                  ? 'bg-white dark:bg-card border-slate-200 dark:border-subtle'
                  : 'bg-slate-50 dark:bg-input border-slate-100 dark:border-subtle opacity-60'
              }`}
            >
              {editingId === rule.id && editForm ? (
                // Edit Mode
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-textMuted mb-1">
                      اسم القاعدة
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-2 py-1 text-sm bg-white dark:bg-background border border-slate-200 dark:border-subtle rounded focus:ring-2 focus:ring-indigo-500 dark:focus:ring-primary focus:border-transparent text-slate-800 dark:text-white"
                      dir="rtl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-textMuted mb-1">
                        النمط (Pattern)
                      </label>
                      <input
                        type="text"
                        value={editForm.pattern}
                        onChange={(e) => setEditForm({ ...editForm, pattern: e.target.value })}
                        className="w-full px-2 py-1 text-sm bg-white dark:bg-background border border-slate-200 dark:border-subtle rounded focus:ring-2 focus:ring-indigo-500 dark:focus:ring-primary focus:border-transparent font-mono text-slate-800 dark:text-white"
                        placeholder="^\d+$"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-textMuted mb-1">
                        الاستبدال (Replacement)
                      </label>
                      <input
                        type="text"
                        value={editForm.replacement}
                        onChange={(e) => setEditForm({ ...editForm, replacement: e.target.value })}
                        className="w-full px-2 py-1 text-sm bg-white dark:bg-background border border-slate-200 dark:border-subtle rounded focus:ring-2 focus:ring-indigo-500 dark:focus:ring-primary focus:border-transparent font-mono text-slate-800 dark:text-white"
                        placeholder=""
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-textMuted mb-1">
                        الأعلام (Flags)
                      </label>
                      <input
                        type="text"
                        value={editForm.flags}
                        onChange={(e) => setEditForm({ ...editForm, flags: e.target.value })}
                        className="w-full px-2 py-1 text-sm bg-white dark:bg-background border border-slate-200 dark:border-subtle rounded focus:ring-2 focus:ring-indigo-500 dark:focus:ring-primary focus:border-transparent font-mono text-slate-800 dark:text-white"
                        placeholder="g, gi, gm"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-textMuted mb-1">
                        الوصف (اختياري)
                      </label>
                      <input
                        type="text"
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full px-2 py-1 text-sm bg-white dark:bg-background border border-slate-200 dark:border-subtle rounded focus:ring-2 focus:ring-indigo-500 dark:focus:ring-primary focus:border-transparent text-slate-800 dark:text-white"
                        dir="rtl"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 hover:bg-indigo-700 dark:bg-primary dark:hover:bg-primary/80 text-white transition-colors flex items-center justify-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      حفظ
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-slate-200 hover:bg-slate-300 dark:bg-subtle dark:hover:bg-white/10 text-slate-700 dark:text-white transition-colors flex items-center justify-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm text-slate-800 dark:text-white truncate">
                        {rule.name}
                      </h4>
                      {!rule.enabled && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-subtle text-slate-600 dark:text-textMuted rounded">
                          معطلة
                        </span>
                      )}
                    </div>
                    {rule.description && (
                      <p className="text-xs text-slate-500 dark:text-textMuted mb-2">
                        {rule.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-background text-slate-600 dark:text-textMuted rounded">
                        Pattern: {rule.pattern}
                      </span>
                      <span className="px-2 py-1 bg-slate-100 dark:bg-background text-slate-600 dark:text-textMuted rounded">
                        Replace: {rule.replacement || '(فارغ)'}
                      </span>
                      {rule.flags && (
                        <span className="px-2 py-1 bg-slate-100 dark:bg-background text-slate-600 dark:text-textMuted rounded">
                          Flags: {rule.flags}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className={`p-1.5 rounded transition-colors ${
                        rule.enabled
                          ? 'text-green-600 dark:text-secondary hover:bg-green-50 dark:hover:bg-secondary/10'
                          : 'text-slate-400 dark:text-textMuted hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                      title={rule.enabled ? 'تعطيل' : 'تفعيل'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStartEdit(rule)}
                      className="p-1.5 rounded text-indigo-600 dark:text-primary hover:bg-indigo-50 dark:hover:bg-primary/10 transition-colors"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

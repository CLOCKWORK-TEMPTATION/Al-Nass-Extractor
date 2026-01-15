
import React, { useState, useEffect } from 'react';
import { Archive, Download, Upload, Trash2, RefreshCw, Save, Activity } from 'lucide-react';
import { ExtractedFile, NovelStructure, ChunkingResult, EnrichedChunk } from '../types';

export interface ProjectState {
  id: string;
  timestamp: number;
  name: string;
  files: ExtractedFile[];
  structure: NovelStructure | null;
  chunks: ChunkingResult | null;
  enriched: EnrichedChunk[];
}

interface ArchivingViewProps {
  currentFiles: ExtractedFile[];
  currentStructure: NovelStructure | null;
  currentChunks: ChunkingResult | null;
  currentEnriched: EnrichedChunk[];
  onRestore: (project: ProjectState) => void;
}

export const ArchivingView: React.FC<ArchivingViewProps> = ({
  currentFiles,
  currentStructure,
  currentChunks,
  currentEnriched,
  onRestore
}) => {
  const [localArchives, setLocalArchives] = useState<ProjectState[]>([]);

  useEffect(() => {
    loadArchives();
  }, []);

  const loadArchives = () => {
    try {
      const stored = localStorage.getItem('al_nass_archives');
      if (stored) {
        setLocalArchives(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load archives", e);
    }
  };

  const saveToLocal = () => {
    if (currentFiles.length === 0 && !currentStructure) return;

    const name = currentStructure?.novel_metadata.title || currentFiles[0]?.name || "Untitled Project";
    
    const project: ProjectState = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      name: name,
      files: currentFiles,
      structure: currentStructure,
      chunks: currentChunks,
      enriched: currentEnriched
    };

    const updated = [project, ...localArchives].slice(0, 10); // Keep last 10
    localStorage.setItem('al_nass_archives', JSON.stringify(updated));
    setLocalArchives(updated);
  };

  const deleteArchive = (id: string) => {
    const updated = localArchives.filter(a => a.id !== id);
    localStorage.setItem('al_nass_archives', JSON.stringify(updated));
    setLocalArchives(updated);
  };

  const downloadProject = () => {
     const name = currentStructure?.novel_metadata.title || "project";
     const project = {
        meta: {
            exported_at: new Date().toISOString(),
            version: "1.0"
        },
        data: {
            id: Date.now().toString(),
            timestamp: Date.now(),
            name: name,
            files: currentFiles,
            structure: currentStructure,
            chunks: currentChunks,
            enriched: currentEnriched
        }
     };
     
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alnass_archive_${name}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const content = JSON.parse(ev.target?.result as string);
            // Support both full export format (wrapped in data) and internal ProjectState format
            const data = content.data || content; 
            
            // Map to ProjectState
            const project: ProjectState = {
                id: data.id || Date.now().toString(),
                timestamp: data.timestamp || Date.now(),
                name: data.name || "Imported Project",
                files: data.files || [],
                structure: data.structure || null,
                chunks: data.chunks || null,
                enriched: data.enriched || []
            };
            onRestore(project);
            // Reset input
            e.target.value = '';
        } catch (err) {
            alert("فشل قراءة ملف الأرشيف. التأكد من صيغة JSON.");
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
       {/* Current Session Actions */}
       <div className="glass-panel rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6 border-b border-subtle pb-4">
             <div className="p-2 bg-primary/20 rounded-lg">
                <Archive className="w-6 h-6 text-primary" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-white">إدارة الأرشيف (Project Archiving)</h2>
               <p className="text-sm text-textMuted">حفظ، استرجاع، وتصدير حالة المشروع بالكامل.</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-4 bg-input rounded-lg border border-subtle">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-secondary" />
                    الحالة الحالية
                </h3>
                <ul className="space-y-2 text-sm text-textMuted mb-4">
                    <li className="flex justify-between">
                        <span>الملفات المستخرجة:</span>
                        <span className="font-mono font-bold text-white">{currentFiles.length}</span>
                    </li>
                     <li className="flex justify-between">
                        <span>هيكل الرواية:</span>
                        <span className={`font-bold ${currentStructure ? 'text-secondary' : 'text-textMuted'}`}>
                            {currentStructure ? 'موجود' : 'غير متوفر'}
                        </span>
                    </li>
                     <li className="flex justify-between">
                        <span>المقاطع (Chunks):</span>
                        <span className="font-mono font-bold text-white">{currentChunks?.chunks.length || 0}</span>
                    </li>
                     <li className="flex justify-between">
                        <span>البيانات المثراة:</span>
                        <span className="font-mono font-bold text-white">{currentEnriched.length}</span>
                    </li>
                </ul>
                <div className="flex gap-2">
                    <button 
                        onClick={saveToLocal}
                        disabled={currentFiles.length === 0}
                        className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-semibold hover:bg-primary/80 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <Save className="w-4 h-4" />
                        حفظ محلي
                    </button>
                    <button 
                         onClick={downloadProject}
                         disabled={currentFiles.length === 0}
                         className="flex-1 bg-surface border border-subtle text-textMuted py-2 rounded-lg text-sm font-semibold hover:bg-white/5 hover:text-white disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        تصدير JSON
                    </button>
                </div>
             </div>

             <div className="p-4 bg-input rounded-lg border border-subtle flex flex-col justify-center items-center text-center">
                 <Upload className="w-10 h-10 text-textMuted/50 mb-2" />
                 <h3 className="font-bold text-white mb-1">استيراد مشروع</h3>
                 <p className="text-xs text-textMuted mb-4">رفع ملف JSON تم تصديره سابقاً لاستكمال العمل.</p>
                 <label className="cursor-pointer bg-surface border border-primary/50 text-primary px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/10 transition-colors">
                    اختيار ملف
                    <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                 </label>
             </div>
          </div>
       </div>

       {/* Local Archives List */}
       <div className="glass-panel rounded-xl shadow-lg border border-subtle overflow-hidden">
          <div className="bg-surface/50 px-6 py-4 border-b border-subtle">
             <h3 className="font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-textMuted" />
                المحفوظات المحلية (Local Storage)
             </h3>
          </div>
          <div className="divide-y divide-subtle">
             {localArchives.length === 0 ? (
                 <div className="p-8 text-center text-textMuted text-sm">
                    لا توجد مشاريع محفوظة محلياً.
                 </div>
             ) : (
                 localArchives.map((archive) => (
                     <div key={archive.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div>
                            <h4 className="font-bold text-white">{archive.name}</h4>
                            <div className="text-xs text-textMuted flex gap-3 mt-1">
                                <span>{new Date(archive.timestamp).toLocaleString()}</span>
                                <span>• {archive.chunks?.chunks.length || 0} Chunks</span>
                                <span>• {archive.enriched?.length || 0} Enriched</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => onRestore(archive)}
                                className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded hover:bg-primary/20"
                            >
                                استعادة
                            </button>
                            <button 
                                onClick={() => deleteArchive(archive.id)}
                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                     </div>
                 ))
             )}
          </div>
       </div>
    </div>
  );
};

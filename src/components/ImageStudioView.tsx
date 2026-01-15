
import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Wand2, ScanEye, Upload, Download, Loader2, AlertCircle } from 'lucide-react';
import { analyzeImage, editImage } from '../services/mediaService';

export const ImageStudioView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'analyze' | 'edit'>('analyze');
  
  // Analysis State
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Edit State
  const [editPrompt, setEditPrompt] = useState('');
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      // Reset states
      setAnalysisResult('');
      setEditedImageUrl(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeImage(selectedFile);
      setAnalysisResult(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedFile || !editPrompt) return;
    setIsEditing(true);
    setError(null);
    setEditedImageUrl(null);
    try {
      const resultUrl = await editImage(selectedFile, editPrompt);
      setEditedImageUrl(resultUrl);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="glass-panel rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4 border-b border-subtle pb-3">
          <ImageIcon className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-white">ستوديو الصور (Image Studio)</h2>
            <p className="text-sm text-textMuted">تحليل وتعديل الصور باستخدام Gemini Vision & Imagen.</p>
          </div>
        </div>

        {/* Upload Zone */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-subtle hover:border-primary/50 bg-input/30 hover:bg-input/50 rounded-xl p-8 text-center cursor-pointer transition-all mb-6"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/png, image/jpeg, image/webp" 
          />
          {previewUrl ? (
            <div className="flex flex-col items-center">
              <img src={previewUrl} alt="Preview" className="h-64 object-contain rounded-lg shadow-lg mb-4" />
              <p className="text-sm text-textMuted">اضغط لتغيير الصورة</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-textMuted">
              <Upload className="w-10 h-10 mb-2 opacity-50" />
              <p className="font-medium">اضغط لرفع صورة أو قم بسحبها هنا</p>
              <p className="text-xs">PNG, JPG, WEBP</p>
            </div>
          )}
        </div>

        {/* Tools Tabs */}
        {selectedFile && (
          <div>
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => setActiveMode('analyze')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                  activeMode === 'analyze' 
                    ? 'bg-primary text-white' 
                    : 'bg-input text-textMuted hover:text-white'
                }`}
              >
                <ScanEye className="w-4 h-4" /> تحليل الصورة
              </button>
              <button 
                onClick={() => setActiveMode('edit')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                  activeMode === 'edit' 
                    ? 'bg-secondary text-white' 
                    : 'bg-input text-textMuted hover:text-white'
                }`}
              >
                <Wand2 className="w-4 h-4" /> تعديل ذكي
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Analyze Mode */}
            {activeMode === 'analyze' && (
              <div className="animate-in fade-in">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                >
                  {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanEye className="w-5 h-5" />}
                  {isAnalyzing ? 'جاري التحليل...' : 'بدء التحليل (Gemini 3 Pro)'}
                </button>

                {analysisResult && (
                  <div className="mt-6 p-4 bg-surface rounded-lg border border-subtle text-white leading-relaxed whitespace-pre-wrap font-arabic">
                    {analysisResult}
                  </div>
                )}
              </div>
            )}

            {/* Edit Mode */}
            {activeMode === 'edit' && (
              <div className="animate-in fade-in space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-textMuted">وصف التعديل المطلوب</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="مثال: اجعل الخلفية غابة استوائية، أضف نظارة شمسية..."
                      className="flex-1 bg-input border border-subtle rounded-lg px-4 py-3 text-white focus:border-secondary outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                    />
                    <button
                      onClick={handleEdit}
                      disabled={isEditing || !editPrompt}
                      className="bg-secondary text-white px-6 rounded-lg font-bold hover:bg-secondary/80 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isEditing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-textMuted">Powered by Gemini 2.5 Flash Image</p>
                </div>

                {editedImageUrl && (
                  <div className="mt-6 flex flex-col items-center">
                    <div className="relative group">
                      <img src={editedImageUrl} alt="Edited" className="max-h-[500px] w-full object-contain rounded-lg border border-subtle shadow-xl" />
                      <a 
                        href={editedImageUrl} 
                        download="edited_image.png"
                        className="absolute bottom-4 right-4 bg-black/70 hover:bg-black text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="تحميل الصورة"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                    <p className="mt-2 text-sm text-green-400 flex items-center gap-1">
                      <Wand2 className="w-3 h-3" /> تم التعديل بنجاح
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

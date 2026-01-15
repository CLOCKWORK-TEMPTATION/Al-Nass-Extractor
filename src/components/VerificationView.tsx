
import React, { useState, useRef, useEffect } from 'react';
import { ExtractedFile, PDFPageImage } from '../types';
import { CheckCircle, AlertCircle, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';

interface VerificationViewProps {
  files: ExtractedFile[];
}

export const VerificationView: React.FC<VerificationViewProps> = ({ files }) => {
  const [selectedFile, setSelectedFile] = useState<ExtractedFile | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [editedText, setEditedText] = useState('');
  const [syncScroll, setSyncScroll] = useState(true);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Filter only completed PDF files
  const pdfFiles = files.filter(f => f.status === 'completed' && f.isPDF && f.pdfPages && f.pdfPages.length > 0);

  useEffect(() => {
    if (selectedFile && selectedFile.extractedText) {
      setEditedText(selectedFile.extractedText);
      setCurrentPage(0);
      setZoom(100);
    }
  }, [selectedFile]);

  // Sync scrolling between text and image
  useEffect(() => {
    if (!syncScroll || !selectedFile || !textAreaRef.current || !imageContainerRef.current) return;

    const handleTextScroll = () => {
      if (!textAreaRef.current || !imageContainerRef.current || !selectedFile?.pdfPages) return;

      const textArea = textAreaRef.current;
      const scrollPercentage = textArea.scrollTop / (textArea.scrollHeight - textArea.clientHeight);

      // Map scroll percentage to pages
      const totalPages = selectedFile.pdfPages.length;
      const targetPage = Math.floor(scrollPercentage * totalPages);

      if (targetPage !== currentPage && targetPage >= 0 && targetPage < totalPages) {
        setCurrentPage(targetPage);
      }
    };

    const textArea = textAreaRef.current;
    textArea.addEventListener('scroll', handleTextScroll);

    return () => {
      textArea.removeEventListener('scroll', handleTextScroll);
    };
  }, [syncScroll, selectedFile, currentPage]);

  const handleFileSelect = (file: ExtractedFile) => {
    setSelectedFile(file);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 0));
  };

  const handleNextPage = () => {
    if (selectedFile?.pdfPages) {
      setCurrentPage(prev => Math.min(prev + 1, selectedFile.pdfPages!.length - 1));
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedText(e.target.value);
  };

  if (pdfFiles.length === 0) {
    return (
      <div className="glass-panel p-8 text-center">
        <div className="flex flex-col items-center gap-4 text-textMuted">
          <FileText className="w-16 h-16 opacity-50" />
          <div>
            <h3 className="text-xl font-bold text-white mb-2">لا توجد ملفات PDF للتحقق منها</h3>
            <p className="text-sm">قم برفع ومعالجة ملف PDF أولاً في تبويب "الاستخراج"</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* File Selector */}
      <div className="glass-panel p-4">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          اختر ملفاً للتحقق منه
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {pdfFiles.map(file => (
            <button
              key={file.id}
              onClick={() => handleFileSelect(file)}
              className={`p-4 rounded-lg border-2 transition-all text-right ${
                selectedFile?.id === file.id
                  ? 'border-primary bg-primary/10'
                  : 'border-subtle bg-surface hover:border-primary/50 hover:bg-surface/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-input rounded border border-subtle">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{file.name}</p>
                  <p className="text-xs text-textMuted mt-1">
                    {file.pdfPages?.length || 0} صفحة • {file.wordCount || 0} كلمة
                  </p>
                </div>
                {selectedFile?.id === file.id && (
                  <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Verification Interface */}
      {selectedFile && selectedFile.pdfPages && (
        <div className="glass-panel p-6">
          {/* Controls */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-subtle">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-white">محرر المقارنة والتدقيق</h3>
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">
                الصفحة {currentPage + 1} من {selectedFile.pdfPages.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-textMuted cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncScroll}
                  onChange={(e) => setSyncScroll(e.target.checked)}
                  className="w-4 h-4 rounded border-subtle bg-input checked:bg-primary checked:border-primary"
                />
                مزامنة التمرير
              </label>
            </div>
          </div>

          {/* Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Right Side - PDF Image */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-white">الصورة الأصلية</span>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-surface rounded-lg p-1 border border-subtle">
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 hover:bg-white/5 rounded transition-colors"
                    title="تصغير"
                  >
                    <ZoomOut className="w-4 h-4 text-textMuted" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="px-2 py-1 hover:bg-white/5 rounded transition-colors min-w-[50px]"
                    title="إعادة التعيين"
                  >
                    <span className="text-xs text-textMuted">{zoom}%</span>
                  </button>
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 hover:bg-white/5 rounded transition-colors"
                    title="تكبير"
                  >
                    <ZoomIn className="w-4 h-4 text-textMuted" />
                  </button>
                </div>
              </div>

              {/* Image Container */}
              <div
                ref={imageContainerRef}
                className="bg-surface border border-subtle rounded-lg overflow-auto"
                style={{ height: '600px' }}
              >
                {selectedFile.pdfPages[currentPage] ? (
                  <div className="flex items-center justify-center min-h-full p-4">
                    <img
                      src={selectedFile.pdfPages[currentPage].imageData}
                      alt={`Page ${currentPage + 1}`}
                      className="max-w-full h-auto shadow-lg"
                      style={{
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'center top',
                        transition: 'transform 0.2s ease-out'
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-textMuted">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">جاري تحميل الصورة...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Page Navigation */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 0}
                  className="p-2 bg-surface border border-subtle rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-textMuted" />
                </button>

                <div className="px-4 py-2 bg-surface border border-subtle rounded-lg">
                  <span className="text-sm text-white">
                    {currentPage + 1} / {selectedFile.pdfPages.length}
                  </span>
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage === selectedFile.pdfPages.length - 1}
                  className="p-2 bg-surface border border-subtle rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-textMuted" />
                </button>
              </div>
            </div>

            {/* Left Side - Extracted Text Editor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-secondary" />
                  <span className="text-sm font-medium text-white">النص المستخرج (قابل للتعديل)</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-textMuted">
                  <span>{editedText.split(/\s+/).length} كلمة</span>
                  <span>•</span>
                  <span>{editedText.length} حرف</span>
                </div>
              </div>

              <textarea
                ref={textAreaRef}
                value={editedText}
                onChange={handleTextChange}
                className="w-full bg-input border border-subtle rounded-lg p-4 text-white text-lg leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 font-arabic"
                style={{
                  height: '600px',
                  fontFamily: "'Noto Kufi Arabic', sans-serif",
                  direction: 'rtl'
                }}
                placeholder="النص المستخرج سيظهر هنا..."
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigator.clipboard.writeText(editedText)}
                  className="flex-1 px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                >
                  نسخ النص المعدل
                </button>
                <button
                  onClick={() => setEditedText(selectedFile.extractedText)}
                  className="flex-1 px-4 py-2 bg-surface border border-subtle text-white rounded-lg hover:bg-white/5 transition-colors text-sm font-medium"
                >
                  إعادة تعيين
                </button>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs text-textMuted">
              <strong className="text-primary">نصيحة:</strong> يمكنك التمرير في النص لمشاهدة الصفحة المقابلة تلقائياً.
              قم بتعديل النص مباشرة إذا وجدت أخطاء في الاستخراج. استخدم أزرار التكبير/التصغير لرؤية تفاصيل الصورة بشكل أفضل.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

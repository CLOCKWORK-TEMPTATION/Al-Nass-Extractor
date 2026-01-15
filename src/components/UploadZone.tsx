
import React, { useRef, useState } from 'react';
import { UploadCloud, FileType as FileIcon, AlertTriangle, XCircle } from 'lucide-react';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
<<<<<<< HEAD
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'text/plain', // TXT
  'text/csv', // CSV
  'application/json' // JSON
=======
  'application/epub+zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
>>>>>>> 0c90ff251e7c572ef83423c7b1a71c1d8dd3948d
];

export const UploadZone: React.FC<UploadZoneProps> = ({ onFilesSelected, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  const validateAndUpload = (files: File[]) => {
    setErrorMessages([]);
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      let isValid = true;

      // Validate Empty File
      if (file.size === 0) {
        errors.push(`❌ ${file.name}: الملف فارغ (0 bytes)`);
        isValid = false;
      }
<<<<<<< HEAD
      // Validate Type (MIME type or Extension)
      else if (!ALLOWED_TYPES.includes(file.type) && !['pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'txt', 'csv', 'json'].includes(file.name.split('.').pop()?.toLowerCase() || '')) {
        errors.push(`❌ ${file.name}: نوع الملف غير مدعوم. المسموح: PDF, JPG, Word (DOCX), TXT, CSV, JSON`);
=======
      // Validate Type
      else if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`❌ ${file.name}: نوع الملف غير مدعوم. المسموح: PDF, EPUB, DOCX, JPG, PNG, WEBP`);
>>>>>>> 0c90ff251e7c572ef83423c7b1a71c1d8dd3948d
        isValid = false;
      } 
      // Validate Size
      else if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        errors.push(`⚠️ ${file.name}: الحجم (${sizeMB}MB) يتجاوز الحد الأقصى (20MB)`);
        isValid = false;
      }

      if (isValid) {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      setErrorMessages(errors);
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleClick = () => {
    if (!isProcessing) {
        // Clear previous errors when starting a new selection
        setErrorMessages([]);
        fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(Array.from(e.target.files));
      // Reset input to allow re-selecting the same file if corrected
      e.target.value = '';
    }
  };

  const clearErrors = (e: React.MouseEvent) => {
    e.stopPropagation();
    setErrorMessages([]);
  };

  return (
    <div className="mb-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 cursor-pointer
          ${isDragging 
            ? 'border-indigo-500 bg-indigo-50 scale-[1.01] dark:border-primary dark:bg-primary/10' 
            : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50 bg-white dark:bg-input dark:border-subtle dark:hover:border-primary/50 dark:hover:bg-surface/50'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          ${errorMessages.length > 0 ? 'border-red-300 bg-red-50/30 dark:border-red-400 dark:bg-red-500/10' : ''}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          disabled={isProcessing}
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className={`p-4 rounded-full ${
            isDragging 
              ? 'bg-indigo-100 dark:bg-primary/20' 
              : (errorMessages.length > 0 ? 'bg-red-100 dark:bg-red-500/20' : 'bg-slate-100 dark:bg-surface border dark:border-subtle')
          }`}>
            {errorMessages.length > 0 ? (
              <AlertTriangle className={`w-8 h-8 ${errorMessages.length > 0 ? 'text-red-500 dark:text-red-400' : ''}`} />
            ) : (
              <UploadCloud className={`w-8 h-8 ${isDragging ? 'text-indigo-600 dark:text-primary' : 'text-slate-500 dark:text-textMuted'}`} />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-white mb-1">
              اضغط لرفع الملفات أو قم بسحبها هنا
            </h3>
            <p className="text-slate-500 dark:text-textMuted text-sm">
<<<<<<< HEAD
              يدعم ملفات PDF, PNG, JPG, DOCX, TXT, CSV, JSON (الحد الأقصى 20 ميجابايت)
=======
              يدعم ملفات PDF, EPUB, DOCX, PNG, JPG (الحد الأقصى 20 ميجابايت)
>>>>>>> 0c90ff251e7c572ef83423c7b1a71c1d8dd3948d
            </p>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap justify-center">
            <span className="px-2 py-1 bg-slate-100 dark:bg-surface dark:border dark:border-subtle text-slate-500 dark:text-textMuted rounded text-xs flex items-center gap-1">
              <FileIcon className="w-3 h-3" /> PDF
            </span>
            <span className="px-2 py-1 bg-slate-100 dark:bg-surface dark:border dark:border-subtle text-slate-500 dark:text-textMuted rounded text-xs flex items-center gap-1">
              <FileIcon className="w-3 h-3" /> EPUB
            </span>
            <span className="px-2 py-1 bg-slate-100 dark:bg-surface dark:border dark:border-subtle text-slate-500 dark:text-textMuted rounded text-xs flex items-center gap-1">
              <FileIcon className="w-3 h-3" /> DOCX
            </span>
            <span className="px-2 py-1 bg-slate-100 dark:bg-surface dark:border dark:border-subtle text-slate-500 dark:text-textMuted rounded text-xs flex items-center gap-1">
              <FileIcon className="w-3 h-3" /> Images
            </span>
            <span className="px-2 py-1 bg-slate-100 dark:bg-surface dark:border dark:border-subtle text-slate-500 dark:text-textMuted rounded text-xs flex items-center gap-1">
              <FileIcon className="w-3 h-3" /> DOCX
            </span>
            <span className="px-2 py-1 bg-slate-100 dark:bg-surface dark:border dark:border-subtle text-slate-500 dark:text-textMuted rounded text-xs flex items-center gap-1">
              <FileIcon className="w-3 h-3" /> TXT
            </span>
            <span className="px-2 py-1 bg-slate-100 dark:bg-surface dark:border dark:border-subtle text-slate-500 dark:text-textMuted rounded text-xs flex items-center gap-1">
              <FileIcon className="w-3 h-3" /> CSV
            </span>
            <span className="px-2 py-1 bg-slate-100 dark:bg-surface dark:border dark:border-subtle text-slate-500 dark:text-textMuted rounded text-xs flex items-center gap-1">
              <FileIcon className="w-3 h-3" /> JSON
            </span>
          </div>
        </div>
      </div>
      
      {errorMessages.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 rounded-lg animate-in fade-in slide-in-from-top-2 relative">
           <button 
             onClick={clearErrors}
             className="absolute top-2 left-2 text-red-400 hover:text-red-700 dark:hover:text-red-300"
             title="إخفاء التنبيهات"
           >
             <XCircle className="w-5 h-5" />
           </button>
           <h4 className="font-bold text-red-800 dark:text-red-400 text-sm mb-2 flex items-center gap-2">
             <AlertTriangle className="w-4 h-4" />
             تم استبعاد بعض الملفات:
           </h4>
           <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
             {errorMessages.map((msg, idx) => (
               <li key={idx}>{msg}</li>
             ))}
           </ul>
        </div>
      )}
    </div>
  );
};

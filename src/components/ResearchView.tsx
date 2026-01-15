
import React, { useState } from 'react';
import { Globe, Search, ArrowRight, Loader2, ExternalLink, BookOpen } from 'lucide-react';
import { searchWithGrounding } from '../services/mediaService';

export const ResearchView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ text: string, sources: any[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setResult(null);
    try {
      const response = await searchWithGrounding(query);
      setResult(response);
    } catch (e: any) {
      setResult({ text: "حدث خطأ أثناء البحث: " + e.message, sources: [] });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="glass-panel rounded-xl shadow-lg p-8 min-h-[500px] flex flex-col">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/30">
            <Globe className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">البحث الذكي (Smart Research)</h2>
          <p className="text-textMuted">إجابات دقيقة ومحدثة مدعومة بمحرك بحث Google.</p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto w-full mb-8">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اسأل عن سياق تاريخي، مؤلف، أو معلومة عامة..."
            className="w-full bg-input border border-subtle rounded-full py-4 pl-14 pr-14 text-lg text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-lg transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-textMuted w-5 h-5" />
          <button 
            onClick={handleSearch}
            disabled={isSearching || !query}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary/80 text-white p-2 rounded-full transition-colors disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-surface/50 rounded-xl border border-subtle p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-secondary" />
                الإجابة
              </h3>
              <div className="prose prose-invert max-w-none text-white/90 leading-relaxed font-arabic whitespace-pre-wrap">
                {result.text}
              </div>
            </div>

            {/* Sources */}
            {result.sources.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-textMuted uppercase mb-3 px-2">المصادر (Sources)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.sources.map((chunk: any, idx: number) => {
                    if (chunk.web?.uri) {
                      return (
                        <a 
                          key={idx} 
                          href={chunk.web.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-input border border-subtle rounded-lg hover:border-primary/50 hover:bg-white/5 transition-all group"
                        >
                          <div className="p-2 bg-surface rounded text-textMuted group-hover:text-primary">
                            <Globe className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">{chunk.web.title || "مصدر ويب"}</div>
                            <div className="text-xs text-textMuted truncate">{chunk.web.uri}</div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-textMuted opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

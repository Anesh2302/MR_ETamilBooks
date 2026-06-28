import React, { useState } from 'react';
import { translateText, translateDocument } from '../../services/translation';
import { FiGlobe, FiRepeat, FiUpload, FiCopy, FiCheck, FiArrowDown } from 'react-icons/fi';
import { toast } from 'react-toastify';

const languages: Record<string, string> = {
  ta: 'தமிழ்',
  en: 'English',
  hi: 'हिन्दी',
  ml: 'മലയാളം',
  te: 'తెలుగు',
  kn: 'ಕನ್ನಡ',
  bn: 'বাংলা',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  or: 'ଓଡ଼ିଆ',
  pa: 'ਪੰਜਾਬੀ',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  ja: '日本語',
  zh: '中文',
  ar: 'العربية',
  ru: 'Русский',
  pt: 'Português',
};

type Mode = 'text' | 'document';

export default function TranslatePage() {
  const [mode, setMode] = useState<Mode>('text');
  const [sourceText, setSourceText] = useState('');
  const [sourceLang, setSourceLang] = useState('ta');
  const [targetLang, setTargetLang] = useState('en');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  const swapLangs = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setLoading(true);
    try {
      const res = await translateText({ text: sourceText, source_language: sourceLang, target_language: targetLang });
      setTranslatedText(res.data.translated_text);
    } catch { toast.error('Translation failed'); }
    finally { setLoading(false); }
  };

  const handleDocTranslate = async () => {
    if (!docFile) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', docFile);
    formData.append('source_language', sourceLang);
    formData.append('target_language', targetLang);
    try {
      const res = await translateDocument(formData);
      setTranslatedText(res.data.translated_text);
      toast.success('Document translated!');
    } catch { toast.error('Document translation failed'); }
    finally { setLoading(false); }
  };

  const copyText = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
            <FiGlobe size={20} />
          </div>
          <div>
            <h1 className="section-title">Translation</h1>
            <p className="section-subtitle">Translate between 20+ languages</p>
          </div>
        </div>
      </div>

      <div className="card-glass p-6 md:p-8 animate-fade-in-up space-y-5">
        <div className="flex gap-1 glass p-1 rounded-xl w-fit" style={{ background: 'var(--bg-secondary)' }}>
          <button onClick={() => setMode('text')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${mode === 'text' ? 'bg-tamil-500/20 text-tamil-400 shadow-sm' : ''}`} style={{ color: mode === 'text' ? undefined : 'var(--text-primary)' }}>
            <FiGlobe size={14} className="inline mr-1.5" /> Text
          </button>
          <button onClick={() => setMode('document')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${mode === 'document' ? 'bg-tamil-500/20 text-tamil-400 shadow-sm' : ''}`} style={{ color: mode === 'document' ? undefined : 'var(--text-primary)' }}>
            <FiUpload size={14} className="inline mr-1.5" /> Document
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <select className="input-field" value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
              {Object.entries(languages).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </div>
          <button onClick={swapLangs} className="glass p-2.5 rounded-xl hover:bg-white/10 transition-colors" title="Swap languages">
            <FiRepeat size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <div className="flex-1">
            <select className="input-field" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
              {Object.entries(languages).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </div>
        </div>

        {mode === 'text' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Source Text</label>
              <textarea className="input-field h-40 resize-none" placeholder={`Enter text in ${languages[sourceLang]}...`} value={sourceText} onChange={(e) => setSourceText(e.target.value)} />
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sourceText.length} characters</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Translation ({languages[targetLang]})</label>
              <div className="input-field h-40 overflow-y-auto whitespace-pre-wrap" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="w-5 h-5 rounded-full border-2 border-tamil-400/30 border-t-tamil-400 animate-spin" />
                  </div>
                ) : translatedText}
              </div>
              {translatedText && !loading && (
                <button onClick={() => copyText('translation', translatedText)} className="mt-1 text-xs flex items-center gap-1 hover:text-tamil-400 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                  {copied === 'translation' ? <><FiCheck size={12} /> Copied</> : <><FiCopy size={12} /> Copy</>}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Upload Document</label>
              <div className="glass p-3 rounded-xl">
                <input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-violet-500/10 file:text-violet-400 hover:file:bg-violet-500/20 transition-colors cursor-pointer"
                  style={{ color: 'var(--text-secondary)' }} accept=".pdf,.doc,.docx,.txt" />
              </div>
              {docFile && <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{docFile.name} ({(docFile.size / 1024).toFixed(1)} KB)</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Translation</label>
              <div className="input-field h-32 overflow-y-auto whitespace-pre-wrap" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="w-5 h-5 rounded-full border-2 border-tamil-400/30 border-t-tamil-400 animate-spin" />
                  </div>
                ) : translatedText}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {mode === 'text' ? (
            <button onClick={handleTranslate} className="btn-primary inline-flex items-center gap-2" disabled={loading || !sourceText.trim()}>
              {loading ? (
                <><span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> Translating...</>
              ) : (
                <><FiGlobe size={16} /> Translate</>
              )}
            </button>
          ) : (
            <button onClick={handleDocTranslate} className="btn-primary inline-flex items-center gap-2" disabled={loading || !docFile}>
              {loading ? (
                <><span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> Translating...</>
              ) : (
                <><FiUpload size={16} /> Translate Document</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
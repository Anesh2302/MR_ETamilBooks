import React, { useEffect, useState, useRef } from 'react';
import { getLanguages, translateText, translateDocument, getTranslationHistory } from '../../services/translation';
import { FiUpload, FiCopy, FiCheck, FiDownload, FiRefreshCw, FiFileText } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

export default function Translate() {
  const { isAuthenticated } = useAuth();
  const [languages, setLanguages] = useState<any[]>([]);
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('ta');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'text' | 'document'>('text');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTranslating, setDocTranslating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getLanguages().then((res) => setLanguages(res.data)).catch(() => {});
    if (isAuthenticated) {
      getTranslationHistory().then((res) => setHistory(res.data.slice(0, 10))).catch(() => {});
    }
  }, [isAuthenticated]);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setLoading(true);
    try {
      const res = await translateText({ text: sourceText, source_language: sourceLang, target_language: targetLang });
      setTranslatedText(res.data.translated_text);
    } catch (err: any) {
      toast.error('Translation failed');
    } finally {
      setLoading(false);
    }
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const handleDocTranslate = async () => {
    if (!docFile) return;
    setDocTranslating(true);
    const formData = new FormData();
    formData.append('file', docFile);
    formData.append('source_language', sourceLang);
    formData.append('target_language', targetLang);
    try {
      await translateDocument(formData);
      toast.success('Document translation started! Check history.');
      setDocFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      toast.error('Document translation failed');
    } finally {
      setDocTranslating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Translation</h1>

      <div className="flex space-x-1 bg-white/5 rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab('text')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'text' ? 'bg-white/5 shadow-sm text-tamil-400' : 'text-gray-400'}`}>
          Text Translation
        </button>
        <button onClick={() => setActiveTab('document')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'document' ? 'bg-white/5 shadow-sm text-tamil-400' : 'text-gray-400'}`}>
          Document Upload
        </button>
      </div>

      {activeTab === 'text' ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <select className="input-field w-40" value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
              {languages.map((l: any) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
            <button onClick={swapLanguages} className="p-2 rounded-lg hover:bg-white/10"><FiRefreshCw className="text-gray-400" /></button>
            <select className="input-field w-40" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
              {languages.map((l: any) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <textarea
                className="input-field h-48 resize-none"
                placeholder="Enter text to translate..."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-400">{sourceText.length} characters</span>
                {sourceText && <button onClick={() => { setSourceText(''); setTranslatedText(''); }} className="text-xs text-red-500">Clear</button>}
              </div>
            </div>
            <div>
              <div className="input-field h-48 resize-none overflow-y-auto bg-white/5">
                {loading ? <div className="animate-pulse text-gray-400">Translating...</div> : translatedText || <span className="text-gray-400">Translation will appear here</span>}
              </div>
              {translatedText && (
                <button onClick={() => copyToClipboard(translatedText)} className="mt-2 text-sm text-gray-400 hover:text-tamil-400 flex items-center">
                  {copied ? <><FiCheck className="mr-1" /> Copied</> : <><FiCopy className="mr-1" /> Copy</>}
                </button>
              )}
            </div>
          </div>

          <button onClick={handleTranslate} className="btn-primary" disabled={loading || !sourceText.trim()}>
            {loading ? 'Translating...' : 'Translate'}
          </button>

          {isAuthenticated && history.length > 0 && (
            <div className="card mt-6">
              <h3 className="font-semibold text-white mb-3">Recent Translations</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((h: any) => (
                  <div key={h.id} className="text-sm p-2 bg-white/5 rounded flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-gray-300">{h.source_text}</p>
                      <p className="truncate text-white font-medium">{h.translated_text}</p>
                    </div>
                    <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">{h.source_language} → {h.target_language}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="text-center py-8">
            <FiFileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Upload Document for Translation</h2>
            <p className="text-gray-400 mb-6">Supports PDF, DOC, DOCX, TXT, RTF, ODT, PPTX</p>
            <div className="flex items-center justify-center space-x-4">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.pptx"
                onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                className="hidden"
                id="doc-upload"
              />
              <label htmlFor="doc-upload" className="btn-secondary cursor-pointer flex items-center">
                <FiUpload className="mr-2" /> Choose File
              </label>
              <button onClick={handleDocTranslate} className="btn-primary" disabled={!docFile || docTranslating}>
                {docTranslating ? 'Translating...' : 'Translate Document'}
              </button>
            </div>
            {docFile && (
              <p className="mt-4 text-sm text-gray-300">Selected: {docFile.name} ({(docFile.size / 1024).toFixed(1)} KB)</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

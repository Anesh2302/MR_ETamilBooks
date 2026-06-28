import React, { useState } from 'react';
import { summarize } from '../../services/translation';
import { FiFileText, FiCopy, FiCheck } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function SummarizePage() {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en');
  const [maxSentences, setMaxSentences] = useState(5);
  const [translateTo, setTranslateTo] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');

  const handleSummarize = async () => {
    if (!text.trim() || text.length < 50) {
      toast.warning('Text must be at least 50 characters');
      return;
    }
    setLoading(true);
    try {
      const payload: any = { text, language, max_sentences: maxSentences };
      if (translateTo) payload.translate_to = translateTo;
      const res = await summarize(payload);
      setResult(res.data);
      toast.success('Summary generated!');
    } catch (err) {
      toast.error('Summarization failed');
    } finally {
      setLoading(false);
    }
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
            <FiFileText size={20} />
          </div>
          <div>
            <h1 className="section-title">AI Summarizer</h1>
            <p className="section-subtitle">Summarize long documents, articles, and books</p>
          </div>
        </div>
      </div>

      <div className="card-glass p-6 md:p-8 animate-fade-in-up space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Language</label>
            <select className="input-field" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="ta">தமிழ்</option>
              <option value="hi">हिन्दी</option>
              <option value="ml">മലയാളം</option>
              <option value="fr">Français</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Max Sentences</label>
            <input type="number" min={2} max={20} className="input-field" value={maxSentences} onChange={(e) => setMaxSentences(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Translate to (optional)</label>
            <select className="input-field" value={translateTo} onChange={(e) => setTranslateTo(e.target.value)}>
              <option value="">No translation</option>
              <option value="ta">தமிழ்</option>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="ml">മലയാളം</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Text to Summarize</label>
          <textarea className="input-field h-48 resize-none" placeholder="Paste your text here (min 50 characters)..." value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{text.length} characters</span>
          </div>
        </div>

        <button onClick={handleSummarize} className="btn-primary inline-flex items-center gap-2" disabled={loading || text.length < 50}>
          {loading ? (
            <><span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> Summarizing...</>
          ) : (
            <><FiFileText size={16} /> Summarize</>
          )}
        </button>

        {result && (
          <div className="space-y-4 animate-fade-in">
            <div className="glass p-5 rounded-xl border-l-4" style={{ borderLeftColor: 'var(--text-primary)' }}>
              <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span className="w-2 h-2 rounded-full bg-teal-400" /> Summary
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{result.original_summary}</p>
              <button onClick={() => copyText('summary', result.original_summary)} className="mt-2 text-xs flex items-center gap-1 hover:text-tamil-400 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                {copied === 'summary' ? <><FiCheck size={12} /> Copied</> : <><FiCopy size={12} /> Copy</>}
              </button>
            </div>
            {result.translated_summary && (
              <div className="glass p-5 rounded-xl border-l-4" style={{ borderLeftColor: 'var(--text-primary)' }}>
                <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span className="w-2 h-2 rounded-full bg-tamil-400" /> Translated Summary ({result.translated_language})
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{result.translated_summary}</p>
                <button onClick={() => copyText('translated', result.translated_summary)} className="mt-2 text-xs flex items-center gap-1 hover:text-tamil-400 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                  {copied === 'translated' ? <><FiCheck size={12} /> Copied</> : <><FiCopy size={12} /> Copy</>}
                </button>
              </div>
            )}
            <div className="flex gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="glass px-3 py-1 rounded-lg">Compression: {result.compression_ratio}%</span>
              <span className="glass px-3 py-1 rounded-lg">Original sentences: {result.sentence_count}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
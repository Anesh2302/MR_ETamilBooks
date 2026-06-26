import React, { useState } from 'react';
import { summarize } from '../../services/translation';
import { FiFileText, FiCopy } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function SummarizePage() {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en');
  const [maxSentences, setMaxSentences] = useState(5);
  const [translateTo, setTranslateTo] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
    } catch (err) {
      toast.error('Summarization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">AI Summarizer</h1>
      <p className="text-gray-400">Summarize long documents, articles, and books</p>

      <div className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Language</label>
            <select className="input-field" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="ta">தமிழ்</option>
              <option value="hi">हिन्दी</option>
              <option value="ml">മലയാളം</option>
              <option value="fr">Français</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Max Sentences</label>
            <input type="number" min={2} max={20} className="input-field" value={maxSentences} onChange={(e) => setMaxSentences(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Translate to (optional)</label>
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
          <textarea className="input-field h-48 resize-none" placeholder="Paste your text here (min 50 characters)..." value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">{text.length} characters</span>
          </div>
        </div>

        <button onClick={handleSummarize} className="btn-primary flex items-center" disabled={loading || text.length < 50}>
          <FiFileText className="mr-2" />
          {loading ? 'Summarizing...' : 'Summarize'}
        </button>

        {result && (
          <div className="space-y-4">
            <div className="bg-tamil-500/10 rounded-lg p-4 border border-tamil-500/20">
              <h3 className="font-semibold text-tamil-400 mb-2">Summary</h3>
              <p className="text-gray-100">{result.original_summary}</p>
            </div>
            {result.translated_summary && (
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                <h3 className="font-semibold text-blue-400 mb-2">Translated Summary ({result.translated_language})</h3>
                <p className="text-gray-100">{result.translated_summary}</p>
              </div>
            )}
            <div className="flex space-x-4 text-sm text-gray-400">
              <span>Compression: {result.compression_ratio}%</span>
              <span>Original sentences: {result.sentence_count}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

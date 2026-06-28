import React, { useState } from 'react';
import { textToSpeech } from '../../services/translation';
import { FiVolume2, FiPlay, FiDownload } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { API_URL } from '../../services/api';

export default function TTSPage() {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('ta');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSynthesize = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await textToSpeech({ text, language });
      setAudioUrl(`${API_URL}${res.data.file_url}`);
      toast.success('Audio generated!');
    } catch (err) {
      toast.error('TTS generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <FiVolume2 size={20} />
          </div>
          <div>
            <h1 className="section-title">Text-to-Speech</h1>
            <p className="section-subtitle">Convert text to natural-sounding speech in Tamil, English & more</p>
          </div>
        </div>
      </div>

      <div className="card-glass p-6 md:p-8 animate-fade-in-up space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Language</label>
          <select className="input-field w-48" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="en">English</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="ml">മലയാളം (Malayalam)</option>
            <option value="te">తెలుగు (Telugu)</option>
            <option value="kn">ಕನ್ನಡ (Kannada)</option>
            <option value="bn">বাংলা (Bengali)</option>
            <option value="fr">Français (French)</option>
            <option value="de">Deutsch (German)</option>
            <option value="es">Español (Spanish)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Text to convert</label>
          <textarea className="input-field h-36 resize-none" placeholder="Enter text to convert to speech..." value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{text.length} characters</span>
          </div>
        </div>

        <button onClick={handleSynthesize} className="btn-primary inline-flex items-center gap-2" disabled={loading || !text.trim()}>
          {loading ? (
            <><span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> Generating...</>
          ) : (
            <><FiVolume2 size={16} /> Generate Speech</>
          )}
        </button>

        {audioUrl && (
          <div className="glass p-4 rounded-xl animate-fade-in">
            <audio controls className="w-full" autoPlay key={audioUrl}>
              <source src={audioUrl} type="audio/mpeg" />
            </audio>
          </div>
        )}
      </div>
    </div>
  );
}
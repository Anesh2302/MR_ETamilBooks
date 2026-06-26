import React, { useState } from 'react';
import { textToSpeech } from '../../services/translation';
import { FiVolume2 } from 'react-icons/fi';
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
      <h1 className="text-3xl font-bold text-white">Text-to-Speech</h1>
      <p className="text-gray-400">Convert text to natural-sounding speech in Tamil, English & more</p>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Language</label>
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
          <label className="block text-sm font-medium text-gray-200 mb-1">Text to convert</label>
          <textarea className="input-field h-36 resize-none" placeholder="Enter text to convert to speech..." value={text} onChange={(e) => setText(e.target.value)} />
        </div>

        <button onClick={handleSynthesize} className="btn-primary flex items-center" disabled={loading || !text.trim()}>
          <FiVolume2 className="mr-2" />
          {loading ? 'Generating...' : 'Generate Speech'}
        </button>

        {audioUrl && (
          <div className="bg-white/5 rounded-lg p-4">
            <audio controls className="w-full" autoPlay key={audioUrl}>
              <source src={audioUrl} type="audio/mpeg" />
            </audio>
          </div>
        )}
      </div>
    </div>
  );
}

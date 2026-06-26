import React, { useState } from 'react';
import { audioTranscribe } from '../../services/translation';
import { FiMic, FiUpload, FiPlay } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function AudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState('ta');
  const [targetLang, setTargetLang] = useState('en');
  const [result, setResult] = useState<{ transcribed_text: string; translated_text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTranscribe = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_language', sourceLang);
    formData.append('target_language', targetLang);
    try {
      const res = await audioTranscribe(formData);
      setResult(res.data);
      if (res.data.error) toast.warning(res.data.error);
    } catch (err) {
      toast.error('Audio transcription failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Audio Translation</h1>
      <p className="text-gray-400">Upload audio files to transcribe and translate speech</p>

      <div className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Audio Language</label>
            <select className="input-field" value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="ml">മലയാളം (Malayalam)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="fr">Français (French)</option>
              <option value="es">Español (Spanish)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Translate to</label>
            <select className="input-field" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
              <option value="en">English</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="ml">മലയാളം (Malayalam)</option>
              <option value="fr">Français (French)</option>
            </select>
          </div>
        </div>

        <div>
          <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-tamil-500/10 file:text-tamil-400 hover:file:bg-tamil-500/15" />
          {file && <p className="text-xs text-gray-400 mt-1">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
        </div>

        <button onClick={handleTranscribe} className="btn-primary flex items-center" disabled={!file || loading}>
          <FiMic className="mr-2" />
          {loading ? 'Processing...' : 'Transcribe & Translate'}
        </button>

        {result && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-white mb-2">Transcribed Text</h3>
              <div className="input-field min-h-[80px] bg-white/5">{result.transcribed_text || 'Could not transcribe audio'}</div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Translated Text</h3>
              <div className="input-field min-h-[80px] bg-white/5">{result.translated_text}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

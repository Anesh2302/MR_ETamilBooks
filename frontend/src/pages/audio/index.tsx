import React, { useState, useRef } from 'react';
import { audioTranscribe } from '../../services/translation';
import { FiMic, FiUpload, FiCopy, FiCheck, FiStopCircle, FiAlertTriangle } from 'react-icons/fi';
import { toast } from 'react-toastify';

const hasSpeechRecognition = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
const SpeechRecognition = typeof window !== 'undefined' ? (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition : null;

export default function AudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState('ta');
  const [targetLang, setTargetLang] = useState('en');
  const [result, setResult] = useState<{ transcribed_text: string; translated_text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');
  const [recording, setRecording] = useState(false);
  const [browserText, setBrowserText] = useState('');
  const recRef = useRef<any>(null);

  const startRecording = () => {
    if (!SpeechRecognition) { toast.error('Browser speech recognition not supported'); return; }
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = sourceLang === 'ta' ? 'ta-IN' : sourceLang === 'en' ? 'en-US' : sourceLang;
    rec.onresult = (e: any) => {
      let t = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        t += e.results[i][0].transcript;
      }
      setBrowserText(t);
    };
    rec.onerror = () => { setRecording(false); toast.error('Speech recognition error'); };
    rec.onend = () => setRecording(false);
    recRef.current = rec;
    rec.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (recRef.current) {
      recRef.current.stop();
      setRecording(false);
      if (browserText.trim()) {
        setResult({ transcribed_text: browserText, translated_text: browserText });
        toast.success('Speech captured!');
      }
    }
  };

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
      if (res.data.note) toast.info(res.data.note);
      else if (res.data.error) toast.warning(res.data.error);
      else toast.success('Audio processed!');
    } catch { toast.error('Audio transcription failed'); }
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
            <FiMic size={20} />
          </div>
          <div>
            <h1 className="section-title">Audio Transcription</h1>
            <p className="section-subtitle">Transcribe speech from audio files or your microphone</p>
          </div>
        </div>
      </div>

      <div className="card-glass p-6 md:p-8 animate-fade-in-up space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Audio Language</label>
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
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Translate to</label>
            <select className="input-field" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
              <option value="en">English</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="ml">മലയാളം (Malayalam)</option>
              <option value="fr">Français (French)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Option 1: Upload Audio File</h3>
            <div className="glass p-3 rounded-xl">
              <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-tamil-500/10 file:text-tamil-400 hover:file:bg-tamil-500/20 transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }} />
            </div>
            {file && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
            <button onClick={handleTranscribe} className="btn-primary w-full inline-flex items-center justify-center gap-2" disabled={!file || loading}>
              {loading ? <><span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> Processing...</> : <><FiUpload size={16} /> Transcribe & Translate</>}
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Option 2: Record from Microphone</h3>
            {hasSpeechRecognition ? (
              <>
                <div className="glass p-4 rounded-xl text-center min-h-[80px]">
                  {browserText ? (
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{browserText}</p>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Tap "Start Recording" and speak...</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!recording ? (
                    <button onClick={startRecording} className="btn-primary flex-1 inline-flex items-center justify-center gap-2">
                      <FiMic size={16} /> Start Recording
                    </button>
                  ) : (
                    <button onClick={stopRecording} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all">
                      <FiStopCircle size={16} /> Stop & Transcribe
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="glass p-4 rounded-xl text-center">
                <FiAlertTriangle size={20} className="mx-auto mb-2 opacity-50" style={{ color: 'var(--text-secondary)' }} />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Speech recognition not supported in this browser. Try Chrome or Edge.</p>
              </div>
            )}
          </div>
        </div>

        {result && (
          <div className="space-y-4 animate-fade-in pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400" /> Transcribed Text
              </h3>
              <div className="glass p-4 rounded-xl min-h-[60px] text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {result.transcribed_text || <span className="italic opacity-50">No text transcribed</span>}
              </div>
              {result.transcribed_text && (
                <button onClick={() => copyText('transcribed', result.transcribed_text)} className="mt-1 text-xs flex items-center gap-1 hover:text-tamil-400 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                  {copied === 'transcribed' ? <><FiCheck size={12} /> Copied</> : <><FiCopy size={12} /> Copy</>}
                </button>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-tamil-400" /> Translated Text
              </h3>
              <div className="glass p-4 rounded-xl min-h-[60px] text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {result.translated_text || <span className="italic opacity-50">Translation not available</span>}
              </div>
              {result.translated_text && (
                <button onClick={() => copyText('translated', result.translated_text)} className="mt-1 text-xs flex items-center gap-1 hover:text-tamil-400 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                  {copied === 'translated' ? <><FiCheck size={12} /> Copied</> : <><FiCopy size={12} /> Copy</>}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
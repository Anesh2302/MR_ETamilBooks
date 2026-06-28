import React, { useState, useRef } from 'react';
import { ocrTranslate } from '../../services/translation';
import { FiCamera, FiUpload, FiCopy, FiCheck, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function OCRPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState('ta');
  const [result, setResult] = useState<{ extracted_text: string; translated_text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
    }
  };

  const handleOcr = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_language', targetLang);
    try {
      const res = await ocrTranslate(formData);
      setResult(res.data);
      toast.success('Text extracted and translated!');
    } catch (err) {
      toast.error('OCR translation failed. Make sure Tesseract is installed on the server.');
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <FiCamera size={20} />
          </div>
          <div>
            <h1 className="section-title">OCR Image Translation</h1>
            <p className="section-subtitle">Upload an image containing text and get it translated</p>
          </div>
        </div>
      </div>

      <div className="card-glass p-6 md:p-8 animate-fade-in-up">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="image-upload" />
            {preview ? (
              <div className="relative group">
                <img src={preview} alt="Preview" className="w-full rounded-xl max-h-64 object-contain" style={{ background: 'var(--bg-primary)' }} />
                <button onClick={() => { setFile(null); setPreview(null); setResult(null); }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <FiTrash2 size={14} />
                </button>
              </div>
            ) : (
              <label htmlFor="image-upload" className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 hover:border-tamil-400 hover:bg-tamil-500/5" style={{ borderColor: 'var(--border-color)' }}>
                <FiCamera size={40} className="mb-2" style={{ color: 'var(--text-secondary)' }} />
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Click to upload image</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>PNG, JPG, JPEG, GIF, BMP, TIFF, WebP</p>
              </label>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Target Language</label>
              <select className="input-field" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
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
            <button onClick={handleOcr} className="btn-primary w-full inline-flex items-center justify-center gap-2" disabled={!file || loading}>
              {loading ? (
                <><span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> Processing...</>
              ) : (
                <><FiCamera size={16} /> Extract & Translate</>
              )}
            </button>
          </div>

          <div className="space-y-4">
            {result ? (
              <>
                <div className="animate-fade-in">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Extracted Text
                  </h3>
                  <div className="glass p-4 rounded-xl min-h-[120px] max-h-40 overflow-y-auto text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {result.extracted_text || <span className="italic opacity-50">No text detected</span>}
                  </div>
                  {result.extracted_text && (
                    <button onClick={() => copyText(result.extracted_text)} className="mt-1 text-xs flex items-center gap-1 hover:text-tamil-400 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                      {copied ? <><FiCheck size={12} /> Copied</> : <><FiCopy size={12} /> Copy</>}
                    </button>
                  )}
                </div>
                <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-tamil-400" /> Translated Text
                  </h3>
                  <div className="glass p-4 rounded-xl min-h-[120px] max-h-40 overflow-y-auto text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {result.translated_text}
                  </div>
                  <button onClick={() => copyText(result.translated_text)} className="mt-1 text-xs flex items-center gap-1 hover:text-tamil-400 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                    {copied ? <><FiCheck size={12} /> Copied</> : <><FiCopy size={12} /> Copy</>}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                <FiCamera size={40} className="mb-3" style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
                <p style={{ color: 'var(--text-secondary)' }}>OCR result will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
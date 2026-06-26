import React, { useState, useRef } from 'react';
import { ocrTranslate } from '../../services/translation';
import { FiCamera, FiUpload, FiCopy } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function OCRPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState('ta');
  const [result, setResult] = useState<{ extracted_text: string; translated_text: string } | null>(null);
  const [loading, setLoading] = useState(false);
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
    } catch (err) {
      toast.error('OCR translation failed. Make sure Tesseract is installed on the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">OCR Image Translation</h1>
      <p className="text-gray-400">Upload an image containing text and get it translated</p>

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="image-upload" />
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="w-full rounded-lg max-h-64 object-contain bg-white/5" />
                <button onClick={() => { setFile(null); setPreview(null); setResult(null); }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 text-xs">Clear</button>
              </div>
            ) : (
              <label htmlFor="image-upload" className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-tamil-400 hover:bg-tamil-500/10">
                <FiCamera size={40} className="text-gray-300 mb-2" />
                <p className="text-gray-400 font-medium">Click to upload image</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG, GIF, BMP, TIFF, WebP</p>
              </label>
            )}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-200 mb-1">Target Language</label>
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
            <button onClick={handleOcr} className="btn-primary mt-4 w-full" disabled={!file || loading}>
              {loading ? 'Processing...' : 'Extract & Translate'}
            </button>
          </div>

          <div className="space-y-4">
            {result && (
              <>
                <div>
                  <h3 className="font-semibold text-white mb-2">Extracted Text</h3>
                  <div className="input-field h-32 overflow-y-auto bg-white/5 text-sm">{result.extracted_text || 'No text detected'}</div>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">Translated Text</h3>
                  <div className="input-field h-32 overflow-y-auto bg-white/5 text-sm">{result.translated_text}</div>
                </div>
              </>
            )}
            {!result && (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>OCR result will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

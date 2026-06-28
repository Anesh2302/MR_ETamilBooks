import React, { useState, useEffect } from 'react';
import { createBook as uploadResource, getCategories } from '../../services/books';
import { FiUpload, FiFile, FiCheck, FiX, FiBook } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';

export default function UploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  useEffect(() => {
    getCategories().then(res => setCategories(res.data)).catch(() => {});
  }, []);

  const toggleCategory = (id: number) => {
    setCategoryIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast.warning('Please provide a title and file');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (categoryIds.length > 0) categoryIds.forEach(id => formData.append('category_ids', String(id)));
    try {
      await uploadResource(formData);
      setUploaded(true);
      toast.success('Resource uploaded successfully!');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="card-glass p-10 text-center animate-fade-in-up">
        <FiUpload size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Sign in required</h2>
        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>Please log in to upload resources</p>
        <button onClick={() => router.push('/login')} className="btn-primary inline-flex items-center gap-2">
          Go to Login
        </button>
      </div>
    );
  }

  if (uploaded) {
    return (
      <div className="card-glass p-10 text-center animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/20">
          <FiCheck size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Upload Successful!</h2>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Your resource has been uploaded and is pending review.</p>
        <button onClick={() => { setUploaded(false); setFile(null); setTitle(''); setCategoryIds([]); }} className="btn-primary inline-flex items-center gap-2">
          <FiUpload size={16} /> Upload Another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <FiUpload size={20} />
          </div>
          <div>
            <h1 className="section-title">Upload Resource</h1>
            <p className="section-subtitle">Share Tamil educational resources with the community</p>
          </div>
        </div>
      </div>

      <div className="card-glass p-6 md:p-8 animate-fade-in-up space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Title</label>
          <input type="text" className="input-field" placeholder="Enter a descriptive title..." value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>File</label>
          <div className="glass p-3 rounded-xl">
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/20 transition-colors cursor-pointer"
              style={{ color: 'var(--text-secondary)' }} accept=".pdf,.doc,.docx,.txt,.epub,.jpg,.png,.mp3,.mp4" />
          </div>
          {file && <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}><FiFile size={12} /> {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
        </div>

        {categories.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Categories (optional)</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button key={cat.id} onClick={() => toggleCategory(cat.id)}
                  className={`glass px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    categoryIds.includes(cat.id) ? 'bg-tamil-500/20 text-tamil-400 border border-tamil-500/30' : 'hover:bg-white/10'
                  }`} style={{ color: categoryIds.includes(cat.id) ? undefined : 'var(--text-primary)' }}>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <button onClick={handleUpload} className="btn-primary inline-flex items-center gap-2" disabled={uploading || !file || !title.trim()}>
          {uploading ? (
            <><span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> Uploading...</>
          ) : (
            <><FiUpload size={16} /> Upload Resource</>
          )}
        </button>
      </div>
    </div>
  );
}
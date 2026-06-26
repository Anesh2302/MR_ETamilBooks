import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { FiUpload, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';

export default function AdminUpload() {
  const { isAuthenticated, isAdmin, authLoading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', title_ta: '', author: '', author_ta: '',
    description: '', description_ta: '', language: 'ta',
    category_id: '', is_public: true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) router.replace('/login');
    else if (!isAdmin) router.replace('/');
  }, [isAuthenticated, isAdmin, authLoading, router]);

  useEffect(() => {
    api.get('/api/books/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  if (authLoading) return null;
  if (!isAuthenticated || !isAdmin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) { toast.error('Title is required'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (file) fd.append('file', file);
      if (cover) fd.append('cover', cover);
      await api.post('/api/admin/books', fd);
      toast.success('Book uploaded successfully!');
      setForm({ title: '', title_ta: '', author: '', author_ta: '', description: '', description_ta: '', language: 'ta', category_id: '', is_public: true });
      setFile(null); setCover(null);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-tamil-400 transition-colors">
        <FiArrowLeft size={14} /> Back to Admin
      </Link>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tamil-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-tamil-500/20">
          <FiUpload size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Upload Book</h1>
          <p className="text-gray-400 text-sm">Add a new book to the E-Library</p>
        </div>
      </div>

      <div className="card p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Title (English) *</label>
              <input type="text" className="input-field" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Title (தமிழ்)</label>
              <input type="text" className="input-field" value={form.title_ta} onChange={e => setForm(f => ({ ...f, title_ta: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Author (English)</label>
              <input type="text" className="input-field" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Author (தமிழ்)</label>
              <input type="text" className="input-field" value={form.author_ta} onChange={e => setForm(f => ({ ...f, author_ta: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Description</label>
            <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Language</label>
              <select className="input-field" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Category</label>
              <select className="input-field" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">None</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Book File (PDF, EPUB)</label>
              <input type="file" accept=".pdf,.epub,.mobi" className="input-field py-2" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Cover Image</label>
              <input type="file" accept="image/*" className="input-field py-2" onChange={e => setCover(e.target.files?.[0] || null)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-200">
            <input type="checkbox" checked={form.is_public} onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))} className="rounded border-white/20 text-tamil-400 focus:ring-tamil-500" />
            Public (visible to all users)
          </label>
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Uploading...</span>
            ) : (
              <span className="flex items-center gap-2"><FiUpload size={16} /> Upload Book</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

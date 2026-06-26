import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getMe, updateMe } from '../../services/auth';
import { getProgress, getBookmarks } from '../../services/books';
import { FiUser, FiBook, FiBookmark, FiSave, FiClock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Link from 'next/link';

export default function Profile() {
  const { user, isAuthenticated, authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', preferred_language: 'ta' });

  useEffect(() => {
    if (isAuthenticated) {
      getMe().then((res) => {
        setProfile(res.data);
        setForm({ full_name: res.data.full_name || '', preferred_language: res.data.preferred_language });
      }).catch(() => {});
      getProgress().then((res) => setProgress(res.data)).catch(() => {});
      getBookmarks().then((res) => setBookmarks(res.data)).catch(() => {});
    }
  }, [isAuthenticated]);

  const handleUpdate = async () => {
    try {
      await updateMe(form);
      toast.success('Profile updated!');
      setEditing(false);
    } catch { toast.error('Update failed'); }
  };

  if (authLoading) return null;
  if (!isAuthenticated) return <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>Please login to view profile</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Profile</h1>

      <div className="card">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-tamil-500/15 rounded-full flex items-center justify-center">
            <FiUser size={28} className="text-tamil-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{profile?.username}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{profile?.email}</p>
          </div>
        </div>

        {editing ? (
          <div className="space-y-3">
            <input className="input-field" placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <select className="input-field" value={form.preferred_language} onChange={(e) => setForm({ ...form, preferred_language: e.target.value })}>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="en">English</option>
            </select>
            <div className="flex space-x-2">
              <button onClick={handleUpdate} className="btn-primary flex items-center"><FiSave className="mr-2" /> Save</button>
              <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p style={{ color: 'var(--text-primary)' }}><span className="font-medium">Full Name:</span> {profile?.full_name || 'Not set'}</p>
            <p style={{ color: 'var(--text-primary)' }}><span className="font-medium">Preferred Language:</span> {profile?.preferred_language === 'ta' ? 'தமிழ்' : 'English'}</p>
            <button onClick={() => setEditing(true)} className="btn-secondary text-sm mt-2">Edit Profile</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-lg flex items-center mb-4" style={{ color: 'var(--text-primary)' }}><FiBook className="mr-2 text-tamil-400" /> Reading Progress</h3>
          {progress.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No books read yet</p>
          ) : (
            <div className="space-y-3">
              {progress.map((p: any) => (
                <Link key={p.id} href={`/library/${p.book_id}`} className="block text-sm hover:bg-white/5 p-2 rounded-lg transition-colors">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{p.title_ta || p.title || `Book #${p.book_id}`}</p>
                  <div className="w-full rounded-full h-2 mt-1" style={{ background: 'var(--input-bg)' }}>
                    <div className="bg-tamil-500 h-2 rounded-full" style={{ width: `${Math.min(100, Math.round((p.progress || 0) * 100))}%` }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{Math.round((p.progress || 0) * 100)}% complete - Page {p.page || 0}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-lg flex items-center mb-4" style={{ color: 'var(--text-primary)' }}><FiBookmark className="mr-2 text-tamil-400" /> Bookmarks</h3>
          {bookmarks.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No bookmarks yet</p>
          ) : (
            <div className="space-y-2">
              {bookmarks.slice(0, 10).map((b: any) => (
                <Link key={b.id} href={`/library/${b.book_id}`} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--text-primary)' }}>
                  <FiBookmark size={14} className="text-tamil-400 flex-shrink-0" />
                  <span className="truncate">{b.title_ta || b.title}</span>
                  {b.page > 0 && <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>p.{b.page}</span>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

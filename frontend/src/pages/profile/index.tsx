import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getProgress as getUserProgress, getBookmarks as getUserBookmarks } from '../../services/books';
import { FiUser, FiBook, FiClock, FiStar, FiLogOut, FiBookOpen, FiChevronRight, FiAward } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [progress, setProgress] = useState<any>(null);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'reading' | 'bookmarks'>('overview');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([
      getUserProgress().then(setProgress).catch(() => {}),
      getUserBookmarks().then(res => setBookmarks(res.data || [])).catch(() => {})
    ]).finally(() => setLoading(false));
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push('/login');
    toast.success('Logged out');
  };

  if (!user) {
    return (
      <div className="card-glass p-12 text-center animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-tamil-500 to-tamil-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-tamil-500/20">
          <FiUser size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Not signed in</h2>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Sign in to view your profile, progress, and bookmarks.</p>
        <button onClick={() => router.push('/login')} className="btn-primary inline-flex items-center gap-2">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-tamil-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-tamil-500/20 text-xl font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="section-title">{user.username}</h1>
            <p className="section-subtitle">{user.email || 'No email'}</p>
          </div>
          <button onClick={handleLogout} className="glass p-2.5 rounded-xl hover:bg-red-500/10 transition-colors group" title="Logout">
            <FiLogOut size={18} className="group-hover:text-red-400 transition-colors" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 glass p-1 rounded-xl w-fit" style={{ background: 'var(--bg-secondary)' }}>
        {(['overview', 'reading', 'bookmarks'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all duration-200 ${tab === t ? 'bg-tamil-500/20 text-tamil-400 shadow-sm' : ''}`}
            style={{ color: tab === t ? undefined : 'var(--text-primary)' }}>
            {t === 'overview' && <FiUser size={14} className="inline mr-1.5" />}
            {t === 'reading' && <FiBookOpen size={14} className="inline mr-1.5" />}
            {t === 'bookmarks' && <FiStar size={14} className="inline mr-1.5" />}
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="w-10 h-10 rounded-full border-2 border-tamil-400/30 border-t-tamil-400 animate-spin" />
        </div>
      ) : tab === 'overview' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          {[
            { icon: FiBook, label: 'Books Read', value: progress?.books_read || 0, gradient: 'from-blue-500 to-cyan-600', color: 'blue' },
            { icon: FiClock, label: 'Reading Time', value: `${progress?.reading_minutes || 0}m`, gradient: 'from-amber-500 to-orange-600', color: 'amber' },
            { icon: FiStar, label: 'Bookmarks', value: bookmarks.length, gradient: 'from-purple-500 to-violet-600', color: 'purple' },
            { icon: FiAward, label: 'Streak', value: `${progress?.streak_days || 0} days`, gradient: 'from-emerald-500 to-teal-600', color: 'emerald' },
          ].map((stat, i) => (
            <div key={stat.label} className="card-glass p-5 animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.gradient}/20 flex items-center justify-center mb-3`}>
                <stat.icon size={18} className={`text-${stat.color}-400`} />
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      ) : tab === 'reading' ? (
        <div className="animate-fade-in">
          {progress?.recent_books?.length > 0 ? (
            <div className="space-y-3">
              {progress.recent_books.map((book: any, i: number) => (
                <div key={book.id || i} className="card-glass p-4 flex items-center gap-4 cursor-pointer hover:scale-[1.01] transition-all duration-300 animate-fade-in-up group"
                  style={{ animationDelay: `${i * 0.03}s` }} onClick={() => router.push(`/library/${book.id}`)}>
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-tamil-500/20 to-indigo-500/20 flex items-center justify-center shrink-0">
                    <FiBookOpen size={18} className="text-tamil-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{book.title}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{book.author || 'Unknown'}</p>
                  </div>
                  {book.progress !== undefined && (
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-tamil-400 to-indigo-400 transition-all duration-500" style={{ width: `${book.progress}%` }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{book.progress}%</span>
                    </div>
                  )}
                  <FiChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="glass p-10 rounded-xl text-center">
              <FiBookOpen size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No reading progress yet. Start reading a book!</p>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in">
          {bookmarks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookmarks.map((bm: any, i: number) => (
                <div key={bm.id || i} className="card-glass p-4 cursor-pointer hover:scale-[1.02] transition-all duration-300 animate-fade-in-up group"
                  style={{ animationDelay: `${i * 0.03}s` }} onClick={() => router.push(`/library/${bm.book_id || bm.id}`)}>
                  <div className="flex items-center gap-2 mb-2">
                    <FiStar size={14} className="text-amber-400 shrink-0" />
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{bm.book_title || 'Book'}</p>
                  </div>
                  {bm.chapter && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Chapter: {bm.chapter}</p>}
                  {bm.note && <p className="text-xs mt-1 italic opacity-60" style={{ color: 'var(--text-secondary)' }}>{bm.note}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="glass p-10 rounded-xl text-center">
              <FiStar size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No bookmarks saved yet. Bookmark pages while reading!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { FiCheck, FiX, FiArrowLeft, FiClock, FiLoader } from 'react-icons/fi';

export default function PendingBooks() {
  const { isAuthenticated, isAdmin, authLoading } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) router.replace('/login');
    else if (!isAdmin) router.replace('/');
  }, [isAuthenticated, isAdmin, authLoading, router]);

  useEffect(() => {
    if (isAdmin) {
      api.get('/api/admin/books/pending').then(r => setBooks(r.data)).catch(() => {}).finally(() => setLoading(false));
    }
  }, [isAdmin]);

  const handleApprove = async (id: number) => {
    try {
      await api.put(`/api/admin/books/${id}/approve`);
      setBooks(prev => prev.filter(b => b.id !== id));
      toast.success('Book approved');
    } catch { toast.error('Failed to approve'); }
  };

  const handleReject = async (id: number) => {
    try {
      await api.put(`/api/admin/books/${id}/reject`);
      setBooks(prev => prev.filter(b => b.id !== id));
      toast.success('Book rejected');
    } catch { toast.error('Failed to reject'); }
  };

  if (authLoading || loading) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--text-secondary)' }}>
          <FiArrowLeft size={18} />
        </Link>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-yellow-500/20">
          <FiClock size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Pending Books</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{books.length} book{books.length !== 1 ? 's' : ''} awaiting review</p>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>All caught up!</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No pending books to review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {books.map(book => (
            <div key={book.id} className="card p-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{book.title_ta || book.title}</h3>
                {book.title_ta && book.title && (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{book.title}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>Author: {book.author_ta || book.author || 'Unknown'}</span>
                  <span>Lang: {book.language === 'ta' ? 'தமிழ்' : 'EN'}</span>
                  <span>Type: {book.file_type?.toUpperCase() || 'PDF'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleApprove(book.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-all">
                  <FiCheck size={15} /> Approve
                </button>
                <button onClick={() => handleReject(book.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all">
                  <FiX size={15} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

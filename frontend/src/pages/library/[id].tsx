import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { getBook, updateProgress, createBookmark, deleteBookmark, getBookmarks } from '../../services/books';
import { API_URL } from '../../services/api';
import Layout from '../../components/Layout';
import { FiBookmark, FiDownload, FiArrowLeft, FiExternalLink, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function BookDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated } = useAuth();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(100);
  const readerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getBook(Number(id))
      .then(res => setBook(res.data))
      .catch(() => setError('Book not found'))
      .finally(() => setLoading(false));
    if (isAuthenticated) {
      getBookmarks().then(res => setBookmarked(res.data.some((b: any) => b.book_id === Number(id)))).catch(() => {});
    }
  }, [id, isAuthenticated]);

  const toggleBookmark = async () => {
    if (!isAuthenticated || !book) return;
    try {
      if (bookmarked) {
        await deleteBookmark(book.id);
        setBookmarked(false);
      } else {
        await createBookmark({ book_id: book.id, page: currentPage });
        setBookmarked(true);
      }
    } catch {}
  };

  const saveProgress = async (page: number) => {
    if (!isAuthenticated || !book) return;
    const progress = page / totalPages;
    try { await updateProgress({ book_id: book.id, page, progress }); } catch {}
  };

  const goToPage = (page: number) => {
    const newPage = Math.max(1, Math.min(totalPages, page));
    setCurrentPage(newPage);
    saveProgress(newPage);
  };

  if (loading) {
    return (
      <Layout title="Loading...">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tamil-500"></div>
        </div>
      </Layout>
    );
  }

  if (error || !book) {
    return (
      <Layout title="Not Found">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Book Not Found</h1>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>{error || 'The book does not exist.'}</p>
          <Link href="/library" className="btn-primary">Back to Library</Link>
        </div>
      </Layout>
    );
  }

  const hasFile = book.file_url && book.file_type;
  const absFileUrl = `${API_URL}${book.file_url}`;
  const absDownloadUrl = `${API_URL}/api/books/${book.id}/download`;

  const scrollToReader = () => {
    readerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Layout title={book.title_ta || book.title}>
      <div className="max-w-6xl mx-auto">
        <Link href="/library" className="inline-flex items-center gap-1 text-tamil-400 hover:text-tamil-300 mb-6 animate-fade-in">
          <FiArrowLeft size={16} /> Back to Library
        </Link>

        <div className="card-glass animate-fade-in-up">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-shrink-0">
              <div className="w-48 h-72 bg-gradient-to-br from-tamil-900/50 to-orange-900/30 rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                <span className="text-6xl">📖</span>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {hasFile && (
                  <button onClick={scrollToReader} className="btn-primary text-sm w-full text-center">Read Online</button>
                )}
                <a href={absDownloadUrl} className="btn-outline text-sm w-full text-center">Download</a>
                {isAuthenticated && (
                  <button onClick={toggleBookmark} className={`flex items-center justify-center gap-2 text-sm w-full py-2 px-4 rounded-xl border transition-all ${
                    bookmarked ? 'bg-tamil-500/15 border-tamil-500/30 text-tamil-400' : 'border-white/10 hover:bg-white/5'
                  }`} style={{ color: bookmarked ? undefined : 'var(--text-secondary)' }}>
                    <FiBookmark size={14} className={bookmarked ? 'fill-tamil-400' : ''} />
                    {bookmarked ? 'Bookmarked' : 'Bookmark'}
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-start gap-3 mb-2">
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{book.title_ta || book.title}</h1>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${book.language === 'ta' ? 'bg-tamil-500/10 text-tamil-400' : 'bg-blue-500/10 text-blue-400'}`}>
                  {book.language === 'ta' ? 'தமிழ்' : 'EN'}
                </span>
              </div>
              {book.title_ta && book.title && <p className="text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>{book.title}</p>}
              <p className="mb-1" style={{ color: 'var(--text-primary)' }}>
                <span className="font-medium">Author:</span> {book.author_ta || book.author || 'Unknown'}
              </p>
              {book.author_ta && book.author && <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{book.author}</p>}
              {book.file_type && (
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-medium">Format:</span> {book.file_type.toUpperCase()}
                  {book.file_size ? ` (${(book.file_size / 1024).toFixed(0)} KB)` : ''}
                </p>
              )}
              <div className="flex gap-6 text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                <span>👁 {book.views_count} views</span>
                <span>⬇ {book.downloads_count} downloads</span>
                {book.source === 'public_domain' && <span className="text-green-400">Public Domain</span>}
                {book.source === 'user_upload' && <span className="text-blue-400">User Upload</span>}
                {book.source === 'freetamilebooks' && <span className="text-purple-400">freetamilebooks.com</span>}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Description</h3>
                <p className="leading-relaxed" style={{ color: 'var(--text-primary)' }}>{book.description_ta || book.description || 'No description available.'}</p>
                {book.description_ta && book.description && <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{book.description}</p>}
              </div>
            </div>
          </div>
        </div>

        {hasFile && (
          <div ref={readerRef} className="mt-8 card-glass animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Reader</h2>
                {isAuthenticated && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => goToPage(currentPage - 1)} className="p-1 rounded hover:bg-white/10 transition-colors" style={{ color: 'var(--text-secondary)' }}><FiChevronLeft size={16} /></button>
                    <span className="text-sm px-2 py-0.5 rounded" style={{ background: 'var(--input-bg)', color: 'var(--text-primary)' }}>
                      Page {currentPage}/{totalPages}
                    </span>
                    <button onClick={() => goToPage(currentPage + 1)} className="p-1 rounded hover:bg-white/10 transition-colors" style={{ color: 'var(--text-secondary)' }}><FiChevronRight size={16} /></button>
                  </div>
                )}
              </div>
              <a href={absFileUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-tamil-400 hover:text-tamil-300 transition-colors">
                Open in new tab <FiExternalLink size={14} />
              </a>
            </div>
            <iframe src={absFileUrl} className="w-full h-[80vh] rounded-xl" style={{ border: '1px solid var(--border-color)' }} title={book.title} />
          </div>
        )}

        {!hasFile && (
          <div className="mt-8 card-glass animate-fade-in-up text-center py-12">
            <span className="text-5xl block mb-4">📝</span>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Content Not Available Yet</h3>
            <p style={{ color: 'var(--text-secondary)' }}>The full content for this book hasn't been uploaded yet.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

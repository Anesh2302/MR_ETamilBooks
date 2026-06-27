import { useRouter } from 'next/router';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { getBook, updateProgress, createBookmark, deleteBookmark, getBookmarks } from '../../services/books';
import { translateText } from '../../services/translation';
import { API_URL } from '../../services/api';
import Layout from '../../components/Layout';
import { FiBookmark, FiDownload, FiArrowLeft, FiExternalLink, FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight, FiRefreshCw, FiBookOpen, FiFileText } from 'react-icons/fi';

type ViewMode = 'tamil' | 'english' | 'side-by-side';

function splitContent(text: string): string[] {
  return text.split(/\n+/).filter(Boolean);
}

export default function BookDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated } = useAuth();
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(100);
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translating, setTranslating] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setIframeReady(false);
    getBook(Number(id))
      .then(res => {
        setBook(res.data);
        if (res.data.content_text) {
          const paras = splitContent(res.data.content_text);
          setTotalPages(Math.max(1, Math.ceil(paras.length / 5)));
        }
      })
      .catch(() => setError('Book not found'))
      .finally(() => setLoading(false));
    if (isAuthenticated) {
      getBookmarks().then(res => setBookmarked(res.data.some((b: any) => b.book_id === Number(id)))).catch(() => {});
    }
  }, [id, isAuthenticated]);

  const getPageContent = useCallback((page: number): string[] => {
    if (!book?.content_text) return [];
    const paras = splitContent(book.content_text);
    const start = (page - 1) * 5;
    return paras.slice(start, start + 5);
  }, [book]);

  const translatePage = useCallback(async (page: number) => {
    const content = getPageContent(page);
    if (content.length === 0 || translations[page]) return;
    setTranslating(true);
    try {
      const results: string[] = [];
      for (const para of content) {
        if (para.trim().length > 3) {
          try {
            const res = await translateText({ text: para, source_language: 'ta', target_language: 'en' });
            results.push(res.data.translated_text || para);
          } catch {
            results.push(para);
          }
        } else {
          results.push(para);
        }
      }
      setTranslations(prev => ({ ...prev, [page]: results.join('\n\n') }));
    } finally {
      setTranslating(false);
    }
  }, [getPageContent, translations]);

  useEffect(() => {
    if (book?.content_text && viewMode !== 'tamil') {
      translatePage(currentPage);
    }
  }, [currentPage, book, viewMode, translatePage]);

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
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-t-2 border-tamil-500 animate-spin" />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading book...</p>
        </div>
      </Layout>
    );
  }

  if (error || !book) {
    return (
      <Layout title="Not Found">
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
          <div className="text-7xl mb-6 animate-float">📚</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Book Not Found</h1>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>{error || 'The book does not exist.'}</p>
          <Link href="/library" className="btn-primary">Back to Library</Link>
        </div>
      </Layout>
    );
  }

  const hasFile = !!(book.file_url && book.file_type);
  const hasContent = !!(book.content_text);
  const absFileUrl = book.file_url
    ? (book.file_url.startsWith('http') ? book.file_url : `${API_URL}${book.file_url}`)
    : '';
  const absDownloadUrl = `${API_URL}/api/books/${book.id}/download`;

  const scrollToReader = () => {
    readerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pageContent = getPageContent(currentPage);
  const pageTranslation = translations[currentPage];

  return (
    <Layout title={book.title_ta || book.title}>
      <div className="max-w-7xl mx-auto space-y-8">
        <Link href="/library" className="inline-flex items-center gap-1.5 text-tamil-400 hover:text-tamil-300 transition-all hover:gap-2 animate-fade-in">
          <FiArrowLeft size={16} /> Back to Library
        </Link>

        <div className="card-glass p-6 md:p-8 animate-fade-in-up relative overflow-hidden">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-shrink-0">
              <div className="w-48 h-72 bg-gradient-to-br from-tamil-900/50 to-orange-900/30 rounded-xl flex items-center justify-center shadow-lg border border-white/10 overflow-hidden group">
                {book.cover_url ? (
                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <span className="text-6xl animate-pulse-slow">📖</span>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {(hasFile || hasContent) && (
                  <button onClick={scrollToReader} className="btn-primary text-sm w-full text-center inline-flex items-center justify-center gap-2">
                    <FiBookOpen size={14} /> Read Online
                  </button>
                )}
                <a href={absDownloadUrl} className="btn-outline text-sm w-full text-center inline-flex items-center justify-center gap-2">
                  <FiDownload size={14} /> Download
                </a>
                {isAuthenticated && (
                  <button onClick={toggleBookmark} className={`flex items-center justify-center gap-2 text-sm w-full py-2.5 px-4 rounded-xl border transition-all duration-200 ${
                    bookmarked ? 'bg-tamil-500/15 border-tamil-500/30 text-tamil-400' : 'border-white/10 hover:bg-white/5 hover:border-white/20'
                  }`} style={{ color: bookmarked ? undefined : 'var(--text-secondary)' }}>
                    <FiBookmark size={14} className={bookmarked ? 'fill-tamil-400' : ''} />
                    {bookmarked ? 'Bookmarked' : 'Bookmark'}
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-3 flex-wrap">
                <h1 className="text-3xl font-bold animate-slide-in-left" style={{ color: 'var(--text-primary)' }}>{book.title_ta || book.title}</h1>
                <span className={`px-2.5 py-0.5 rounded text-xs font-semibold animate-scale-in ${book.language === 'ta' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20' : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'}`}>
                  {book.language === 'ta' ? 'தமிழ்' : 'EN'}
                </span>
              </div>
              {book.title_ta && book.title && (
                <p className="text-lg mb-4 animate-slide-in-right" style={{ color: 'var(--text-secondary)' }}>{book.title}</p>
              )}
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <div className="animate-fade-in">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Author:</span>
                  <span className="text-sm ml-1" style={{ color: 'var(--text-secondary)' }}>{book.author_ta || book.author || 'Unknown'}</span>
                </div>
                {book.file_type && (
                  <span className="text-sm px-2 py-0.5 rounded bg-white/5 border border-white/10" style={{ color: 'var(--text-secondary)' }}>
                    {book.file_type.toUpperCase()}{book.file_size ? ` (${(book.file_size / 1024).toFixed(0)} KB)` : ''}
                  </span>
                )}
              </div>
              <div className="flex gap-6 text-sm flex-wrap animate-fade-in" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-1">👁 {book.views_count} views</span>
                <span className="flex items-center gap-1">⬇ {book.downloads_count} downloads</span>
                {book.source === 'public_domain' && <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">Public Domain</span>}
                {book.source === 'freetamilebooks' && <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">freetamilebooks.com</span>}
                {book.source === 'tamilbookspdf' && <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">tamilbookspdf.com</span>}
                {book.source === 'user_upload' && <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">User Upload</span>}
              </div>
              {book.description && (
                <div className="mt-6 animate-fade-in">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <FiFileText size={16} className="text-tamil-400" /> Description
                  </h3>
                  <div className="glass p-4 rounded-xl">
                    {book.description_ta ? (
                      <div className="space-y-2">
                        <p className="leading-relaxed" style={{ color: 'var(--text-primary)' }}>{book.description_ta}</p>
                        <p className="text-sm leading-relaxed opacity-70" style={{ color: 'var(--text-secondary)' }}>{book.description}</p>
                      </div>
                    ) : (
                      <p className="leading-relaxed" style={{ color: 'var(--text-primary)' }}>{book.description}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {hasContent && (
          <div ref={readerRef} className="card-glass p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="flex rounded-xl overflow-hidden border p-0.5" style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)' }}>
                  {(['tamil', 'side-by-side', 'english'] as ViewMode[]).map((mode) => (
                    <button key={mode} onClick={() => setViewMode(mode)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                        viewMode === mode
                          ? 'bg-tamil-600 text-white shadow-lg shadow-tamil-600/30'
                          : 'hover:bg-white/5 text-gray-400'
                      }`}>
                      {mode === 'tamil' ? 'தமிழ்' : mode === 'english' ? 'English' : 'தமிழ் + EN'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => goToPage(1)} disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all disabled:cursor-not-allowed" style={{ color: 'var(--text-secondary)' }}>
                  <FiChevronsLeft size={15} />
                </button>
                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all disabled:cursor-not-allowed" style={{ color: 'var(--text-secondary)' }}>
                  <FiChevronLeft size={15} />
                </button>
                <span className="text-sm px-4 py-1.5 rounded-lg font-medium mx-1" style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                  {currentPage} / {totalPages}
                </span>
                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all disabled:cursor-not-allowed" style={{ color: 'var(--text-secondary)' }}>
                  <FiChevronRight size={15} />
                </button>
                <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all disabled:cursor-not-allowed" style={{ color: 'var(--text-secondary)' }}>
                  <FiChevronsRight size={15} />
                </button>
              </div>
            </div>

            <div className="h-[75vh] rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
              {viewMode === 'side-by-side' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 h-full">
                  <div className="p-6 overflow-y-auto border-r" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}>
                    <div className="text-xs font-medium mb-3 uppercase tracking-wider flex items-center gap-2 text-orange-400/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      தமிழ் (Original)
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed text-[15px]" style={{ color: 'var(--text-primary)' }}>
                      {pageContent.join('\n\n') || <span className="italic opacity-50">No content on this page</span>}
                    </div>
                  </div>
                  <div className="p-6 overflow-y-auto" style={{ background: 'var(--bg-primary)' }}>
                    <div className="text-xs font-medium mb-3 uppercase tracking-wider flex items-center gap-2 text-blue-400/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      English (Translation)
                      {translating && <FiRefreshCw size={12} className="animate-spin ml-1" />}
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed text-[15px]" style={{ color: 'var(--text-primary)' }}>
                      {pageTranslation || (translating ? 'Translating...' : <span className="italic opacity-50">Translation will appear here.</span>)}
                    </div>
                  </div>
                </div>
              ) : viewMode === 'tamil' ? (
                <div className="p-8 overflow-y-auto h-full" style={{ background: 'var(--bg-primary)' }}>
                  <div className="max-w-3xl mx-auto whitespace-pre-wrap leading-relaxed text-lg" style={{ color: 'var(--text-primary)' }}>
                    {pageContent.join('\n\n') || <span className="italic opacity-50">No content on this page</span>}
                  </div>
                </div>
              ) : (
                <div className="p-8 overflow-y-auto h-full" style={{ background: 'var(--bg-primary)' }}>
                  <div className="max-w-3xl mx-auto">
                    <div className="text-xs font-medium mb-3 uppercase tracking-wider flex items-center gap-2 text-blue-400/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      English Translation
                      {translating && <FiRefreshCw size={12} className="animate-spin ml-1" />}
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                      {pageTranslation || (translating ? 'Translating...' : <span className="italic opacity-50">Select side-by-side mode first to generate translations.</span>)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Progress</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-tamil-600 via-tamil-500 to-orange-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(currentPage / totalPages) * 100}%` }} />
                </div>
                <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {Math.round((currentPage / totalPages) * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {hasFile && !hasContent && (
          <div ref={readerRef} className="card-glass p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <a href={absFileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg text-tamil-400 hover:text-tamil-300 hover:bg-tamil-500/10 transition-all border border-transparent hover:border-tamil-500/20">
                  <FiExternalLink size={14} /> Open original
                </a>
              </div>
            </div>
            <div className="w-full h-[80vh] rounded-xl overflow-hidden relative" style={{ border: '1px solid var(--border-color)' }}>
              {!iframeReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: 'var(--bg-primary)' }}>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full border-2 border-white/10" />
                    <div className="absolute inset-0 w-10 h-10 rounded-full border-t-2 border-tamil-500 animate-spin" />
                  </div>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading book preview...</span>
                </div>
              )}
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(absFileUrl)}&embedded=true`}
                className={`w-full h-full transition-opacity duration-500 ${iframeReady ? 'opacity-100' : 'opacity-0'}`}
                title={book.title}
                onLoad={() => setIframeReady(true)}
              />
            </div>
          </div>
        )}

        {!hasFile && !hasContent && (
          <div className="card-glass animate-fade-in-up text-center py-16">
            <div className="text-6xl mb-4 animate-float">📝</div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Content Not Available Yet</h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>The full content for this book hasn't been uploaded yet.</p>
            <Link href="/library" className="btn-primary">Browse Library</Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { getCategories, getBooks, getProgress, getBookmarks, createBookmark, deleteBookmark } from '../../services/books';
import { API_URL } from '../../services/api';
import { FiBook, FiSearch, FiDownload, FiEye, FiChevronRight, FiBookmark, FiClock, FiX, FiChevronLeft, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';

const PER_PAGE = 24;
const SKELETON_COUNT = 12;

function SkeletonCard() {
  return (
    <div className="card animate-pulse relative overflow-hidden">
      <div className="w-full h-48 rounded-lg mb-4 bg-white/5" />
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-14 rounded bg-white/5" />
          <div className="h-5 w-10 rounded bg-white/5" />
        </div>
        <div className="h-5 w-3/4 rounded bg-white/5" />
        <div className="h-4 w-1/2 rounded bg-white/5" />
        <div className="flex justify-between">
          <div className="h-4 w-24 rounded bg-white/5" />
          <div className="h-4 w-4 rounded bg-white/5" />
        </div>
      </div>
      <div className="absolute inset-0 -translate-x-full animate-shimmer" />
    </div>
  );
}

export default function Library() {
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [progressMap, setProgressMap] = useState<Record<number, any>>({});
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSearches, setShowSearches] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const fetchBooks = useCallback(async (p: number) => {
    setLoading(true);
    const params: any = { page: p, per_page: PER_PAGE };
    if (selectedCat) params.category_id = selectedCat;
    if (debouncedSearch) params.search = debouncedSearch;
    if (language) params.language = language;
    try {
      const res = await getBooks(params);
      const d = res.data;
      const booksArr = Array.isArray(d) ? d : (d.data || []);
      setBooks(booksArr);
      setTotalPages(d.total_pages || (Array.isArray(d) ? 1 : 1));
      setTotal(d.total || (Array.isArray(d) ? d.length : 0));
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCat, debouncedSearch, language]);

  useEffect(() => {
    getCategories().then((res) => setCategories(res.data)).catch(() => {});
    if (isAuthenticated) {
      getProgress().then(res => {
        const map: Record<number, any> = {};
        for (const p of res.data) map[p.book_id] = p;
        setProgressMap(map);
      }).catch(() => {});
      getBookmarks().then(res => setBookmarks(res.data.map((b: any) => b.book_id))).catch(() => {});
      const stored = localStorage.getItem('recentSearches');
      if (stored) setRecentSearches(JSON.parse(stored));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchBooks(1);
    setPage(1);
  }, [fetchBooks]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    fetchBooks(p);
    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSearchSubmit = () => {
    if (search.trim() && isAuthenticated) {
      const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 10);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      try { fetch(`${API_URL}/api/search-history`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: search, filters: { language, category: selectedCat } }) }); } catch {}
    }
  };

  const handleDownload = async (e: React.MouseEvent, book: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (!book.file_url) return;
    const url = `${API_URL}/api/books/${book.id}/download`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Download failed');
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `${book.title || 'book'}.${book.file_type || 'pdf'}`;
      a.click();
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  const toggleBookmark = async (e: React.MouseEvent, bookId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;
    try {
      if (bookmarks.includes(bookId)) {
        await deleteBookmark(bookId);
        setBookmarks(prev => prev.filter(id => id !== bookId));
      } else {
        await createBookmark({ book_id: bookId });
        setBookmarks(prev => [...prev, bookId]);
      }
    } catch {}
  };

  const Pagination = () => {
    if (totalPages <= 1) return null;
    const pages: (number | '...')[] = [];
    const showPages = 5;
    let start = Math.max(1, page - Math.floor(showPages / 2));
    let end = Math.min(totalPages, start + showPages - 1);
    if (end - start + 1 < showPages) start = Math.max(1, end - showPages + 1);
    if (start > 1) { pages.push(1); if (start > 2) pages.push('...'); }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) { if (end < totalPages - 1) pages.push('...'); pages.push(totalPages); }
    return (
      <div className="flex items-center justify-center gap-2 animate-fade-in">
        <button onClick={() => goToPage(1)} disabled={page === 1} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all" style={{ color: 'var(--text-secondary)' }}><FiChevronsLeft size={16} /></button>
        <button onClick={() => goToPage(page - 1)} disabled={page === 1} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all" style={{ color: 'var(--text-secondary)' }}><FiChevronLeft size={16} /></button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e-${i}`} className="px-2 text-sm" style={{ color: 'var(--text-secondary)' }}>...</span>
          ) : (
            <button key={p} onClick={() => goToPage(p)}
              className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-tamil-600 text-white shadow-md' : 'hover:bg-white/10'}`}
              style={{ color: p === page ? undefined : 'var(--text-secondary)' }}>
              {p}
            </button>
          )
        )}
        <button onClick={() => goToPage(page + 1)} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all" style={{ color: 'var(--text-secondary)' }}><FiChevronRight size={16} /></button>
        <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all" style={{ color: 'var(--text-secondary)' }}><FiChevronsRight size={16} /></button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>E-Library</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Browse & read Tamil and English books</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="rounded-xl px-3 py-2.5 text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="">All Languages</option>
            <option value="ta">தமிழ்</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div className="relative animate-fade-in" ref={searchRef}>
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          placeholder="Search books by title or author..."
          className="w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all backdrop-blur-xl focus:ring-2 focus:ring-tamil-500/30 focus:border-tamil-500"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setShowSearches(true)}
          onBlur={() => setTimeout(() => setShowSearches(false), 200)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(); }}
        />
        {showSearches && recentSearches.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl z-10 p-2" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Recent Searches</span>
              <button onClick={() => { setRecentSearches([]); localStorage.removeItem('recentSearches'); }} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <FiX size={12} />
              </button>
            </div>
            {recentSearches.map((q, i) => (
              <button key={i} onClick={() => { setSearch(q); setShowSearches(false); }} className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg hover:bg-white/5" style={{ color: 'var(--text-primary)' }}>
                <FiClock size={12} style={{ color: 'var(--text-secondary)' }} /> {q}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-2 animate-fade-in">
        <button
          onClick={() => setSelectedCat(null)}
          className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all flex-shrink-0 ${!selectedCat ? 'bg-tamil-600 text-white shadow-md' : 'border hover:bg-white/10'}`}
          style={!selectedCat ? {} : { background: 'var(--input-bg)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}
        >
          All
        </button>
        {categories.map((cat: any) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCat(cat.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all flex-shrink-0 ${selectedCat === cat.id ? 'bg-tamil-600 text-white shadow-md' : 'border hover:bg-white/10'}`}
            style={selectedCat === cat.id ? {} : { background: 'var(--input-bg)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {total > 0 && !loading && (
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {total} book{total !== 1 ? 's' : ''} found
          {totalPages > 1 && ` — Page ${page} of ${totalPages}`}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-12 card animate-fade-in-up">
          <FiBook size={48} className="mx-auto" style={{ color: 'var(--text-secondary)' }} />
          <p className="mt-4 text-lg" style={{ color: 'var(--text-primary)' }}>No books found</p>
          <p style={{ color: 'var(--text-secondary)' }}>Try a different search or category</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map((book: any, i: number) => {
              const prog = progressMap[book.id];
              return (
              <Link key={book.id} href={`/library/${book.id}`}
                className="card hover:shadow-lg transition-all duration-300 group block animate-fade-in-up relative"
                style={{ animationDelay: `${i * 0.03}s` }}>
                <div className="w-full h-48 bg-gradient-to-br from-tamil-900/30 to-orange-900/20 rounded-lg mb-4 flex items-center justify-center overflow-hidden relative">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <FiBook size={48} className="text-tamil-400 group-hover:scale-110 transition-transform duration-300" />
                  )}
                  {book.file_url && (
                    <button onClick={(e) => handleDownload(e, book)}
                      className="absolute top-2 right-10 bg-white/10 backdrop-blur-sm p-2 rounded-full shadow-md hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
                      title="Download">
                      <FiDownload size={16} className="text-gray-200" />
                    </button>
                  )}
                  {isAuthenticated && (
                    <button onClick={(e) => toggleBookmark(e, book.id)}
                      className={`absolute top-2 right-2 backdrop-blur-sm p-2 rounded-full shadow-md transition-all ${bookmarks.includes(book.id) ? 'bg-tamil-500/30 opacity-100' : 'bg-white/10 opacity-0 group-hover:opacity-100 hover:bg-white/20'}`}
                      title={bookmarks.includes(book.id) ? 'Remove bookmark' : 'Add bookmark'}>
                      <FiBookmark size={16} className={bookmarks.includes(book.id) ? 'text-tamil-400 fill-tamil-400' : 'text-gray-200'} />
                    </button>
                  )}
                  {prog && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                      <div className="h-full bg-tamil-500 rounded-r transition-all" style={{ width: `${Math.min(100, Math.round(prog.progress * 100))}%` }} />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${book.language === 'ta' ? 'bg-tamil-500/15 text-tamil-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {book.language === 'ta' ? 'தமிழ்' : 'EN'}
                    </span>
                    {book.file_type && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/5" style={{ color: 'var(--text-secondary)' }}>
                        {book.file_type.toUpperCase()}
                      </span>
                    )}
                    {book.source && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        book.source === 'public_domain' ? 'bg-green-500/10 text-green-400' :
                        book.source === 'user_upload' ? 'bg-blue-500/10 text-blue-400' :
                        book.source === 'freetamilebooks' ? 'bg-purple-500/10 text-purple-400' : ''
                      }`}>
                        {book.source === 'public_domain' ? 'Public Domain' :
                         book.source === 'user_upload' ? 'Upload' :
                         book.source === 'freetamilebooks' ? 'freetamilebooks' : book.source}
                      </span>
                    )}
                    {prog && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-tamil-500/10 text-tamil-400">
                        {Math.round(prog.progress * 100)}%
                      </span>
                    )}
                  </div>
                  {book.title_ta ? (
                    <div>
                      <h3 className="font-semibold group-hover:text-tamil-400 transition-colors leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {book.title_ta}
                      </h3>
                      {book.title && (
                        <p className="text-xs mt-0.5 opacity-70" style={{ color: 'var(--text-secondary)' }}>{book.title}</p>
                      )}
                    </div>
                  ) : (
                    <h3 className="font-semibold group-hover:text-tamil-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
                      {book.title}
                    </h3>
                  )}
                  {book.author_ta ? (
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{book.author_ta}</p>
                      {book.author && <p className="text-xs opacity-60" style={{ color: 'var(--text-secondary)' }}>{book.author}</p>}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{book.author || 'Unknown Author'}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span className="flex items-center"><FiEye className="mr-1" />{book.views_count}</span>
                      <span className="flex items-center"><FiDownload className="mr-1" />{book.downloads_count}</span>
                    </div>
                    <FiChevronRight size={16} className="group-hover:text-tamil-500 group-hover:translate-x-1 transition-all" style={{ color: 'var(--text-secondary)' }} />
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
          <Pagination />
        </>
      )}
    </div>
  );
}

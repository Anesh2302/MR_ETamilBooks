import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { FiBook, FiGlobe, FiMic, FiCamera, FiVolume2, FiFileText, FiLayers, FiLogOut, FiUser, FiMenu, FiX, FiChevronDown, FiShield, FiUpload, FiSun, FiMoon } from 'react-icons/fi';

const navLinks = [
  { href: '/library', label: 'E-Library', icon: FiBook },
  { href: '/translate', label: 'Translate', icon: FiGlobe },
  { href: '/ocr', label: 'OCR', icon: FiCamera },
  { href: '/tts', label: 'Text-to-Speech', icon: FiVolume2 },
  { href: '/audio', label: 'Audio', icon: FiMic },
  { href: '/summarize', label: 'Summarize', icon: FiFileText },
  { href: '/flashcards', label: 'Flashcards', icon: FiLayers },
  { href: '/upload', label: 'Upload', icon: FiUpload },
];

export default function Navbar() {
  const { isAuthenticated, user, logout, authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (authLoading) {
    return (
      <nav className="sticky top-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">📚</span>
<span className="font-bold text-lg hidden sm:block" style={{ color: 'var(--text-primary)' }}>E-Book Translator</span>
            </Link>
            <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <span className="font-bold text-lg text-white hidden sm:block">E-Book Translator</span>
            <span className="text-xs text-tamil-400 font-semibold bg-tamil-500/10 px-2 py-0.5 rounded-full hidden md:block">தமிழ்</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = router.pathname === link.href || router.pathname.startsWith(link.href + '/');
              return (
                <Link key={link.href} href={link.href} className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all duration-150 ${
                  isActive ? 'text-tamil-400 bg-tamil-500/10 font-medium' : 'text-gray-400 hover:text-tamil-400 hover:bg-white/5'
                }`}>
                  <link.icon size={15} />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative" ref={profileRef}>
                <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 text-sm text-gray-300 hover:text-tamil-400 bg-white/5 hover:bg-tamil-500/10 px-3 py-1.5 rounded-xl transition-all duration-150 border border-white/10 hover:border-tamil-500/30">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-tamil-500 to-tamil-600 flex items-center justify-center text-white text-xs font-bold">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:block font-medium">{user?.username}</span>
                  <FiChevronDown size={14} className={`transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 py-2 rounded-xl shadow-xl animate-slide-down" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                    <Link href="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-tamil-500/10 hover:text-tamil-400 transition-colors">
                      <FiUser size={15} /> Profile
                    </Link>
                    <Link href="/upload" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-tamil-500/10 hover:text-tamil-400 transition-colors">
                      <FiUpload size={15} /> Upload Book
                    </Link>
                    {user?.is_superuser && (
                      <Link href="/admin" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-purple-400 hover:bg-purple-500/10 transition-colors">
                        <FiShield size={15} /> Admin Panel
                      </Link>
                    )}
                    <hr className="my-1 border-white/10" />
                    <button onClick={() => { setProfileOpen(false); logout(); }} className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 w-full text-left transition-colors">
                      <FiLogOut size={15} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn-primary text-sm py-2 px-4">
                Sign In
              </Link>
            )}
            <button onClick={toggleTheme} className="p-2 text-gray-400 hover:text-tamil-400 transition-colors" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>
            <button className="md:hidden p-2 text-gray-400 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden px-4 py-3 space-y-1 animate-slide-down" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors ${
              router.pathname === link.href ? 'text-tamil-400 bg-tamil-500/10 font-medium' : 'text-gray-400 hover:bg-white/5'
            }`}>
              <link.icon size={16} />
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

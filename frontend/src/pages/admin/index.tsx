import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { FiBook, FiUsers, FiUpload, FiBarChart2, FiShield, FiGlobe, FiLoader, FiClock } from 'react-icons/fi';

export default function AdminDashboard() {
  const { isAuthenticated, isAdmin, authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [scraping, setScraping] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) router.replace('/login');
    else if (!isAdmin) router.replace('/');
  }, [isAuthenticated, isAdmin, authLoading, router]);

  useEffect(() => {
    if (isAdmin) {
      api.get('/api/admin/stats').then(r => setStats(r.data)).catch(() => {});
    }
  }, [isAdmin]);

  if (authLoading) return null;
  if (!isAuthenticated || !isAdmin) return null;

  const handleScrape = async () => {
    setScraping(true);
    try {
      await api.post('/api/admin/scrape-links');
      toast.success('Scraping started! Check server logs for progress.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to start scraping');
    } finally {
      setScraping(false);
    }
  };

  const cards = [
    { icon: FiBarChart2, label: 'Dashboard', desc: 'Overview & statistics', href: '/admin', color: 'from-indigo-500 to-indigo-600' },
    { icon: FiUpload, label: 'Upload Book', desc: 'Add new books to library', href: '/admin/upload', color: 'from-tamil-500 to-orange-500' },
    { icon: FiGlobe, label: 'Scrape Books', desc: 'Import books from external sources', action: handleScrape, loading: scraping, color: 'from-green-500 to-emerald-600' },
    { icon: FiClock, label: 'Pending Review', desc: 'Approve or reject uploaded books', href: '/admin/pending', color: 'from-yellow-500 to-orange-500' },
    { icon: FiUsers, label: 'Manage Users', desc: 'View and manage users', href: '/admin/users', color: 'from-blue-500 to-cyan-500' },
  ];

  return (
      <div className="space-y-8 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
          <FiShield size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Admin Panel</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your Tamil E-Book platform</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats ? (
          <>
            <div className="card p-5 border-l-4 border-l-tamil-500">
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total_users}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Users</p>
            </div>
            <div className="card p-5 border-l-4 border-l-blue-500">
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total_books}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Books</p>
            </div>
            <div className="card p-5 border-l-4 border-l-green-500">
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.active_users}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Active Users</p>
            </div>
          </>
        ) : (
          [1, 2, 3].map(i => (
            <div key={i} className="card p-5 animate-pulse"><div className="h-8 w-16 bg-white/10 rounded mb-2" /><div className="h-4 w-24 bg-white/5 rounded" /></div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {cards.filter(c => c.href !== '/admin').map((card) => {
          if (card.action) {
            return (
              <button key={card.label} onClick={card.action} disabled={card.loading}
                className="group card p-6 hover:border-transparent hover:shadow-xl hover:-translate-y-0.5 text-left w-full disabled:opacity-50">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 shadow-lg text-white`}>
                  {card.loading ? <FiLoader size={22} className="animate-spin" /> : <card.icon size={22} />}
                </div>
                <h3 className="font-semibold text-white group-hover:text-tamil-400">{card.label}</h3>
                <p className="text-sm text-gray-400 mt-1">{card.desc}</p>
              </button>
            );
          }
          return (
            <Link key={card.href} href={card.href} className="group card p-6 hover:border-transparent hover:shadow-xl hover:-translate-y-0.5">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 shadow-lg text-white`}>
                <card.icon size={22} />
              </div>
              <h3 className="font-semibold text-white group-hover:text-tamil-400">{card.label}</h3>
              <p className="text-sm text-gray-400 mt-1">{card.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

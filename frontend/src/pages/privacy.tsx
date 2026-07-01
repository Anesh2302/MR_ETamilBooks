import React from 'react';
import Head from 'next/head';

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <Head><title>Privacy Policy - MR ETamilBooks</title></Head>
      <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Privacy Policy</h1>
      <div className="card p-6 space-y-4" style={{ color: 'var(--text-secondary)' }}>
        <p>Your data (reading progress, bookmarks, translation history) is stored securely and used only within the app. We do not share your personal information with third parties.</p>
        <p>Authentication is handled via JWT tokens stored locally in your browser.</p>
      </div>
    </div>
  );
}

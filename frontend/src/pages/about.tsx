import React from 'react';
import Head from 'next/head';

export default function About() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <Head><title>About - MR ETamilBooks</title></Head>
      <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>About</h1>
      <div className="card p-6 space-y-4" style={{ color: 'var(--text-secondary)' }}>
        <p>MR ETamilBooks is a platform for Tamil and English books, document translation, text translation, and more.</p>
        <p>Features include an e-library with preview and download, text and document translation between Tamil and English, OCR image translation, text-to-speech, flashcards, and bookmarks.</p>
        <p>Built with Next.js, Express, and Turso.</p>
      </div>
    </div>
  );
}

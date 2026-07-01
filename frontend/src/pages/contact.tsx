import React from 'react';
import Head from 'next/head';

export default function Contact() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <Head><title>Contact - MR ETamilBooks</title></Head>
      <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Contact</h1>
      <div className="card p-6 space-y-4" style={{ color: 'var(--text-secondary)' }}>
        <p>For support or inquiries, email: <a href="mailto:simonpetercys@gmail.com" className="text-tamil-400 hover:underline">simonpetercys@gmail.com</a></p>
      </div>
    </div>
  );
}

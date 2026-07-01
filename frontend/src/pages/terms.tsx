import React from 'react';
import Head from 'next/head';

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <Head><title>Terms of Service - MR ETamilBooks</title></Head>
      <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Terms of Service</h1>
      <div className="card p-6 space-y-4" style={{ color: 'var(--text-secondary)' }}>
        <p>This service is provided as-is. Books are sourced from public domain and user uploads. Users are responsible for the content they upload.</p>
        <p>We reserve the right to modify or discontinue the service at any time.</p>
      </div>
    </div>
  );
}

import React from 'react';
import Link from 'next/link';

export default function Custom404() {
  return (
    <div className="min-h-screen flex items-center justify-center auth-gradient px-4">
      <div className="text-center animate-fade-in-up">
        <div className="text-8xl mb-4">📖</div>
        <h1 className="text-6xl font-bold text-white mb-2">404</h1>
        <p className="text-xl text-gray-300 mb-6">Page not found</p>
        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          Go Home
        </Link>
      </div>
    </div>
  );
}

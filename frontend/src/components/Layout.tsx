import React, { ReactNode } from 'react';
import Head from 'next/head';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="bg-orbs">
        <div className="orb animate-orb" />
        <div className="orb animate-orb" />
        <div className="orb animate-orb" />
        <div className="orb animate-orb" />
        <div className="orb animate-orb" />
      </div>
      <Head>
        <title>{title ? `${title} | Tamil E-Book Translator` : 'Tamil E-Book Translator'}</title>
      </Head>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 content-above">{children}</main>
      <Footer />
    </div>
  );
}

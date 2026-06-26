import React from 'react';
import Link from 'next/link';
import { FiBook, FiGlobe, FiCamera, FiMic, FiVolume2, FiFileText, FiLayers, FiArrowRight } from 'react-icons/fi';

const features = [
  { icon: FiBook, title: 'E-Library', desc: 'Browse & read Tamil and English books online', href: '/library', gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
  { icon: FiGlobe, title: 'Text Translation', desc: 'Translate between Tamil, English & 15+ languages', href: '/translate', gradient: 'from-green-500 to-emerald-600', shadow: 'shadow-green-500/20' },
  { icon: FiCamera, title: 'OCR Translation', desc: 'Extract & translate text from images', href: '/ocr', gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/20' },
  { icon: FiFileText, title: 'Document Translation', desc: 'Upload PDF, DOC, TXT files for translation', href: '/translate', gradient: 'from-orange-500 to-amber-600', shadow: 'shadow-orange-500/20' },
  { icon: FiMic, title: 'Audio Translation', desc: 'Transcribe & translate audio files', href: '/audio', gradient: 'from-pink-500 to-rose-600', shadow: 'shadow-pink-500/20' },
  { icon: FiVolume2, title: 'Text-to-Speech', desc: 'Listen to text in Tamil & English', href: '/tts', gradient: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/20' },
  { icon: FiFileText, title: 'AI Summarizer', desc: 'Summarize long documents & articles', href: '/summarize', gradient: 'from-teal-500 to-cyan-600', shadow: 'shadow-teal-500/20' },
  { icon: FiLayers, title: 'Flashcards', desc: 'Build vocabulary with translation flashcards', href: '/flashcards', gradient: 'from-red-500 to-rose-600', shadow: 'shadow-red-500/20' },
];

const languages = [
  { code: 'ta', name: 'தமிழ்', english: 'Tamil' },
  { code: 'en', name: 'English', english: 'English' },
  { code: 'hi', name: 'हिन्दी', english: 'Hindi' },
  { code: 'ml', name: 'മലയാളം', english: 'Malayalam' },
  { code: 'te', name: 'తెలుగు', english: 'Telugu' },
  { code: 'kn', name: 'ಕನ್ನಡ', english: 'Kannada' },
  { code: 'bn', name: 'বাংলা', english: 'Bengali' },
  { code: 'fr', name: 'Français', english: 'French' },
  { code: 'de', name: 'Deutsch', english: 'German' },
  { code: 'es', name: 'Español', english: 'Spanish' },
  { code: 'zh', name: '中文', english: 'Chinese' },
  { code: 'ja', name: '日本語', english: 'Japanese' },
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="text-center py-16 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 bg-tamil-500/10 text-tamil-400 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span className="w-2 h-2 rounded-full bg-tamil-500 animate-pulse-slow" />
          Tamil E-Book Platform
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 leading-tight">
          Tamil <span className="text-transparent bg-clip-text bg-gradient-to-r from-tamil-400 to-orange-400">E-Book</span> Translator
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
          Your complete platform for Tamil & English books, document translation, text translation, and more
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/library" className="btn-primary text-base px-8 py-3 flex items-center gap-2">
            Browse Library <FiArrowRight size={18} />
          </Link>
          <Link href="/translate" className="btn-outline text-base px-8 py-3">
            Translate Now
          </Link>
        </div>
      </section>

      <section className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="text-center mb-10">
          <h2 className="section-title">All Features</h2>
          <p className="section-subtitle">Everything you need in one place</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <Link key={f.href} href={f.href} className="group card p-6 hover:border-transparent hover:shadow-xl hover:-translate-y-0.5">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 shadow-lg ${f.shadow} text-white`}>
                <f.icon size={22} />
              </div>
              <h3 className="font-semibold text-white group-hover:text-tamil-400 transition-colors">{f.title}</h3>
              <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="card p-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <h2 className="section-title text-center">Supported Languages</h2>
        <p className="section-subtitle text-center">Translate between Tamil and 12+ languages</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {languages.map((lang) => (
            <div key={lang.code} className="text-center p-3 rounded-xl hover:bg-tamil-500/10 border border-transparent hover:border-tamil-500/30 transition-all duration-150">
              <p className="text-lg font-semibold text-gray-200">{lang.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{lang.english}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

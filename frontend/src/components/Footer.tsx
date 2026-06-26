import React from 'react';
import Link from 'next/link';
import { FiBook, FiGlobe, FiGithub } from 'react-icons/fi';

const footerLinks = [
  { title: 'Features', links: [
    { label: 'E-Library', href: '/library' },
    { label: 'Translation', href: '/translate' },
    { label: 'OCR', href: '/ocr' },
    { label: 'TTS', href: '/tts' },
    { label: 'Flashcards', href: '/flashcards' },
  ]},
  { title: 'Support', links: [
    { label: 'About', href: '/' },
    { label: 'Contact', href: '/' },
    { label: 'Privacy', href: '/' },
    { label: 'Terms', href: '/' },
  ]},
];

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📚</span>
              <span className="font-bold text-lg text-white">E-Book Translator</span>
            </div>
            <p className="text-sm max-w-md">
              Your complete platform for Tamil & English books, document translation, text translation, and more.
            </p>
            <p className="text-xs text-gray-400 mt-4">&copy; {new Date().getFullYear()} Tamil E-Book Translator. All rights reserved.</p>
          </div>
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold text-white text-sm mb-3">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm hover:text-tamil-400 transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

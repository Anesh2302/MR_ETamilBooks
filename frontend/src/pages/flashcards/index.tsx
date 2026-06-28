import React, { useState, useEffect } from 'react';
import { getFlashcardSets, getFlashcardSet, updateFlashcardProgress } from '../../services/translation';
import { FiLayers, FiChevronLeft, FiChevronRight, FiRotateCw, FiCheck, FiX, FiBookOpen } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function FlashcardsPage() {
  const [sets, setSets] = useState<{ id: number; title: string; description: string; card_count: number }[]>([]);
  const [selectedSet, setSelectedSet] = useState<number | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSets();
  }, []);

  const loadSets = async () => {
    setLoading(true);
    try {
      const res = await getFlashcardSets();
      setSets(res.data);
    } catch { toast.error('Failed to load flashcard sets'); }
    finally { setLoading(false); }
  };

  const loadCards = async (setId: number) => {
    setLoading(true);
    try {
      const res = await getFlashcardSet(setId);
      setCards(res.data.cards || res.data.flashcards || []);
      setSelectedSet(setId);
      setCurrentIndex(0);
      setFlipped(false);
    } catch { toast.error('Failed to load flashcards'); }
    finally { setLoading(false); }
  };

  const handleProgress = async (cardId: number, known: boolean) => {
    try { await updateFlashcardProgress(cardId, { known }); }
    catch {}
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setFlipped(false);
    } else {
      toast.success('Completed this set!');
      setSelectedSet(null);
      loadSets();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 rounded-full border-2 border-tamil-400/30 border-t-tamil-400 animate-spin" />
      </div>
    );
  }

  if (selectedSet && cards.length > 0) {
    const card = cards[currentIndex];
    return (
      <div className="space-y-6">
        <div className="animate-fade-in-up flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <FiLayers size={20} />
            </div>
            <div>
              <h1 className="section-title">Flashcards</h1>
              <p className="section-subtitle">Card {currentIndex + 1} of {cards.length}</p>
            </div>
          </div>
          <button onClick={() => { setSelectedSet(null); loadSets(); }} className="text-sm glass px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--text-primary)' }}>
            Browse Sets
          </button>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-lg cursor-pointer" onClick={() => setFlipped(!flipped)}>
            <div className="card-glass p-10 min-h-[280px] flex items-center justify-center transition-all duration-300 hover:scale-[1.02]">
              <div className="text-center">
                <p className="text-xs font-medium tracking-wider uppercase mb-3 opacity-50" style={{ color: 'var(--text-primary)' }}>
                  {flipped ? 'Translation' : 'Term'}
                </p>
                <p className="text-xl md:text-2xl font-semibold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {flipped ? card.translated_word : card.word}
                </p>
                {card.example_sentence && (
                  <p className="text-sm mt-4 italic opacity-60 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
                    "{flipped ? (card.translated_example || card.example_sentence) : card.example_sentence}"
                  </p>
                )}
                <p className="text-xs mt-4 opacity-40" style={{ color: 'var(--text-secondary)' }}>Tap to flip</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 animate-fade-in">
          <button onClick={() => handleProgress(card.id, false)} className="btn-secondary inline-flex items-center gap-2 px-6">
            <FiX size={16} /> Don't Know
          </button>
          <button onClick={() => { setFlipped(!flipped); }} className="glass p-3 rounded-xl hover:bg-white/10 transition-colors">
            <FiRotateCw size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button onClick={() => handleProgress(card.id, true)} className="btn-primary inline-flex items-center gap-2 px-6">
            <FiCheck size={16} /> Know It
          </button>
        </div>

        <div className="flex justify-center gap-2">
          <button onClick={() => { if (currentIndex > 0) { setCurrentIndex(prev => prev - 1); setFlipped(false); } }}
            disabled={currentIndex === 0} className="glass p-2 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-colors">
            <FiChevronLeft size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <div className="flex gap-1.5 items-center">
            {cards.map((_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-tamil-400 w-4' : 'bg-white/20'}`} />
            ))}
          </div>
          <button onClick={() => { if (currentIndex < cards.length - 1) { setCurrentIndex(prev => prev + 1); setFlipped(false); } }}
            disabled={currentIndex >= cards.length - 1} className="glass p-2 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-colors">
            <FiChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <FiLayers size={20} />
          </div>
          <div>
            <h1 className="section-title">Flashcards</h1>
            <p className="section-subtitle">Browse flashcard sets to study vocabulary</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sets.map((set, i) => (
          <div key={set.id} className="card-glass p-5 cursor-pointer hover:scale-[1.02] transition-all duration-300 animate-fade-in-up group"
            style={{ animationDelay: `${i * 0.05}s` }} onClick={() => loadCards(set.id)}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <FiBookOpen size={16} className="text-amber-400" />
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10" style={{ color: 'var(--text-secondary)' }}>
                {set.card_count} cards
              </span>
            </div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{set.title}</h3>
            <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{set.description || 'No description'}</p>
          </div>
        ))}
      </div>

      <div className="glass p-10 rounded-xl text-center animate-fade-in">
        <FiLayers size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>No flashcard sets available</p>
      </div>
    </div>
  );
}
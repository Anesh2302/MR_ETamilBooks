import React, { useEffect, useState } from 'react';
import { getFlashcardSets, createFlashcardSet, deleteFlashcardSet, getFlashcardSet, addFlashcard, updateFlashcardProgress } from '../../services/translation';
import { FiLayers, FiPlus, FiTrash2, FiChevronLeft, FiChevronRight, FiCheck, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function FlashcardsPage() {
  const [sets, setSets] = useState<any[]>([]);
  const [activeSet, setActiveSet] = useState<any>(null);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newSet, setNewSet] = useState({ name: '', source_language: 'en', target_language: 'ta', description: '' });
  const [newCards, setNewCards] = useState([{ source_text: '', translated_text: '' }]);

  useEffect(() => {
    loadSets();
  }, []);

  const loadSets = async () => {
    try {
      const res = await getFlashcardSets();
      setSets(res.data);
    } catch (err) {}
  };

  const openSet = async (id: number) => {
    try {
      const res = await getFlashcardSet(id);
      setActiveSet(res.data);
      setCurrentCardIdx(0);
      setShowAnswer(false);
    } catch (err) {}
  };

  const handleCreate = async () => {
    if (!newSet.name.trim()) return;
    try {
      await createFlashcardSet({ ...newSet, flashcards: newCards.filter(c => c.source_text && c.translated_text) });
      toast.success('Flashcard set created!');
      setShowCreate(false);
      setNewSet({ name: '', source_language: 'en', target_language: 'ta', description: '' });
      setNewCards([{ source_text: '', translated_text: '' }]);
      loadSets();
    } catch (err) {
      toast.error('Failed to create set');
    }
  };

  const handleDeleteSet = async (id: number) => {
    try {
      await deleteFlashcardSet(id);
      toast.success('Set deleted');
      if (activeSet?.id === id) setActiveSet(null);
      loadSets();
    } catch (err) {}
  };

  const markLearned = async (cardId: number, learned: boolean) => {
    try {
      await updateFlashcardProgress(cardId, { is_learned: learned });
      if (activeSet) {
        const cards = activeSet.flashcards || [];
        cards.find((c: any) => c.id === cardId).is_learned = learned;
        setActiveSet({ ...activeSet, flashcards: [...cards] });
      }
    } catch (err) {}
  };

  const cards = activeSet?.flashcards || [];
  const currentCard = cards[currentCardIdx];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Flashcards</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center">
          <FiPlus className="mr-2" /> New Set
        </button>
      </div>

      {showCreate && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-lg">Create Flashcard Set</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input className="input-field" placeholder="Set name *" value={newSet.name} onChange={(e) => setNewSet({ ...newSet, name: e.target.value })} />
            <select className="input-field" value={newSet.source_language} onChange={(e) => setNewSet({ ...newSet, source_language: e.target.value })}>
              <option value="en">English</option>
              <option value="ta">தமிழ்</option>
              <option value="hi">हिन्दी</option>
            </select>
            <select className="input-field" value={newSet.target_language} onChange={(e) => setNewSet({ ...newSet, target_language: e.target.value })}>
              <option value="ta">தமிழ்</option>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </select>
          </div>
          <input className="input-field" placeholder="Description (optional)" value={newSet.description} onChange={(e) => setNewSet({ ...newSet, description: e.target.value })} />

          <div className="space-y-2">
            {newCards.map((card, i) => (
              <div key={i} className="flex space-x-2">
                <input className="input-field flex-1" placeholder="Word/Text" value={card.source_text} onChange={(e) => { const c = [...newCards]; c[i].source_text = e.target.value; setNewCards(c); }} />
                <input className="input-field flex-1" placeholder="Translation" value={card.translated_text} onChange={(e) => { const c = [...newCards]; c[i].translated_text = e.target.value; setNewCards(c); }} />
                {newCards.length > 1 && <button onClick={() => setNewCards(newCards.filter((_, j) => j !== i))} className="p-2 text-red-500"><FiX /></button>}
              </div>
            ))}
            <button onClick={() => setNewCards([...newCards, { source_text: '', translated_text: '' }])} className="text-sm text-tamil-400 hover:text-tamil-500">+ Add another card</button>
          </div>

          <button onClick={handleCreate} className="btn-primary">Create Set</button>
        </div>
      )}

      {activeSet ? (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setActiveSet(null)} className="flex items-center text-gray-400 hover:text-gray-200"><FiChevronLeft className="mr-1" /> Back</button>
            <h2 className="font-semibold text-lg">{activeSet.name}</h2>
            <span className="text-sm text-gray-300">{cards.filter((c: any) => c.is_learned).length}/{cards.length} learned</span>
          </div>

          {cards.length === 0 ? (
            <div className="text-center py-8 text-gray-300">No cards in this set</div>
          ) : (
            <div>
              <div className="bg-gradient-to-br from-tamil-900/30 to-orange-900/20 rounded-xl p-8 min-h-[250px] flex flex-col items-center justify-center cursor-pointer border border-white/10" onClick={() => setShowAnswer(!showAnswer)}>
                <p className="text-2xl font-semibold text-gray-100 text-center">{showAnswer ? currentCard?.translated_text : currentCard?.source_text}</p>
                <p className="text-sm text-gray-300 mt-4">{showAnswer ? 'Translation' : 'Tap to reveal answer'}</p>
              </div>

              <div className="flex items-center justify-between mt-6">
                <button onClick={() => { setCurrentCardIdx(Math.max(0, currentCardIdx - 1)); setShowAnswer(false); }} className="btn-secondary" disabled={currentCardIdx === 0}>
                  <FiChevronLeft className="mr-1" /> Previous
                </button>

                <div className="flex space-x-2">
                  <button onClick={() => markLearned(currentCard.id, false)} className={`p-2 rounded-lg ${!currentCard?.is_learned ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-gray-300'}`}>
                    <FiX size={20} />
                  </button>
                  <button onClick={() => markLearned(currentCard.id, true)} className={`p-2 rounded-lg ${currentCard?.is_learned ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-300'}`}>
                    <FiCheck size={20} />
                  </button>
                </div>

                <button onClick={() => { setCurrentCardIdx(Math.min(cards.length - 1, currentCardIdx + 1)); setShowAnswer(false); }} className="btn-secondary" disabled={currentCardIdx === cards.length - 1}>
                  Next <FiChevronRight className="ml-1" />
                </button>
              </div>

              <div className="flex justify-center mt-4 space-x-1">
                {cards.map((_: any, i: number) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i === currentCardIdx ? 'bg-tamil-500' : 'bg-white/20'}`} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sets.map((set: any) => (
            <div key={set.id} className="card cursor-pointer hover:shadow-md group" onClick={() => openSet(set.id)}>
              <div className="flex items-center justify-between mb-3">
                <FiLayers size={24} className="text-tamil-500" />
                <button onClick={(e) => { e.stopPropagation(); handleDeleteSet(set.id); }} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100"><FiTrash2 size={16} /></button>
              </div>
              <h3 className="font-semibold text-white">{set.name}</h3>
              <p className="text-sm text-gray-400">{set.flashcard_count} cards</p>
              <p className="text-xs text-gray-300 mt-1">{set.source_language} → {set.target_language}</p>
            </div>
          ))}
          {sets.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-300">
              <FiLayers size={48} className="mx-auto text-gray-200 mb-4" />
              <p>No flashcard sets yet. Create your first one!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

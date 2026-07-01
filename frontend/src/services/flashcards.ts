import api from './api';

export const getFlashcardSets = () => api.get('/api/flashcards/sets');

export const createFlashcardSet = (data: { name: string; source_language?: string; target_language?: string }) =>
  api.post('/api/flashcards/sets', data);

export const addFlashcard = (setId: number, card: { source_text: string; translated_text: string }) =>
  api.post(`/api/flashcards/sets/${setId}/cards`, card);

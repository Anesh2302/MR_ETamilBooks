import api from './api';

export const getLanguages = () => api.get('/api/translate/languages');
export const detectLanguage = (text: string) => api.post('/api/translate/detect', { text });
export const translateText = (data: { text: string; source_language: string; target_language: string }) =>
  api.post('/api/translate/text', data);
export const translateDocument = (formData: FormData) => api.post('/api/translate/document', formData);
export const getTranslationHistory = () => api.get('/api/translate/history');
export const getDocumentTranslations = () => api.get('/api/translate/documents');
export const downloadDocument = (id: number) => api.get(`/api/translate/documents/${id}/download`, { responseType: 'blob' });

export const ocrTranslate = (formData: FormData) => api.post('/api/ocr/translate', formData);
export const audioTranscribe = (formData: FormData) => api.post('/api/audio/transcribe', formData);
export const textToSpeech = (data: { text: string; language: string }) => api.post('/api/tts/synthesize', data);
export const summarize = (data: { text: string; language: string; max_sentences: number; translate_to?: string }) =>
  api.post('/api/summarize', data);

export const getFlashcardSets = () => api.get('/api/flashcards/sets');
export const getFlashcardSet = (id: number) => api.get(`/api/flashcards/sets/${id}`);
export const createFlashcardSet = (data: any) => api.post('/api/flashcards/sets', data);
export const deleteFlashcardSet = (id: number) => api.delete(`/api/flashcards/sets/${id}`);
export const addFlashcard = (setId: number, data: any) => api.post(`/api/flashcards/sets/${setId}/cards`, data);
export const updateFlashcardProgress = (cardId: number, data: any) =>
  api.put(`/api/flashcards/cards/${cardId}/progress`, data);

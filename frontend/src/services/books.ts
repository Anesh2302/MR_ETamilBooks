import api from './api';

export const getCategories = () => api.get('/api/books/categories');
export const getBooks = (params?: any) => api.get('/api/books', { params });
export const getBook = (id: number) => api.get(`/api/books/${id}`);
export const createBook = (formData: FormData) => api.post('/api/books', formData);
export const deleteBook = (id: number) => api.delete(`/api/books/${id}`);

export const getBookmarks = () => api.get('/api/books/bookmarks/list');
export const createBookmark = (data: any) => api.post('/api/books/bookmarks', data);
export const deleteBookmark = (id: number) => api.delete(`/api/books/bookmarks/${id}`);

export const updateProgress = (data: any) => api.put('/api/books/progress', data);
export const getProgress = () => api.get('/api/books/progress/list');

import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import Layout from '../components/Layout';
import '../styles/globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect } from 'react';

export default function App({ Component, pageProps, router }: AppProps) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/MR_ETamilBooks/sw.js');
    }
  }, []);
  const isAuthPage = router.pathname === '/login' || router.pathname === '/register';

  return (
    <ThemeProvider>
    <AuthProvider>
      {isAuthPage ? (
        <Component {...pageProps} />
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </AuthProvider>
    </ThemeProvider>
  );
}

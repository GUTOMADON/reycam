import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { isNative } from './platform';

// The Android app draws edge to edge but the WebView may report a zero bottom safe area,
// so the bottom navigation needs its own clearance for the gesture bar there.
if (isNative() && /Android/i.test(navigator.userAgent)) document.documentElement.classList.add('android-app');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => undefined);
  });
}

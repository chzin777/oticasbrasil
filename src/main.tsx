import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './lib/siteStore';
import App from './App.tsx';
import { WishlistProvider } from './components/WishlistContext';
import { ToastProvider } from './components/ToastContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ToastProvider>
      <WishlistProvider>
        <App />
      </WishlistProvider>
    </ToastProvider>
  </BrowserRouter>
);

import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './lib/siteStore';
import App from './App.tsx';
import { WishlistProvider } from './components/WishlistContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <WishlistProvider>
      <App />
    </WishlistProvider>
  </BrowserRouter>
);

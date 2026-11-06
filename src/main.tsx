import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/cyrillic-400.css';
import '@fontsource/nunito/cyrillic-600.css';
import '@fontsource/nunito/cyrillic-700.css';
import '@fontsource/source-serif-4/latin-600.css';
import '@fontsource/source-serif-4/cyrillic-600.css';
import '@fontsource/source-serif-4/cyrillic-ext-600.css';
import '@fontsource/press-start-2p/400.css';
import './index.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Не найден корневой элемент');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { checkContentInDev } from './content.ts';
import { Stage } from './Stage.tsx';
import './style.css';

void checkContentInDev();
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Stage>
        <App />
      </Stage>
    </StrictMode>,
  );
}

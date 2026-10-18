import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { checkContentInDev } from './content.ts';
import { Stage } from './Stage.tsx';
import { titlePhoto, warmPhotos } from './desk/photo-preload.ts';
import { PHOTO_VARIANTS } from './desk/model.ts';
import './style.css';

void checkContentInDev();
const root = document.getElementById('root');
if (root) {
  // The title's photograph first (round R5, B8): requested as the app starts, before the title mounts; the desk
  // photos' warm-up waits until it is drawn.
  const photo = titlePhoto();
  createRoot(root).render(
    <StrictMode>
      <Stage>
        <App />
      </Stage>
    </StrictMode>,
  );
  void photo.then(() => warmPhotos(PHOTO_VARIANTS));
}

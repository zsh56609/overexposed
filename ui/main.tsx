import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Toolchain entry only. No UI until 10/10 (CLAUDE.md §7).
const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode>{null}</StrictMode>);

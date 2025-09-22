// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Bootstraps the popup React tree inside the extension popup window.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

// Mount the app with StrictMode so we surface lifecycle warnings in dev.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css'; // <--- THIS IS THE CRUCIAL LINE

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
import React from 'react';
import ReactDOM from 'react-dom/client';
import WebApp from './WebApp';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element missing');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <WebApp />
  </React.StrictMode>
);

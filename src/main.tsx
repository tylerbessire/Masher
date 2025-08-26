import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
window.addEventListener("error", e => {
    console.error("Global error caught:", e.message, e.error?.stack);
  });
  window.addEventListener("unhandledrejection", e => {
    console.error("Unhandled promise rejection:", e.reason);
  });
createRoot(document.getElementById("root")!).render(<App />);

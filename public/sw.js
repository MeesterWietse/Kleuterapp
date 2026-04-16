// Service worker om de PWA installeerbaar te maken
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // Omdat we Vite met een dev server draaien of static files,
  // is een dummy fetch event voldoende om de browser de app als PWA te laten zien
});

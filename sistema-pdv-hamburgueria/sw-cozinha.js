const CACHE_NAME = 'cozinha-v1';
const urlsToCache = [
  '/balcao.html',
  '/manifest-cozinha.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js'
];

// Install - cachear recursos
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Service Worker: Cache aberto');
        return cache.addAll(urlsToCache).catch((err) => {
          console.warn('⚠️ Alguns recursos não puderam ser cacheados:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate - limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - estratégia Network First (dados em tempo real)
self.addEventListener('fetch', (event) => {
  // Ignorar requests do Firebase
  if (event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone a resposta
        const responseToCache = response.clone();
        
        // Cachear nova versão
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      })
      .catch(() => {
        // Se offline, tentar buscar do cache
        return caches.match(event.request);
      })
  );
});

// Notificações Push
self.addEventListener('push', (event) => {
  console.log('📬 Notificação push recebida');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || '🍔 Novo Pedido';
  const options = {
    body: data.body || 'Você tem um novo pedido na cozinha',
    icon: data.icon || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"%3E%3Crect width="192" height="192" rx="20" fill="%23667eea"/%3E%3Ctext x="96" y="140" font-size="120" text-anchor="middle" fill="white"%3E👨‍🍳%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext y=".9em" font-size="90"%3E👨‍🍳%3C/text%3E%3C/svg%3E',
    vibrate: [200, 100, 200],
    tag: 'kitchen-order',
    requireInteraction: true,
    data: data
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notificação clicada:', event.notification.tag);
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/balcao.html')
  );
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

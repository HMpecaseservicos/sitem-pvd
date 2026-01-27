// Service Worker para Painel de Pedidos PWA
// GO BURGER - Notificações Push Profissionais

const CACHE_NAME = 'goburger-painel-v1.0.2';
const urlsToCache = [
  '/painel-pedidos.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativar Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Ativando Service Worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar requisições
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retorna resposta do cache
        if (response) {
          return response;
        }
        // Clone a requisição
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Verifica se é uma resposta válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone a resposta
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
  );
});

// ========================================
// NOTIFICAÇÕES PUSH
// ========================================

// Receber Push do Firebase
self.addEventListener('push', event => {
  console.log('[SW] Push recebido:', event);
  
  let data = {
    title: 'GO BURGER',
    body: 'Novo pedido recebido!',
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍔</text></svg>",
    badge: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📋</text></svg>",
    tag: 'novo-pedido',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: 'Ver Pedido', icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>👀</text></svg>" },
      { action: 'close', title: 'Fechar', icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>❌</text></svg>" }
    ]
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const promiseChain = self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    requireInteraction: data.requireInteraction,
    vibrate: data.vibrate,
    actions: data.actions,
    data: {
      url: '/painel-pedidos.html',
      timestamp: Date.now()
    }
  });
  
  event.waitUntil(promiseChain);
});

// Click na notificação
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notificação clicada:', event.action);
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow('/painel-pedidos.html')
    );
  }
});

// ========================================
// SINCRONIZAÇÃO EM BACKGROUND
// ========================================

self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  try {
    // Notificar clientes sobre sincronização
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_ORDERS',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('[SW] Erro ao sincronizar:', error);
  }
}

// ========================================
// MENSAGENS DO CLIENTE
// ========================================

self.addEventListener('message', event => {
  console.log('[SW] Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'NEW_ORDER') {
    // Mostrar notificação de novo pedido
    const order = event.data.order;
    self.registration.showNotification('🍔 Novo Pedido!', {
      body: `Pedido #${order.number} - ${order.customerName}`,
      icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔔</text></svg>",
      badge: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📋</text></svg>",
      tag: `order-${order.id}`,
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 300],
      actions: [
        { action: 'view', title: 'Ver Agora' },
        { action: 'later', title: 'Ver Depois' }
      ],
      data: {
        url: '/painel-pedidos.html',
        orderId: order.id
      }
    });
  }
  
  if (event.data && event.data.type === 'ORDER_READY') {
    // Notificação de pedido pronto
    const order = event.data.order;
    self.registration.showNotification('✅ Pedido Pronto!', {
      body: `Pedido #${order.number} está pronto para entrega`,
      icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎉</text></svg>",
      badge: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✅</text></svg>",
      tag: `ready-${order.id}`,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: {
        url: '/painel-pedidos.html?filter=ready',
        orderId: order.id
      }
    });
  }
});

console.log('[SW] Service Worker carregado - GO BURGER v1.0.2');

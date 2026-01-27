// Service Worker para BurgerPDV
// Versão: 1.0.8 - FIX FINAL: String adicionais conversion
// Cache agressivo e fila de sincronização

const CACHE_VERSION = 'burgerpdv-v1.0.8';
const CACHE_NAMES = {
  static: `${CACHE_VERSION}-static`,
  dynamic: `${CACHE_VERSION}-dynamic`,
  images: `${CACHE_VERSION}-images`,
  fonts: `${CACHE_VERSION}-fonts`,
  data: `${CACHE_VERSION}-data` // MUDANÇA 26: Cache de dados
};

// MUDANÇA 26: Fila de sincronização offline
let syncQueue = [];
const SYNC_QUEUE_KEY = 'pdv-sync-queue';

// Arquivos essenciais para cache offline (apenas os que existem)
const STATIC_CACHE_URLS = [
  '/sistema-pdv-hamburgueria/',
  '/sistema-pdv-hamburgueria/index.html',
  '/sistema-pdv-hamburgueria/assets/css/styles.css',
  '/sistema-pdv-hamburgueria/manifest.json'
];

// Estratégia: Cache First para recursos estáticos
const CACHE_FIRST_RESOURCES = [
  /\.css$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.otf$/,
  /\.eot$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.svg$/
];

// Estratégia: Network First para dados dinâmicos
const NETWORK_FIRST_RESOURCES = [
  /\.js$/,
  /api/,
  /firebase/
];

// ===== INSTALAÇÃO =====
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker instalando...', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then((cache) => {
        console.log('📦 Cache estático criado');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('✅ Service Worker instalado com sucesso');
        return self.skipWaiting(); // Ativa imediatamente
      })
      .catch((error) => {
        console.error('❌ Erro ao instalar Service Worker:', error);
      })
  );
});

// ===== ATIVAÇÃO =====
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker ativando...', CACHE_VERSION);
  
  event.waitUntil(
    // Limpar caches antigos
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Remove caches que não são da versão atual
              return !Object.values(CACHE_NAMES).includes(cacheName);
            })
            .map((cacheName) => {
              console.log('🗑️ Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker ativado');
        return self.clients.claim(); // Assume controle imediatamente
      })
  );
});

// ===== FETCH (Interceptação de Requisições) =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-HTTP (chrome-extension://, etc)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Ignora Firebase Realtime Database (sempre online)
  if (url.hostname.includes('firebaseio.com')) {
    return;
  }

  // Estratégia de cache baseada no tipo de recurso
  if (isCacheFirst(request)) {
    event.respondWith(cacheFirstStrategy(request));
  } else if (isNetworkFirst(request)) {
    event.respondWith(networkFirstStrategy(request));
  } else {
    event.respondWith(networkFirstStrategy(request));
  }
});

// ===== ESTRATÉGIAS DE CACHE =====

// Cache First: Usa cache se disponível, senão busca na rede
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Retorna do cache e atualiza em background
      updateCacheInBackground(request);
      return cachedResponse;
    }
    
    // Não está no cache, busca na rede
    return await fetchAndCache(request, CACHE_NAMES.static);
  } catch (error) {
    console.error('❌ Erro em cacheFirstStrategy:', error);
    return new Response('Offline - Recurso não disponível', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Network First: Tenta rede primeiro, fallback para cache
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    
    // Só cachear requisições GET com sucesso
    if (response && response.status === 200 && request.method === 'GET') {
      const responseClone = response.clone();
      caches.open(CACHE_NAMES.dynamic).then((cache) => {
        cache.put(request, responseClone);
      }).catch(err => {
        // Silenciosamente ignorar erros de cache
        console.debug('Cache put falhou:', err.message);
      });
    }
    
    return response;
  } catch (error) {
    // Falha na rede, tenta buscar no cache (apenas para GET)
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Offline e não há cache
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
}

// Busca na rede e adiciona ao cache
async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);
  
  if (response && response.status === 200 && request.method === 'GET') {
    const responseClone = response.clone();
    const cache = await caches.open(cacheName);
    await cache.put(request, responseClone).catch(err => {
      console.debug('Cache put falhou:', err.message);
    });
  }
  
  return response;
}

// Atualiza cache em background (stale-while-revalidate)
function updateCacheInBackground(request) {
  if (request.method !== 'GET') return;
  
  fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        caches.open(CACHE_NAMES.static).then((cache) => {
          cache.put(request, response).catch(err => {
            console.debug('Cache put falhou:', err.message);
          });
        });
      }
    })
    .catch(() => {
      // Falha silenciosa, usuário já tem versão em cache
    });
}

// ===== HELPERS =====

function isCacheFirst(request) {
  return CACHE_FIRST_RESOURCES.some((pattern) => pattern.test(request.url));
}

function isNetworkFirst(request) {
  return NETWORK_FIRST_RESOURCES.some((pattern) => pattern.test(request.url));
}

// ===== MENSAGENS =====
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(CACHE_NAMES.dynamic)
        .then((cache) => cache.addAll(urls))
    );
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// ===== SYNC (Background Sync) =====
self.addEventListener('sync', (event) => {
  console.log('🔄 Background Sync:', event.tag);
  
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
  
  if (event.tag === 'sync-products') {
    event.waitUntil(syncProducts());
  }
  
  // MUDANÇA 26: Processar fila de sincronização
  if (event.tag === 'sync-queue') {
    event.waitUntil(processSyncQueue());
  }
});

// MUDANÇA 26: Processar fila de sincronização offline
async function processSyncQueue() {
  try {
    console.log('📤 Processando fila de sincronização...');
    
    // Carregar fila do IndexedDB ou cache
    const queue = await loadSyncQueue();
    
    if (queue.length === 0) {
      console.log('✅ Fila vazia');
      return;
    }
    
    console.log(`📦 ${queue.length} itens na fila`);
    
    // Processar cada item
    const results = await Promise.allSettled(
      queue.map(item => syncQueueItem(item))
    );
    
    // Remover itens sincronizados com sucesso
    const successfulIds = results
      .filter((r, i) => r.status === 'fulfilled')
      .map((r, i) => queue[i].id);
    
    if (successfulIds.length > 0) {
      await removeSyncQueueItems(successfulIds);
      console.log(`✅ ${successfulIds.length} itens sincronizados`);
    }
    
    const failedCount = results.filter(r => r.status === 'rejected').length;
    if (failedCount > 0) {
      console.warn(`⚠️ ${failedCount} itens falharam`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar fila:', error);
    throw error;
  }
}

async function syncQueueItem(item) {
  // Implementar lógica de sincronização baseada no tipo
  console.log('🔄 Sincronizando item:', item.type);
  
  switch (item.type) {
    case 'ORDER':
      return fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data)
      });
    case 'CUSTOMER':
      return fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data)
      });
    default:
      console.warn('Tipo desconhecido:', item.type);
      return Promise.resolve();
  }
}

async function loadSyncQueue() {
  try {
    // Tentar carregar do cache
    const cache = await caches.open(CACHE_NAMES.data);
    const response = await cache.match(SYNC_QUEUE_KEY);
    
    if (response) {
      const data = await response.json();
      return data.queue || [];
    }
    
    return [];
  } catch (error) {
    console.error('❌ Erro ao carregar fila:', error);
    return [];
  }
}

async function removeSyncQueueItems(ids) {
  try {
    const queue = await loadSyncQueue();
    const newQueue = queue.filter(item => !ids.includes(item.id));
    
    // Salvar fila atualizada
    const cache = await caches.open(CACHE_NAMES.data);
    await cache.put(
      SYNC_QUEUE_KEY,
      new Response(JSON.stringify({ queue: newQueue }))
    );
    
  } catch (error) {
    console.error('❌ Erro ao remover itens da fila:', error);
  }
}

async function syncOrders() {
  try {
    console.log('📦 Sincronizando pedidos...');
    // Implementar lógica de sincronização
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Erro ao sincronizar pedidos:', error);
    throw error;
  }
}

async function syncProducts() {
  try {
    console.log('📦 Sincronizando produtos...');
    // Implementar lógica de sincronização
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Erro ao sincronizar produtos:', error);
    throw error;
  }
}

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'BurgerPDV';
  const options = {
    body: data.body || 'Nova notificação',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ===== NOTIFICATION CLICK =====
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Verifica se já há uma janela aberta
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Abre nova janela se não houver
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

console.log('✅ Service Worker carregado:', CACHE_VERSION);

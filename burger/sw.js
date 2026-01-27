// GO BURGER - Service Worker PWA
// ATUALIZAÇÃO AUTOMÁTICA - Versão com timestamp
// Atualizado: 14/01/2026 - Sistema de Fichas de Fidelidade

// IMPORTANTE: Altere este número sempre que fizer mudanças no código
const VERSION = '5.5';
const BUILD_DATE = '20260114-1600'; // Data e hora da build
const CACHE_NAME = `go-burger-v${VERSION}-${BUILD_DATE}`;
const STATIC_CACHE = `go-burger-static-v${VERSION}-${BUILD_DATE}`;

console.log(`🔄 Service Worker versão ${VERSION} (${BUILD_DATE}) iniciando...`);

// Recursos para cache
const CACHE_URLS = [
    './',
    './index.html',
    './offline.html',
    './chileno.png',
    './frances.png',
    './australiano.png',
    './canadense.png',
    './italiano.png',
    './argentino.png',
    './brasileiro.png',
    './americano.png',
    './ingles.png',
    './paraguaio.png',
    './alemao.png',
    './combo.png',
    './ANEIS-CEBOLA.jpeg',
    './batata.jpeg',
    './aqua.jpeg',
    './refri-lata.jpeg',
    './coca2l.jpg',
    './guarana.jpg',
    './suco-lata.jpeg',
    './logo-go-burger.jpg',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
    console.log('🚀 GO BURGER Service Worker Instalando...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('📦 Cache aberto');
                return cache.addAll(CACHE_URLS);
            })
            .then(() => {
                console.log('✅ Recursos em cache');
                
                // Notificar cliente sobre cache atualizado
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'CACHE_UPDATED',
                            message: 'App pronto para uso offline!'
                        });
                    });
                });
                
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ Erro ao instalar SW:', error);
            })
    );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
    console.log('🔄 GO BURGER Service Worker Ativando...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== CACHE_NAME) {
                            console.log('🗑️ Removendo cache antigo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker Ativo!');
                return self.clients.claim();
            })
    );
});

// Mensagens do cliente (para PWAs)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('📱 PWA: Pulando espera e ativando imediatamente');
        self.skipWaiting();
    }
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
    // Ignorar requisições não-HTTP
    if (!event.request.url.startsWith('http')) return;
    
    // Cache First Strategy para recursos estáticos
    // Ignorar requisições para URLs externas (ex: via.placeholder.com)
    if (!event.request.url.startsWith(self.location.origin) && 
        !event.request.url.includes('font-awesome') &&
        !event.request.url.includes('googleapis')) {
        return;
    }
    
    if (event.request.destination === 'image' || 
        event.request.destination === 'style' || 
        event.request.destination === 'script' ||
        event.request.url.includes('font-awesome')) {
        
        event.respondWith(
            caches.open(STATIC_CACHE)
                .then(cache => {
                    return cache.match(event.request)
                        .then(response => {
                            if (response) {
                                return response;
                            }
                            
                            return fetch(event.request)
                                .then(fetchResponse => {
                                    if (fetchResponse.ok) {
                                        cache.put(event.request, fetchResponse.clone());
                                    }
                                    return fetchResponse;
                                })
                                .catch(() => response || new Response('', {status: 404}));
                        });
                })
        );
        return;
    }
    
    // Ignorar requisições Firebase e APIs externas
    if (event.request.url.includes('firebaseio.com') || 
        event.request.url.includes('googleapis.com') ||
        event.request.method !== 'GET') {
        event.respondWith(fetch(event.request));
        return;
    }
    
    // Network First Strategy para conteúdo dinâmico
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Se a rede funciona, cache a resposta (apenas GET)
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseClone);
                        });
                }
                return response;
            })
            .catch(() => {
                // Se a rede falha, tenta o cache
                return caches.match(event.request)
                    .then(response => {
                        if (response) {
                            return response;
                        }
                        
                        // Página offline personalizada para navegação
                        if (event.request.mode === 'navigate') {
                            return caches.match('./offline.html');
                        }
                    });
            })
    );
});

// Sincronização em background
self.addEventListener('sync', event => {
    console.log('🔄 Sincronização em background:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Implementar sincronização de pedidos offline
            syncOfflineOrders()
        );
    }
});

async function syncOfflineOrders() {
    try {
        // Recuperar pedidos offline do IndexedDB
        const offlineOrders = await getOfflineOrders();
        
        for (const order of offlineOrders) {
            try {
                // Tentar enviar pedido quando online
                await sendOrder(order);
                await removeOfflineOrder(order.id);
                console.log('📤 Pedido sincronizado:', order.id);
            } catch (error) {
                console.error('❌ Erro ao sincronizar pedido:', error);
            }
        }
    } catch (error) {
        console.error('❌ Erro na sincronização:', error);
    }
}

// Notificações Push (preparado para futuro)
self.addEventListener('push', event => {
    if (!event.data) return;
    
    const data = event.data.json();
    
    const options = {
        body: data.body || 'Seu pedido está sendo preparado!',
        icon: './logo-go-burger.jpg',
        badge: './logo-go-burger.jpg',
        vibrate: [200, 100, 200],
        data: data,
        actions: [
            {
                action: 'view',
                title: 'Ver Pedido',
                icon: './logo-go-burger.jpg'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'GO BURGER', options)
    );
});

// Clique em notificação
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('./index.html')
        );
    }
});

// Funções auxiliares para IndexedDB (offline)
async function getOfflineOrders() {
    // Implementação futura para IndexedDB
    return [];
}

async function sendOrder(order) {
    // Implementação futura para API
    return Promise.resolve();
}

async function removeOfflineOrder(orderId) {
    // Implementação futura para IndexedDB
    return Promise.resolve();
}

console.log('🍔 GO BURGER Service Worker carregado!');
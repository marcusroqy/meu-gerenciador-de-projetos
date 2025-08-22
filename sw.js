const CACHE_NAME = 'gerenciador-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';

// Arquivos para cache estático
const STATIC_FILES = [
  '/',
  '/index.html',
  '/login.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined',
  'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
  'https://fonts.gstatic.com/s/materialsymbolsoutlined/v1/kJF1BvYX7BgnkSrUwT8OhrdQw4oELdPIeeIIFvqoQ_BywVRJf6yfsxLqN2.woff2'
];

// Estratégia de cache: Cache First para arquivos estáticos
self.addEventListener('install', (event) => {
  console.log('Service Worker instalando...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Cache estático aberto');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Arquivos estáticos cacheados');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Erro ao cachear arquivos estáticos:', error);
      })
  );
});

// Estratégia de cache: Network First para dados dinâmicos
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache First para arquivos estáticos
  if (STATIC_FILES.includes(url.pathname) || 
      STATIC_FILES.includes(request.url) ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.html')) {
    
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(STATIC_CACHE)
                  .then((cache) => cache.put(request, responseClone));
              }
              return response;
            });
        })
    );
  }
  
  // Network First para APIs e dados dinâmicos
  else if (url.pathname.includes('/api/') || url.pathname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((response) => {
              if (response) {
                return response;
              }
              // Fallback para dados offline
              if (url.pathname.includes('/api/projects')) {
                return new Response(JSON.stringify([
                  { id: 1, name: 'Projeto Demo', tasks: [] }
                ]), {
                  headers: { 'Content-Type': 'application/json' }
                });
              }
              if (url.pathname.includes('/api/tasks')) {
                return new Response(JSON.stringify([
                  { id: 1, title: 'Tarefa Demo', status: 'todo', priority: 'Média' }
                ]), {
                  headers: { 'Content-Type': 'application/json' }
                });
              }
              return new Response('Dados offline não disponíveis', { status: 404 });
            });
        })
    );
  }
  
  // Cache First para outros recursos
  else {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          return response || fetch(request);
        })
    );
  }
});

// Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  console.log('Service Worker ativando...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker ativado');
        return self.clients.claim();
      })
  );
});

// Intercepta mensagens do app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Background sync para funcionalidades offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Sincroniza dados quando voltar online
      syncData()
    );
  }
});

// Função para sincronizar dados
async function syncData() {
  try {
    // Aqui você implementaria a lógica de sincronização
    // com o Supabase ou outro backend
    console.log('Sincronizando dados em background...');
    
    // Exemplo de sincronização
    const offlineData = await getOfflineData();
    if (offlineData.length > 0) {
      // Envia dados offline para o servidor
      console.log('Dados offline sincronizados:', offlineData);
    }
  } catch (error) {
    console.error('Erro na sincronização:', error);
  }
}

// Função para obter dados offline
async function getOfflineData() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const requests = await cache.keys();
    const offlineData = [];
    
    for (const request of requests) {
      if (request.url.includes('/api/')) {
        const response = await cache.match(request);
        if (response) {
          const data = await response.json();
          offlineData.push({ url: request.url, data });
        }
      }
    }
    
    return offlineData;
  } catch (error) {
    console.error('Erro ao obter dados offline:', error);
    return [];
  }
}

// Push notifications (para futuras implementações)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nova notificação do Gerenciador',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/'
      },
      actions: [
        {
          action: 'view',
          title: 'Ver',
          icon: '/icons/icon-72x72.png'
        },
        {
          action: 'close',
          title: 'Fechar',
          icon: '/icons/icon-72x72.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Gerenciador de Projetos', options)
    );
  }
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

console.log('Service Worker carregado:', CACHE_NAME);

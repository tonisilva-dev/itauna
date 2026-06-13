/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

/* Assume controle imediatamente sem esperar fechar abas */
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

/* ── Push notifications ── */
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  const data = event.data.json() as {
    title: string;
    body: string;
    url?: string;
    icon?: string;
    badge?: string;
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon  ?? '/logo-itauna.png',
      badge: data.badge ?? '/logo-itauna.png',
      data: { url: data.url ?? '/' },
    } as NotificationOptions)
  );
});

/* ── Click: abre/foca a aba correta ── */
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const match = clients.find(c => c.url.includes(url));
        if (match) return match.focus();
        return self.clients.openWindow(url);
      })
  );
});

/* ── Skip waiting para atualizar imediatamente ── */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

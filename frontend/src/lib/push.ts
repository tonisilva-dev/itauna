/**
 * push.ts — Utilitários para Web Push PWA
 * Gerencia permissão, subscription e envio de notificações.
 */
import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

/* Converte base64url → Uint8Array (formato exigido pela Push API) */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr as Uint8Array<ArrayBuffer>;
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getPermission(): NotificationPermission {
  return Notification.permission;
}

/** Solicita permissão e cria a subscription no browser + Supabase */
export async function subscribePush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub = existing ?? await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const { endpoint, keys } = sub.toJSON() as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    { onConflict: 'endpoint' }
  );

  return true;
}

/** Remove a subscription do browser e do Supabase */
export async function unsubscribePush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const { endpoint } = sub.toJSON() as { endpoint: string };
  await sub.unsubscribe();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}

/** Verifica se este dispositivo já está inscrito */
export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

/** Dispara uma notificação via Edge Function para um(ns) usuário(s).
 *  Chamado após criar comunicado, encomenda, etc.
 *  Se targetUserIds estiver vazio, envia para TODOS os inscritos.
 */
export async function sendPushNotification(payload: {
  title: string;
  body: string;
  url?: string;
  targetUserIds?: string[];
}): Promise<void> {
  try {
    await supabase.functions.invoke('send-push', { body: payload });
  } catch (err) {
    console.warn('[itauna:push] sendPushNotification falhou', err);
  }
}

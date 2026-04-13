import { useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  type: string;
  data: {
    type: string;
    title: string;
    message: string;
    ticket_id?: number;
    enrollment_id?: number;
  };
  read_at: string | null;
  created_at: string;
}

// ── Sound (always played by the page) ────────────────────────────────────────
const playNotificationSound = () => {
  try {
    const audio = new Audio('/sounds/notificacion.mp3');
    audio.volume = 0.8;
    audio.play().catch(e => console.warn('Audio play failed (user interaction required):', e));
  } catch (e) {
    console.error('Audio play failed', e);
  }
};

// ── Dispatch a global event so any page can react to data changes ─────────────
const dispatchDataChange = (notifType: string) => {
  // Ticket-related
  if (notifType === 'ticket_assigned' || notifType === 'ticket_status') {
    window.dispatchEvent(new CustomEvent('crm:tickets-changed'));
  }
  // Enrollment-related
  if (notifType === 'enrollment_completed') {
    window.dispatchEvent(new CustomEvent('crm:enrollments-changed'));
  }
};

// ── Service Worker ────────────────────────────────────────────────────────────
let swRegistration: ServiceWorkerRegistration | null = null;

async function registerNotificationSW(token: string, knownIds: string[]) {
  if (!('serviceWorker' in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register('/notification-sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    sendToSW({ type: 'INIT', token, notificationIds: knownIds });
  } catch (err) {
    console.error('SW registration failed', err);
  }
}

function sendToSW(message: Record<string, unknown>) {
  if (swRegistration?.active) {
    swRegistration.active.postMessage(message);
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const previousNotificationsRef = useRef<Notification[]>([]);
  const isInitialLoad = useRef(true);
  const swInitialized = useRef(false);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data.data;
    },
    enabled: !!user,
    refetchInterval: 15000,            // Sync fallback every 15s when tab is active
    refetchIntervalInBackground: true, // Also keep running when tab is in background
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // ── Register Service Worker once ────────────────────────────────────────
  useEffect(() => {
    if (!user || swInitialized.current) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    swInitialized.current = true;
    const knownIds = notifications.map(n => n.id);
    registerNotificationSW(token, knownIds);
  }, [user, notifications]);

  // ── Listen for messages from the Service Worker ───────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleSWMessage = (event: MessageEvent) => {
      const { type } = event.data || {};

      if (type === 'NEW_NOTIFICATIONS') {
        // SW found new notifications while this tab was in the background.
        // Play sound + refresh notification list + refresh related data.
        playNotificationSound();
        queryClient.invalidateQueries({ queryKey: ['notifications'] });

        const notifs: Notification[] = event.data.notifications || [];
        notifs.forEach(n => dispatchDataChange(n.data?.type));
      }

      if (type === 'TOKEN_EXPIRED') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }

      if (type === 'NAVIGATE') {
        const { path } = event.data as { path: string };
        if (path) window.location.href = path;
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage);
  }, [queryClient]);

  // ── Detect new notifications while the tab IS active ─────────────────────
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      previousNotificationsRef.current = notifications;
      return;
    }

    const prevIds = new Set(previousNotificationsRef.current.map(n => n.id));
    const newOnes = notifications.filter(n => !prevIds.has(n.id) && !n.read_at);

    if (newOnes.length > 0) {
      // Always play sound – whether SW is registered or not
      playNotificationSound();

      // Show browser notification if SW is NOT handling it (fallback)
      if (!swRegistration?.active) {
        if ('Notification' in window && Notification.permission === 'granted') {
          newOnes.forEach(n => {
            new window.Notification(n.data.title || 'Nueva Notificación', {
              body: n.data.message || '',
              icon: '/favicon.svg',
            });
          });
        }
      }

      // Trigger data refresh in relevant modules
      newOnes.forEach(n => dispatchDataChange(n.data?.type));
    }

    previousNotificationsRef.current = notifications;
  }, [notifications]);

  // ── Keep SW token fresh ───────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && swRegistration?.active) {
      sendToSW({ type: 'UPDATE_TOKEN', token });
    }
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  return {
    notifications,
    unreadCount,
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
    markAllAsRead: () => markAllAsReadMutation.mutate(),
  };
}

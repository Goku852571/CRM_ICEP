/**
 * Notification Service Worker
 * Polls the backend independently of the browser tab — works in background.
 */

const POLL_INTERVAL_MS = 15000; // 15 seconds
const API_BASE = 'http://localhost:8000/api/v1';

let authToken = null;
let knownNotificationIds = new Set();
let pollTimer = null;
let isInitialized = false;

// ── Message handler: receive token from the main app ──────────────────────────
self.addEventListener('message', (event) => {
  const { type, token, notificationIds } = event.data || {};

  if (type === 'INIT') {
    authToken = token;

    // Seed the known IDs so we don't re-fire on first load
    if (notificationIds && Array.isArray(notificationIds)) {
      notificationIds.forEach(id => knownNotificationIds.add(id));
    }

    if (!isInitialized) {
      isInitialized = true;
      startPolling();
    }
  }

  if (type === 'UPDATE_TOKEN') {
    authToken = token;
  }

  if (type === 'LOGOUT') {
    authToken = null;
    knownNotificationIds.clear();
    isInitialized = false;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }
});

// ── Polling logic ─────────────────────────────────────────────────────────────
function startPolling() {
  // Run immediately once, then at each interval
  poll();
  pollTimer = setInterval(poll, POLL_INTERVAL_MS);
}

async function poll() {
  if (!authToken) return;

  try {
    const response = await fetch(`${API_BASE}/notifications`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      // Token expired — stop polling and tell the page
      authToken = null;
      clearInterval(pollTimer);
      pollTimer = null;
      broadcastToClients({ type: 'TOKEN_EXPIRED' });
      return;
    }

    if (!response.ok) return;

    const json = await response.json();
    const notifications = json.data || [];

    const newNotifications = notifications.filter(n => {
      return !n.read_at && !knownNotificationIds.has(n.id);
    });

    if (newNotifications.length > 0) {
      // Register new IDs
      newNotifications.forEach(n => knownNotificationIds.add(n.id));

      // Show desktop notification for each
      for (const n of newNotifications) {
        await showDesktopNotification(n);
      }

      // Tell the page to play sound and refresh its data
      broadcastToClients({
        type: 'NEW_NOTIFICATIONS',
        notifications: newNotifications,
      });
    }

    // Always sync known IDs with current server list to avoid leaking memory
    const serverIds = new Set(notifications.map(n => n.id));
    knownNotificationIds.forEach(id => {
      if (!serverIds.has(id)) knownNotificationIds.delete(id);
    });

  } catch (err) {
    // Network error — silently retry next cycle
  }
}

async function showDesktopNotification(notification) {
  try {
    const permission = await self.registration.showNotification(
      notification.data?.title || 'Nueva Notificación',
      {
        body: notification.data?.message || '',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: `crm-notif-${notification.id}`,
        renotify: true,
        requireInteraction: false,
        silent: true, // Sound is played by the page
        data: {
          notificationId: notification.id,
          type: notification.data?.type,
          ticket_id: notification.data?.ticket_id,
          enrollment_id: notification.data?.enrollment_id,
        },
      }
    );
  } catch (e) {
    // showNotification might fail if permission was revoked
  }
}

// ── Notification click: focus or open the CRM tab ────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { type, ticket_id, enrollment_id } = event.notification.data || {};

  let targetPath = '/';
  if (type === 'ticket_assigned' || type === 'ticket_status') {
    targetPath = '/tickets';
  } else if (type === 'enrollment_completed') {
    targetPath = '/enrollments';
  } else if (type === 'calendar_event') {
    targetPath = '/calendar';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Try to focus an existing tab
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', path: targetPath, ticket_id, enrollment_id });
          return;
        }
      }
      // No open tab — open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(self.location.origin + targetPath);
      }
    })
  );
});

// ── Broadcast helper ──────────────────────────────────────────────────────────
async function broadcastToClients(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(client => client.postMessage(message));
}

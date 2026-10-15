/* Web Push handlers, loaded into the generated service worker with
   workbox importScripts (see vite.config.js). Payload from FullBackendd
   utils/push.js: { title, body, url, tag, icon, badge, app, ack?, call? }.
   call = { callId, kind } for an incoming voice/video call. */

// Long, ringtone-like vibration for an incoming call.
const CALL_VIBRATION = [800, 400, 800, 400, 800, 400, 800, 400, 800];

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil((async () => {
    // Delivery receipt: tells the sender this phone got it, even with the app
    // closed (two grey ticks; "Ringing…" on the caller's screen). See FullBackendd utils/pushAck.js.
    const receipt = data.ack?.url
      ? fetch(data.ack.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: data.ack.token }),
        }).catch(() => {})
      : null;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    windows.forEach((w) => w.postMessage({ type: 'push', data }));

    // An incoming call while the app is open and in front: the app's own call
    // screen is already ringing, so no notification on top of it.
    if (data.call && windows.some((w) => w.focused)) {
      await receipt;
      return;
    }

    // Everything else always shows, even while the app is open, so it lands in the
    // phone's notification bar and history (and Chrome requires one per push).
    const call = data.call && typeof data.call === 'object' ? data.call : null;
    await self.registration.showNotification(data.title || 'Nsoro', {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/icon-192.png',
      tag: data.tag,
      renotify: Boolean(data.tag),
      // an incoming call stays on screen, vibrates like a ringtone and can be
      // answered or declined straight from the notification
      requireInteraction: Boolean(data.call),
      vibrate: data.call ? CALL_VIBRATION : undefined,
      actions: call
        ? [
            { action: 'answer', title: call.kind === 'video' ? 'Answer video' : 'Answer' },
            { action: 'decline', title: 'Decline' },
          ]
        : undefined,
      data: { url: data.url || '/', call, ack: data.ack },
    });
    await receipt;
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { url, call, ack } = event.notification.data || {};

  // Decline: tell the server and stop there (the app doesn't need to open).
  if (call && event.action === 'decline') {
    if (ack?.url) {
      event.waitUntil(
        fetch(ack.url.replace(/\/ack$/, '/call-decline'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: ack.token }),
        }).catch(() => {})
      );
    }
    return;
  }

  // Answer (or a tap on an incoming-call notification): open the chat and pick up.
  const answering = call && event.action !== 'decline';
  const target = new URL(url || '/', self.location.origin);
  if (answering) target.searchParams.set('answer', call.callId);

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Reuse an open window of this app if there is one.
    const same = windows.find((w) => new URL(w.url).origin === self.location.origin);
    if (same) {
      await same.focus();
      if (answering) {
        // the app is already running and the call is ringing in it - just answer
        same.postMessage({ type: 'call-answer', callId: call.callId });
        return;
      }
      if ('navigate' in same) {
        try {
          await same.navigate(target.href);
        } catch {
          // some browsers only allow navigate() on controlled clients
        }
      }
      return;
    }
    await self.clients.openWindow(target.href);
  })());
});

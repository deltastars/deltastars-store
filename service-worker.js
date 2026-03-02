// Firebase Cloud Messaging (FCM) Support
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

// Initialize Firebase in the Service Worker
// Note: These should be replaced with real config from Firebase Console
const firebaseConfig = {
  apiKey: "FIREBASE_API_KEY_PLACEHOLDER",
  authDomain: "delta-stars-sovereign.firebaseapp.com",
  projectId: "delta-stars-sovereign",
  storageBucket: "delta-stars-sovereign.appspot.com",
  messagingSenderId: "SENDER_ID_PLACEHOLDER",
  appId: "APP_ID_PLACEHOLDER"
};

if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('Delta SW: Received background message ', payload);
    const notificationTitle = payload.notification.title || 'Delta Stars Update';
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/https://lh3.googleusercontent.com/d/1-0qvsPmpVVnWdGJHrlJ4rbtecG-i5n4l',
      badge: '/https://lh3.googleusercontent.com/d/1-0qvsPmpVVnWdGJHrlJ4rbtecG-i5n4l',
      data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

const CACHE_NAME = 'delta-stars-sovereign-v25.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install Event - Caching core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Delta SW: Caching core assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Cleaning up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('Delta SW: Removing old cache', k);
        return caches.delete(k);
      })
    ))
  );
  self.clients.claim();
});

// Fetch Event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Skip caching for API calls if needed, or handle them specifically
  if (event.request.url.includes('google.com') || event.request.url.includes('googleapis.com')) {
    return; // Let browser handle external APIs
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request).then(response => {
        return response || caches.match('/index.html');
      }))
  );
});

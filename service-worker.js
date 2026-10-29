self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{let data={};try{data=event.data?.json()||{};}catch{}event.waitUntil(self.registration.showNotification(data.title||'704班級系統',{body:data.body||'你有新的班級通知',icon:'./src/icon-192.png',data:{url:data.url||'./'}}));});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.openWindow(new URL(event.notification.data?.url||'./',self.location.href).href));});

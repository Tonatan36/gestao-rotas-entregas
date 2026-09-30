self.addEventListener("install", function (evento) {
  evento.waitUntil(
    caches.open("rotas-cache-v1").then(function (cache) {
      return cache.addAll([
        "./index.html",
        "./style.css",
        "./script.js"
      ]);
    })
  );
});

self.addEventListener("fetch", function (evento) {
  evento.respondWith(
    caches.match(evento.request).then(function (resposta) {
      return resposta || fetch(evento.request);
    })
  );
});
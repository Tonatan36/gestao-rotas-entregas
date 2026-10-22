self.addEventListener("install", function (evento) {
  evento.waitUntil(
    caches.open("rotas-cache-v2").then(function (cache) {
      return cache.addAll([
        "./index.html",
        "./clientes.html",
        "./relatorio.html",
        "./style.css",
        "./script.js",
        "./clientes.js",
        "./manifest.json",
        "./icon-192.png"
      ]);
    })
  );
});

self.addEventListener("activate", function (evento) {
  evento.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== "rotas-cache-v2") {
            return caches.delete(key);
          }
        })
      );
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
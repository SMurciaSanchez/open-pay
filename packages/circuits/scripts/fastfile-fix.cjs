/*
 * Arregla un livelock de `fastfile` que cuelga a snarkjs para siempre.
 *
 * EL FALLO
 * --------
 * snarkjs abre los .ptau y .zkey con `readBinFile(..., 1<<22, 1<<24)`, es decir
 * caché de 4 MB y páginas de 16 MB. En `fastfile/src/osfile.js`:
 *
 *     maxPagesLoaded = Math.floor(cacheSize / pageSize) + 1     // = 0 + 1 = 1
 *
 * Solo cabe UNA página. Cuando una lectura cruza un límite de 16 MB hacen falta
 * dos páginas a la vez: la primera queda con `pendingOps > 0` (no desalojable),
 * `freePages` vale 0, y el bucle de `_triggerLoad()` no puede avanzar. Al salir
 * vuelve a programarse con `setImmediate(_triggerLoad)`, así que el proceso gira
 * un núcleo indefinidamente sin leer un byte ni terminar nunca.
 *
 * Se manifestó en la ceremonia de OpenPay: `groth16 setup` corrió 15,4 h sin
 * escribir nada. No era un circuito grande — no iba a terminar jamás.
 *
 * EL ARREGLO
 * ----------
 * Envolver las factorías de fastfile y subir `maxPagesLoaded` para que quepan
 * varias páginas. El campo solo crece dentro de fastfile (en lecturas grandes lo
 * recalcula hacia arriba), así que subirlo es seguro.
 *
 * USO: precargarlo antes de snarkjs, que lo toma del mismo módulo en caché:
 *     node -r ./scripts/fastfile-fix.cjs node_modules/snarkjs/build/cli.cjs ...
 */
const fastFile = require("fastfile");

// Techo de caché por archivo abierto. Con páginas de 16 MB son 16 páginas.
const CACHE_OBJETIVO = 256 * 1024 * 1024;
const PAGINAS_MINIMAS = 4;

function ampliarCache(fd) {
  if (!fd || typeof fd.pageSize !== "number" || typeof fd.maxPagesLoaded !== "number") return fd;
  const deseadas = Math.max(PAGINAS_MINIMAS, Math.floor(CACHE_OBJETIVO / fd.pageSize));
  if (deseadas > fd.maxPagesLoaded) fd.maxPagesLoaded = deseadas;
  return fd;
}

for (const nombre of Object.keys(fastFile)) {
  const original = fastFile[nombre];
  if (typeof original !== "function") continue;
  fastFile[nombre] = function (...args) {
    const r = original.apply(this, args);
    return r && typeof r.then === "function" ? r.then(ampliarCache) : ampliarCache(r);
  };
}

module.exports = { ampliarCache };

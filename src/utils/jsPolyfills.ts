/**
 * Polyfills de APIs que o PDF.js v6 usa e que faltam em Safari mais antigo.
 *
 * Sintoma sem isto: importar um PDF falha com "undefined is not a function".
 * Funciona no Chrome/Opera e quebra no Safari — o motor é que difere, não o
 * arquivo. Chromium tem essas APIs há mais tempo.
 *
 * Precisa ser importado NOS DOIS lados: na página e dentro do worker do PDF.js
 * (que roda em escopo global próprio e não enxerga o polyfill da página).
 *
 * Cada bloco é no-op onde a API já existe, então navegador atual não paga nada.
 */

// Promise.withResolvers — Safari 17.4+ / Chrome 119+ / Firefox 121+.
// É a que de fato derruba o PDF.js: 27 usos na thread principal, 13 no worker.
if (typeof (Promise as { withResolvers?: unknown }).withResolvers !== 'function') {
  (Promise as unknown as { withResolvers: () => unknown }).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Object.hasOwn — Safari 15.4+. São 20 usos dentro do worker; se o Safari for
// antigo o bastante para não ter withResolvers, pode não ter esta também.
if (typeof (Object as { hasOwn?: unknown }).hasOwn !== 'function') {
  (Object as unknown as { hasOwn: (o: object, k: PropertyKey) => boolean }).hasOwn = function (
    obj: object,
    key: PropertyKey,
  ) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  };
}

export {};

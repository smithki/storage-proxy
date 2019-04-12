// --- Imports -------------------------------------------------------------- //

import onChange from 'on-change';

// --- Types & constants ---------------------------------------------------- //

// Internal symbol accessors
const namespaceSymbol = Symbol('namespaceSymbol');
const isStorageProxy = Symbol('isStorageProxy');

const namespaceRegex = /^\[(.+)\]:/;

/** Web storage targets: `localStorage` and `sessionStorage`. */
export enum StorageTarget {
  Local = 'localStorage',
  Session = 'sessionStorage',
}

/** The object type created by `StorageProxy.createLocalStorage()` and `StorageProxy.createSessionStorage()`. */
export type StorageProxy<TStorageDefinitions> = Partial<TStorageDefinitions> & {
  [namespaceSymbol]: string | undefined;
  [isStorageProxy]: true;
};

// Cache the proxies created by `onChange`. This prevents duplication of work in
// the `StorageProxy` object and prevents an issue where proxies would compete
// for access to web storage.
const onChangeProxyCache: Map<string, any> = new Map();

// --- Utilities ------------------------------------------------------------ //

/**
 * Get all keys from the indicated web storage.
 *
 * @param storageTarget - `localStorage` or `sessionStorage`.
 */
function getStorageKeys(storageTarget: StorageTarget) {
  const result: string[] = [];
  for (let i = 0; i < window[storageTarget].length; i++) {
    const key = window[storageTarget].key(i);
    result.push(key!);
  }
  return result;
}

/**
 * Create an optionally-namespaced, storage-compatible key.
 *
 * @param namespace - An optional namespace to use.
 * @param key - A key to identify the `localStorage` data.
 */
function getNamespacedKey(namespace: string | undefined, key: string) {
  if (isKeyNamespaced(key)) return key;
  if (!namespace) return key;
  return `[${namespace}]:${key}`;
}

/**
 * Extracts the namespace from a given key
 *
 * @param key - Key to extract a namespace from.
 */
function extractNamespaceFromKey(key: string): string | null {
  const match = namespaceRegex.exec(key);
  if (match) return match[1];
  return null;
}

/**
 * Get the plain key from a namespaced key.
 *
 * @param key - The key to extract from.
 */
function extractKeyFromNamespacedKey(key: string) {
  return key.replace(namespaceRegex, '');
}

/**
 * Checks if the given key is namespaced.\
 *
 * @param key - The key to check.
 */
function isKeyNamespaced(key: string) {
  return !!extractNamespaceFromKey(key);
}

/**
 * Checks if the given key is valid for the given namespace.
 *
 * @param namespace - The namespace to check against.
 * @param key - The key to check.
 */
function validateNamespace(namespace: string | undefined, key: string) {
  if (isKeyNamespaced(key)) {
    if (extractNamespaceFromKey(key) === namespace) return true;
    return false;
  }
  if (!namespace) return true;
  return false;
}

/**
 * Creates a proxy object that observes deeply for mutations and gets/sets web
 * storage accordingly.
 *
 * @param storageTarget - Target `localStorage` or `sessionStorage` with the proxy.
 * @param namespace - An optional namespace to use.
 */
function createProxy<TStorageDefinitions extends any>(
  storageTarget: StorageTarget,
  namespace?: string,
): StorageProxy<TStorageDefinitions> {
  const initialData: StorageProxy<TStorageDefinitions> = {
    [namespaceSymbol]: namespace,
    [isStorageProxy]: true,
  } as any;

  // Return a proxy object
  return new Proxy(initialData, {
    get: (target, prop, receiver) => {
      if (typeof prop === 'string') {
        const namespacedKey = getNamespacedKey(namespace, prop);
        const data = window[storageTarget].getItem(namespacedKey);

        if (data) {
          const parsedData = JSON.parse(data);

          if (typeof parsedData === 'object') {
            // If we've already build a proxy, return the cached object.
            if (onChangeProxyCache.has(namespacedKey)) {
              return onChangeProxyCache.get(namespacedKey);
            }

            // Build a proxy with `onChange` to deeply observe object changes.
            const proxyData = onChange(parsedData, () => {
              window[storageTarget].setItem(
                namespacedKey,
                JSON.stringify(proxyData),
              );
            });

            // Save the proxied data for future reference.
            onChangeProxyCache.set(namespacedKey, proxyData);

            return proxyData;
          }

          return parsedData;
        }

        return null;
      }

      return Reflect.get(target, prop, receiver);
    },

    set: (target, prop, value) => {
      if (typeof prop === 'string') {
        const namespacedKey = getNamespacedKey(namespace, prop);
        if (typeof value === 'undefined') {
          window[storageTarget].removeItem(namespacedKey);
        } else {
          window[storageTarget].setItem(namespacedKey, JSON.stringify(value));
        }

        // Reset the cached proxy for this key, if exists.
        if (onChangeProxyCache.has(namespacedKey)) {
          onChangeProxyCache.delete(namespacedKey);
        }
      }

      return Reflect.set(target, prop, value);
    },

    ownKeys: target => {
      return getStorageKeys(storageTarget)
        .filter(key => validateNamespace(namespace, key))
        .map(key => extractKeyFromNamespacedKey(key));
    },

    getOwnPropertyDescriptor: (target, prop) => {
      if (typeof prop === 'string') {
        const descriptor: PropertyDescriptor = {
          configurable: true,
          enumerable: true,
          get: () => target[prop as any],
          set: (val: any) => (target[prop as any] = val),
        };
        return descriptor;
      }

      return Reflect.getOwnPropertyDescriptor(target, prop);
    },

    deleteProperty: (target, prop) => {
      if (typeof prop === 'string') {
        const namespacedKey = getNamespacedKey(namespace, prop);
        window[storageTarget].removeItem(namespacedKey);

        // Reset the cached proxy for this key, if exists.
        if (onChangeProxyCache.has(namespacedKey)) {
          onChangeProxyCache.delete(namespacedKey);
        }
      }

      return Reflect.deleteProperty(target, prop);
    },
  });
}

// --- Proxy factory -------------------------------------------------------- //

/**
 * Factories to create `localStorage` and `sessionStorage` proxy objects and
 * related utilities.
 */
export const StorageProxy = {
  /**
   * Creates a `localStorage` proxy object that can be used like a plain JS object.
   *
   * @param namespace - An optional namespace to prefix `localStorage` keys with.
   */
  createLocalStorage<TStorageDefinitions extends any>(
    namespace?: string,
  ): StorageProxy<TStorageDefinitions> {
    return createProxy<TStorageDefinitions>(StorageTarget.Local, namespace);
  },

  /**
   * Creates a `sessionStorage` proxy object that can be used like a plain JS object.
   *
   * @param namespace - An optional namespace to prefix `sessionStorage` keys with.
   */
  createSessionStorage<TStorageDefinitions extends any>(
    namespace?: string,
  ): StorageProxy<TStorageDefinitions> {
    return createProxy<TStorageDefinitions>(StorageTarget.Session, namespace);
  },

  /**
   * Checks a cache key in `localStorage` to verify whether the cache integrity
   * is sound. This is useful for cache-busting.
   *
   * @param storageProxy - The storage proxy object to verify.
   * @param seed - A seed to check the cache integrity with.
   */
  verifyCache<TStorageProxy extends StorageProxy<any>>(
    storageProxy: TStorageProxy,
    seed: string,
  ) {
    if (!storageProxy[isStorageProxy]) {
      throw new Error('Provided argument is not a `StorageProxy` object.');
    }
    const namespacedKey = getNamespacedKey(
      storageProxy[namespaceSymbol],
      'storageProxyIntegrity',
    );
    const existingSeed = window.localStorage.getItem(namespacedKey);
    const decodedSeed = existingSeed
      ? atob(JSON.parse(existingSeed))
      : undefined;

    if (decodedSeed) {
      return decodedSeed === seed;
    }

    window.localStorage.setItem(namespacedKey, JSON.stringify(btoa(seed)));
    return true;
  },

  /**
   * Clear the given web storage proxy object from `localStorage` or
   * `sessionStorage`. Only keys under the namespace indicated by the
   * `StorageProxy` object are removed from the web storage caches.
   *
   * @param storageProxy - The storage proxy object to clear.
   */
  clearStorage<TStorageProxy extends StorageProxy<any>>(
    storageProxy: TStorageProxy,
  ) {
    for (const key of Object.keys(storageProxy)) {
      delete storageProxy[key];
    }
  },

  /**
   * Create an namespaced, storage-compatible key.
   *
   * @param namespace - A namespace to use.
   * @param key - A key to identify the `localStorage` data.
   */
  getNamespacedKey(namespace: string, key: string) {
    return getNamespacedKey(namespace, key);
  },
};

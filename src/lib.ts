// --- Imports -------------------------------------------------------------- //

import onChange from 'on-change';

// --- Types & constants ---------------------------------------------------- //

const namespaceSymbol = Symbol('namespaceSymbol');
const isStorageProxy = Symbol('isStorageProxy');
const storageTargetSymbol = Symbol('storageTargetSymbol');
const storageProxyIntegrityKey = '__storageProxyIntegrity';

/** Web storage targets: `localStorage` and `sessionStorage`. */
export enum StorageTarget {
  Local = 'localStorage',
  Session = 'sessionStorage',
}

/** The object type created by `StorageProxy.createLocalStorage()` and `StorageProxy.createSessionStorage()`. */
export type StorageProxy<TStorageDefinitions> = Partial<TStorageDefinitions> & {
  readonly [namespaceSymbol]: string;
  readonly [isStorageProxy]: true;
  readonly [storageTargetSymbol]: StorageTarget;
  [storageProxyIntegrityKey]: string;
};

// --- Utilities ------------------------------------------------------------ //

/**
 * Checks if the passed value is undefined.
 *
 * @param value - The value to check.
 *
 * @return Returns true if value is undefined, else false.
 */
export function isUndefined(value: any): value is undefined {
  return value === undefined;
}

/**
 * Initializes the web storage interface. If no storage exists, we save an empty
 * object.
 *
 * @param namespace - The namespace of the `StorageProxy` object.
 * @param storageTarget - The web storage target (`localStorage` or `sessionStorage`).
 */
function initDataStorage(namespace: string, storageTarget: StorageTarget) {
  const data = window[storageTarget].getItem(namespace);
  if (!data) window[storageTarget].setItem(namespace, JSON.stringify({}));
}

/**
 * Gets and parses data from web storage at the provided namespace.
 *
 * @param namespace - The namespace of the `StorageProxy` object.
 * @param storageTarget - The web storage target (`localStorage` or `sessionStorage`).
 *
 * @return An object of arbitrary data from web storage.
 */
function getDataFromStorage(namespace: string, storageTarget: StorageTarget) {
  const data = window[storageTarget].getItem(namespace);
  return !!data ? JSON.parse(data) : {};
}

/**
 * Creates a proxy object that observes deeply for mutations and syncs the
 * desired web storage accordingly.
 *
 * @param storageTarget - Target `localStorage` or `sessionStorage` with the proxy.
 * @param namespace - An optional namespace to use.
 *
 * @return A `StorageProxy` object.
 */
function createProxy<TStorageDefinitions extends any>(
  storageTarget: StorageTarget,
  namespace: string,
  defaults?: Partial<TStorageDefinitions>,
): StorageProxy<TStorageDefinitions> {
  if (!namespace) throw new Error('[storage-proxy] Namespace cannot be an empty `string`, `undefined`, or `null`.');

  initDataStorage(namespace, storageTarget);

  const data = {
    ...getDataFromStorage(namespace, storageTarget),
    [namespaceSymbol]: namespace,
    [isStorageProxy]: true,
    [storageTargetSymbol]: storageTarget,
  };
  const proxyData = onChange(data, (_path, value, prevValue) => {
    if (value === prevValue) return;
    window[storageTarget].setItem(namespace, JSON.stringify(proxyData));
  });

  const storageProxy = new Proxy(proxyData, {
    get: (_target, prop, _receiver) => {
      if (typeof proxyData[prop as any] === 'undefined') return null;
      return proxyData[prop as any];
    },
  });

  if (defaults) {
    for (const [key, value] of Object.entries(defaults)) {
      if (isUndefined(data[key])) {
        storageProxy[key] = value;
      }
    }
  }

  return storageProxy;
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
   * @param namespace - A namespace to prefix `localStorage` keys with.
   * @param defaults - Optional default values for this `StorageProxy` object.
   *
   * @return a `StorageProxy` object targeting `localStorage`.
   */
  createLocalStorage<TStorageDefinitions extends any>(
    namespace: string,
    defaults?: Partial<TStorageDefinitions>,
  ): StorageProxy<TStorageDefinitions> {
    return createProxy<TStorageDefinitions>(StorageTarget.Local, namespace, defaults);
  },

  /**
   * Creates a `sessionStorage` proxy object that can be used like a plain JS object.
   *
   * @param namespace - A namespace to prefix `sessionStorage` keys with.
   * @param defaults - Optional default values for this `StorageProxy` object.
   *
   * @return a `StorageProxy` object targeting `sessionStorage`.
   */
  createSessionStorage<TStorageDefinitions extends any>(
    namespace: string,
    defaults?: Partial<TStorageDefinitions>,
  ): StorageProxy<TStorageDefinitions> {
    return createProxy<TStorageDefinitions>(StorageTarget.Session, namespace, defaults);
  },

  /**
   * Checks a cache key in the given `StorageProxy` object and verifies whether
   * the cache integrity is sound. This is handy for cache-busting
   * `localStorage` and `sessionStorage`.
   *
   * @param storageProxy - The storage proxy object to verify.
   * @param seed - A seed string to check the cache integrity against.
   *
   * @return `boolean` indicating whether the cache integrity is sound.
   */
  verifyCache<TStorageProxy extends StorageProxy<any>>(storageProxy: TStorageProxy, seed: string) {
    // Argument must be a `StorageProxy` object.
    if (!storageProxy[isStorageProxy]) {
      throw new Error('[storage-proxy] Provided argument is not a `StorageProxy` object.');
    }

    // Get a seed from the raw web storage data and decode it.
    const data = getDataFromStorage(storageProxy[namespaceSymbol], storageProxy[storageTargetSymbol]);
    const existingSeed = data[storageProxyIntegrityKey];
    const decodedSeed = existingSeed ? atob(existingSeed) : undefined;

    // If a seed exists, we will test against that.
    if (decodedSeed) return decodedSeed === seed;

    // Otherwise, we create a new, encoded seed...
    storageProxy[storageProxyIntegrityKey] = btoa(seed);
    return true;
  },

  /**
   * Clear the given web storage proxy object from `localStorage` or
   * `sessionStorage`. Only keys under the namespace indicated by the
   * `StorageProxy` object are removed from the web storage caches.
   *
   * @param storageProxy - The storage proxy object to clear.
   */
  clearStorage<TStorageProxy extends StorageProxy<any>>(storageProxy: TStorageProxy) {
    for (const key of Object.keys(storageProxy)) {
      delete storageProxy[key];
    }
  },
};

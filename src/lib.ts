// --- Imports -------------------------------------------------------------- //

import onChange from 'on-change';

// --- Types & constants ---------------------------------------------------- //

/** Web storage targets: `localStorage` and `sessionStorage`. */
export enum StorageTarget {
  Local = 'localStorage',
  Session = 'sessionStorage',
}

const namespaceSymbol = Symbol('namespaceSymbol');
const isStorageProxy = Symbol('isStorageProxy');
const storageTargetSymbol = Symbol('storageTargetSymbol');
const defaultValuesSymbol = Symbol('defaultValuesSymbol');
const storageProxyIntegrityKey = '__storageProxyIntegrity';

const isStorageAvailableCache: Map<StorageTarget, boolean> = new Map();

/** The object type created by `StorageProxy.createLocalStorage()` and `StorageProxy.createSessionStorage()`. */
export type StorageProxyObject<TStorageDefinitions> = Partial<TStorageDefinitions> & {
  readonly [namespaceSymbol]: string;
  readonly [isStorageProxy]: true;
  readonly [storageTargetSymbol]: StorageTarget;
  readonly [defaultValuesSymbol]: Partial<TStorageDefinitions>;
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
function isUndefined(value: any): value is undefined {
  return value === undefined;
}

/**
 * Asserts that the given argument is a valid `StorageProxy` object, otherwise
 * raising an error.
 *
 * @param value - Any value to test for validity as a `StorageProxyObject`.
 */
function enforceStorageProxy(value?: any) {
  if (!value || !value[isStorageProxy]) {
    throw new TypeError('[storage-proxy] Supplied argument is not a `StorageProxy` object.');
  }
}

/**
 * Initializes the web storage interface. If no storage exists, we save an empty
 * object.
 *
 * @param namespace - The namespace of the `StorageProxyObject`.
 * @param storageTarget - The web storage target (`localStorage` or `sessionStorage`).
 */
function initDataStorage(namespace: string, storageTarget: StorageTarget) {
  if (StorageProxy.isStorageAvailable(storageTarget)) {
    const data = window[storageTarget].getItem(namespace);
    if (!data) window[storageTarget].setItem(namespace, JSON.stringify({}));
  }
}

/**
 * Gets and parses data from web storage at the provided namespace.
 *
 * @param namespace - The namespace of the `StorageProxyObject`.
 * @param storageTarget - The web storage target (`localStorage` or `sessionStorage`).
 *
 * @return An object of arbitrary data from web storage.
 */
function getDataFromStorage(namespace: string, storageTarget: StorageTarget) {
  if (StorageProxy.isStorageAvailable(storageTarget)) {
    const data = window[storageTarget].getItem(namespace);
    return !!data ? JSON.parse(data) : {};
  }

  return {};
}

/**
 * Creates a proxy object that observes deeply for mutations and syncs the
 * desired web storage accordingly.
 *
 * @param storageTarget - Target `localStorage` or `sessionStorage` with the proxy.
 * @param namespace - An optional namespace to use.
 *
 * @return A `StorageProxyObject` type.
 */
function createProxy<TStorageDefinitions extends any>(
  storageTarget: StorageTarget,
  namespace: string,
  defaults?: Partial<TStorageDefinitions>,
): StorageProxyObject<TStorageDefinitions> {
  if (!namespace) throw new Error('[storage-proxy] Namespace cannot be an empty `string`, `undefined`, or `null`.');

  initDataStorage(namespace, storageTarget);

  const data = {
    ...getDataFromStorage(namespace, storageTarget),
    [namespaceSymbol]: namespace,
    [isStorageProxy]: true,
    [storageTargetSymbol]: storageTarget,
  };
  const proxyData = onChange(data, (_path, value, prevValue) => {
    if (value === prevValue || !StorageProxy.isStorageAvailable(storageTarget)) return;
    window[storageTarget].setItem(namespace, JSON.stringify(proxyData));
  });

  const storageProxy = new Proxy(proxyData, {
    get: (_target, prop, _receiver) => {
      if (typeof proxyData[prop as any] === 'undefined') return null;
      return proxyData[prop as any];
    },
  });

  // Sync a `StorageProxyObject` if changes occur to its namespace in another
  // window.
  window.addEventListener('storage', ev => {
    if (StorageProxy.isStorageAvailable(storageTarget)) {
      if (ev.key === namespace && ev.storageArea === window[storageTarget]) {
        const data = getDataFromStorage(namespace, storageTarget);
        for (const [key, value] of Object.entries(data)) storageProxy[key] = value;
      }
    }
  });

  if (defaults) {
    for (const [key, value] of Object.entries(defaults)) {
      if (isUndefined(data[key])) {
        storageProxy[key] = value;
      }
    }

    storageProxy[defaultValuesSymbol] = defaults;
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
   * @param defaults - Optional default values for this `StorageProxyObject`.
   *
   * @return a `StorageProxyObject` targeting `localStorage`.
   */
  createLocalStorage<TStorageDefinitions extends any>(
    namespace: string,
    defaults?: Partial<TStorageDefinitions>,
  ): StorageProxyObject<TStorageDefinitions> {
    return createProxy<TStorageDefinitions>(StorageTarget.Local, namespace, defaults);
  },

  /**
   * Creates a `sessionStorage` proxy object that can be used like a plain JS object.
   *
   * @param namespace - A namespace to prefix `sessionStorage` keys with.
   * @param defaults - Optional default values for this `StorageProxyObject`.
   *
   * @return a `StorageProxyObject` targeting `sessionStorage`.
   */
  createSessionStorage<TStorageDefinitions extends any>(
    namespace: string,
    defaults?: Partial<TStorageDefinitions>,
  ): StorageProxyObject<TStorageDefinitions> {
    return createProxy<TStorageDefinitions>(StorageTarget.Session, namespace, defaults);
  },

  /**
   * Checks a cache key in the given `StorageProxyObject` and verifies whether
   * the cache integrity is sound. This is handy for cache-busting
   * `localStorage` and `sessionStorage`.
   *
   * @param storageProxy - The storage proxy object to verify.
   * @param seed - A seed string to check the cache integrity against.
   *
   * @return `boolean` indicating whether the cache integrity is sound.
   */
  verifyCache<TStorageProxy extends StorageProxyObject<any>>(storageProxy: TStorageProxy, seed: string) {
    enforceStorageProxy(storageProxy);

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
   * `StorageProxyObject` are removed from the web storage caches.
   *
   * @param storageProxy - The storage proxy object to clear.
   */
  clearStorage<TStorageProxy extends StorageProxyObject<any>>(storageProxy: TStorageProxy) {
    enforceStorageProxy(storageProxy);

    for (const key of Object.keys(storageProxy)) {
      delete storageProxy[key];
    }
  },

  /**
   * Restores the default values given to `StorageProxy.createLocalStorage()`
   * and `StorageProxy.createSessionStorage()`. However, unlike when the
   * `StorageProxyObject` was initially created, this function privelages the
   * default values _over_ what is currently in `WebStorage`.
   *
   * @param storageProxy - The storage proxy object to restore to a default state.
   */
  restoreDefaults<TStorageProxy extends StorageProxyObject<any>>(storageProxy: TStorageProxy) {
    enforceStorageProxy(storageProxy);

    for (const [key, value] of Object.entries(storageProxy[defaultValuesSymbol])) {
      (storageProxy as any)[key] = value;
    }
  },

  /**
   * Asserts whether the supplied `WebStorage` type is available.
   *
   * This implementation is based on an example from MDN (Mozilla Developer Network):
   * https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#Feature-detecting_localStorage
   *
   * @param storageTarget - The web storage target (`localStorage` or `sessionStorage`).
   * @returns `boolean` indicating whether the specified storage is available or not.
   */
  isStorageAvailable(storageTarget: StorageTarget = StorageTarget.Local) {
    // Optimization: return the memoized value, if present.
    if (isStorageAvailableCache.has(storageTarget)) return isStorageAvailableCache.get(storageTarget);

    // Disallow non-existant storage targets!
    if (storageTarget !== StorageTarget.Local && storageTarget !== StorageTarget.Session) {
      // tslint:disable-next-line:prettier
      throw new TypeError(`[storage-target] Expected \`WebStorage\` target to be one of: ('${StorageTarget.Local}', '${StorageTarget.Session}')`);
    }

    let storage: any;
    try {
      storage = window[storageTarget];
      const x = '__storage_test__';
      storage.setItem(x, x);
      storage.removeItem(x);

      isStorageAvailableCache.set(storageTarget, true);
      return true;
    } catch (err) {
      const result =
        err &&
        // everything except Firefox
        (err.code === 22 ||
          // Firefox
          err.code === 1014 ||
          // test name field too, because code might not be present
          // everything except Firefox
          err.name === 'QuotaExceededError' ||
          // Firefox
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
        // acknowledge QuotaExceededError only if there's something already stored
        (storage && storage.length !== 0);

      isStorageAvailableCache.set(storageTarget, result);

      return result;
    }
  },
};

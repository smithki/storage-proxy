// --- Imports -------------------------------------------------------------- //

import onChange from 'on-change';

// --- Types ---------------------------------------------------------------- //

export type JsonPrimitive = string | number | boolean | ArrayBuffer | null;

export type JsonArray = (JsonPrimitive | JsonData)[];

export interface JsonData {
  [key: string]: JsonPrimitive | JsonArray | JsonData | undefined;
}

export enum StorageTarget {
  Local = 'localStorage',
  Session = 'sessionStorage',
}

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
 * Create an optionally-namespaced, `localStorage`-compatible key.
 *
 * @param namespace - An optional namespace to use.
 * @param key - A key to identify the `localStorage` data.
 */
function getNamespacedKey(namespace: string | undefined, key: string) {
  if (isKeyNamespaced(key)) return key;
  if (!namespace) return key;
  return `sp[${namespace}]:${key}`;
}

/**
 * Extracts the namespace from a given key
 *
 * @param key - Key to extract a namespace from.
 */
function extractNamespaceFromKey(key: string) {
  const matches = key.match(/sp\[.+\]:/g);
  if (matches) return matches[0];
  return null;
}

function isKeyNamespaced(key: string) {
  return !!extractNamespaceFromKey(key);
}

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
function createProxy<TStorageDefinitions extends JsonData>(
  storageTarget: StorageTarget,
  namespace?: string,
): TStorageDefinitions {
  const initialData: TStorageDefinitions = {} as any;

  // Return a proxy object
  return new Proxy(initialData, {
    get: (target, prop, receiver) => {
      if (typeof prop === 'string') {
        const namespacedKey = getNamespacedKey(namespace, prop);
        const data = window[storageTarget].getItem(namespacedKey);

        if (data) {
          const parsedData = JSON.parse(data);

          if (typeof parsedData === 'object') {
            const proxyData = onChange(parsedData, () => {
              window[storageTarget].setItem(
                namespacedKey,
                JSON.stringify(proxyData),
              );
            });
            return proxyData;
          }

          return parsedData;
        }

        return null;
      }

      return null;
    },

    set: (target, prop, value) => {
      if (typeof prop === 'string') {
        const namespacedKey = getNamespacedKey(namespace, prop);
        if (typeof value === 'undefined') delete target[prop as any];
        else window[storageTarget].setItem(namespacedKey, JSON.stringify(value));
      }

      return Reflect.set(target, prop, value);
    },

    ownKeys: target => {
      return getStorageKeys(storageTarget).filter(
        key => validateNamespace(namespace, key),
      );
    },

    getOwnPropertyDescriptor: (target, prop) => {
      const descriptor: PropertyDescriptor =  {
        configurable: true,
        enumerable: true,
        get: () => target[prop as any],
        set: (val: any) => target[prop as any] = val,
      };
      return descriptor;
    },

    deleteProperty: (target, prop) => {
      if (typeof prop === 'string') {
        const namespacedKey = getNamespacedKey(namespace, prop);
        window[storageTarget].removeItem(namespacedKey);
      }

      return Reflect.deleteProperty(target, prop);
    },
  });
}

// --- Proxy factory -------------------------------------------------------- //

/** Factories to create `localStorage` and `sessionStorage` proxy objects. */
export const StorageProxy = {
  /**
   * Creates a `localStorage` proxy object that can be used like a plain JS object.
   *
   * @param namespace - An optional namespace to prefix `localStorage` keys with.
   */
  createLocalStorage<TStorageDefinitions extends JsonData = any>(
    namespace?: string,
  ): Partial<TStorageDefinitions> {
    return createProxy<TStorageDefinitions>(StorageTarget.Local, namespace);
  },

  /**
   * Creates a `sessionStorage` proxy object that can be used like a plain JS object.
   *
   * @param namespace - An optional namespace to prefix `sessionStorage` keys with.
   */
  createSessionStorage<TStorageDefinitions extends JsonData = any>(
    namespace?: string,
  ): Partial<TStorageDefinitions> {
    return createProxy<TStorageDefinitions>(StorageTarget.Session, namespace);
  },
};

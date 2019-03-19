// --- Imports -------------------------------------------------------------- //

import onChange from 'on-change';

// --- Types ---------------------------------------------------------------- //

export type JsonPrimitive = string | number | boolean | ArrayBuffer | null;

export type JsonArray = JsonPrimitive[];

export interface JsonData {
  [key: string]: JsonPrimitive | JsonArray | JsonData;
}

// --- Utilities ------------------------------------------------------------ //

/**
 * Create an optionally-namespaced, `localStorage`-compatible key.
 *
 * @param namespace - An optional namespace to use.
 * @param key - A key to identify the `localStorage` data.
 */
function getNamespacedKey(namespace: string | undefined, key: string) {
  if (!namespace) return key;
  return `${namespace}:${key}`;
}

/**
 * Creates a proxy object that observes deeply for mutations and gets/sets web
 * storage accordingly.
 *
 * @param storageTarget - Target `localStorage` or `sessionStorage` with the proxy.
 * @param namespace - An optional namespace to use.
 */
function createProxy<TStorageDefinitions extends JsonData>(
  storageTarget: 'localStorage' | 'sessionStorage',
  namespace?: string,
): TStorageDefinitions {
  const initialData: TStorageDefinitions = {} as any;

  // Return a proxy object
  return new Proxy(initialData, {
    get: (target, prop: string, receiver) => {
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
    },

    set: (target, prop: string, value) => {
      const namespacedKey = getNamespacedKey(namespace, prop);
      window[storageTarget].setItem(namespacedKey, JSON.stringify(value));

      return Reflect.set(target, prop, value);
    },
  });
}

// --- Proxy factory -------------------------------------------------------- //

/** A factory to create `localStorage` and `sessionStorage` proxy objects. */
export class StorageProxy {
  /**
   * Creates a `localStorage` proxy object that can be used like a plain JS object.
   *
   * @param namespace - An optional namespace to prefix `localStorage` keys with.
   */
  public static createLocalStorage<TStorageDefinitions extends JsonData>(
    namespace?: string,
  ): TStorageDefinitions {
    return createProxy('localStorage', namespace);
  }

  /**
   * Creates a `sessionStorage` proxy object that can be used like a plain JS object.
   *
   * @param namespace - An optional namespace to prefix `sessionStorage` keys with.
   */
  public static createSessionStorage<TStorageDefinitions extends JsonData>(
    namespace?: string,
  ): TStorageDefinitions {
    return createProxy<TStorageDefinitions>('sessionStorage', namespace);
  }
}

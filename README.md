# ⚡️ `StorageProxy`

[![code style: airbnb](https://img.shields.io/badge/code%20style-airbnb-blue.svg?style=flat)](https://github.com/airbnb/javascript)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat)](https://github.com/prettier/prettier)

> Use web storage (`localStorage`/`sessionStorage`) just like plain objects using ES6 Proxies.

## 💁🏼‍♂️ Introduction

Interact with [`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) or [`sessionStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) like a plain JavaScript object. You can even iterate over `keys` and `entries` as with plain objects.

## 🔗 Installation

Install via `yarn` (recommended):

```sh
yarn add storage-proxy
```

Install via `npm`:

```sh
npm install storage-proxy
```

## 🛠️ Usage

```ts
import { StorageProxy } from 'storage-proxy';

const myLocalStorage = StorageProxy.createLocalStorage('my-namespace');
const mySessionStorage = StorageProxy.createSessionStorage('my-namespace');

// Here's a (non-exhaustive) list of some possibilities:

myLocalStorage.hello = 'world';
myLocalStorage.foo = [1, 2, 3];
myLocalStorage.foo.push(4);
myLocalStorage.bar = { baz: 'This works!' };
myLocalStorage.bar.spam = 'This works too!';
const copied = { ...myLocalStorage };
```

Additionally, you can pass default values. This is handy if your stored data contains deep objects that need to be accessible even when the contained data is `undefined`:

```ts
const myLocalStorage = StorageProxy.createLocalStorage('my-namespace', {
  one: {
    two: 'three',
    four: {},
  },
});

console.log(myLocalStorage.one.two)    // => "three"
myLocalStorage.one.four.five = 'six';  // Works!
```

In TypeScript, you can define the shape of your stored data by passing a [generic type parameter](https://www.typescriptlang.org/docs/handbook/generics.html) to the factory function:

```ts
const myStorage = StorageProxy.createLocalStorage<{
  hello: string;
  foo: number[];
  bar: { baz: string, spam?: string };
}>('my-namespace');

myStorage.foo      // Works!
myStorage.bar.baz  // Works!
myStorage.yolo     // Compiler error!
```

## Utilities

For convenience, `StorageProxy` also provides several lightweight utilities for interacting with web storage.

#### `StorageProxy.verifyCache(storageProxy: StorageProxyObject, seed: string)`

Checks a cache key in the given `StorageProxyObject` and verifies whether the cache integrity is sound. This is handy for cache-busting `localStorage` and `sessionStorage`.

#### `StorageProxy.clearStorage(storageProxy: StorageProxyObject)`

Clear the given web storage proxy object from `localStorage` or `sessionStorage`. Only keys under the namespace indicated by the `StorageProxyObject` are removed from the web storage caches.

#### `StorageProxy.restoreDefaults(storageProxy: StorageProxyObject)`

Restores the default values given to `StorageProxy.createLocalStorage()` and `StorageProxy.createSessionStorage()`. However, unlike when the `StorageProxyObject` was initially created, this function privelages the default values _over_ what is currently in `WebStorage`.

#### `StorageProxy.isStorageAvailable(storageTarget?: StorageTarget)`

Asserts whether the supplied `WebStorage` type is available. The `storageTarget` parameter defaults to `localStorage`. `StorageProxy` uses this utility internally to prevent raising errors in incompatible browser environments. This means you are protected from `WebStorage` permissions issues, but also counts as an important **gotcha!** It's crucial that your application works **with or without `WebStorage`**, so please try to _gracefully degrade functionality_ in such occurrences. This utility is exposed for that very purpose. Use it to your advantage!

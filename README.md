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

console.log(myLocalStorage.one.two.three)        // => "three"
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

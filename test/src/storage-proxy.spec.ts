// --- Imports -------------------------------------------------------------- //

import './mocks/browser';

import { Expect, SetupFixture, Test, TestFixture } from 'alsatian';
import { StorageProxy, StorageTarget } from '../../src/lib';

// -------------------------------------------------------------------------- //

const testNamespace = 'qwerty';
const testStr = 'hello world';
const testObj = { monty: 'python', numbers: [1, 2, 3] };

interface TestStorage {
  bar: string;
  baz: typeof testObj;
  fizz: number;
  defaults: {
    example: string;
  };
}

function getItem(storageTarget: StorageTarget, path: string) {
  const data = window[storageTarget].getItem(testNamespace);

  if (data) {
    const parsedData = JSON.parse(data);
    const parts = path.split('.');
    let result = parsedData;

    parts.forEach(p => {
      result = result[p];
    });

    return result;
  }

  return {};
}

@TestFixture('StorageProxy Tests')
export class StorageProxyTestFixture {
  lStore: Partial<TestStorage>;
  sStore: Partial<TestStorage>;

  @SetupFixture
  public setupFixture() {
    localStorage.setItem(testNamespace, JSON.stringify({ bar: testStr, test: 999, baz: testObj }));
    sessionStorage.setItem(testNamespace, JSON.stringify({ bar: testStr, test: 999, baz: testObj }));

    this.lStore = StorageProxy.createLocalStorage<TestStorage>(testNamespace, {
      defaults: { example: testStr },
    });
    this.sStore = StorageProxy.createSessionStorage<TestStorage>(testNamespace);
  }

  @Test('Sets default items in storage')
  public defaultsMergeTest() {
    Expect(getItem(StorageTarget.Local, 'defaults.example')).toEqual(testStr);
  }

  @Test('Defaults are available on the `StorageProxy` object')
  public defaultsAreGettableTest() {
    Expect(this.lStore.defaults!.example).toEqual(testStr);
  }

  @Test('Set a `localStorage` key')
  public setLocalStorageKeyTest() {
    this.lStore.fizz = 123;

    Expect(getItem(StorageTarget.Local, 'fizz')).toEqual(123);
  }

  @Test('Set a `sessionStorage` key')
  public setSessionStorageKeyTest() {
    this.sStore.fizz = 123;

    Expect(getItem(StorageTarget.Session, 'fizz')).toEqual(123);
  }

  @Test('Get `localStorage` key')
  public getLocalStorageKeyTest() {
    const data = this.lStore.bar;
    Expect(data).toEqual(testStr);
  }

  @Test('Get `sessionStorage` key')
  public getSessionStorageKeyTest() {
    const data = this.sStore.bar;
    Expect(data).toEqual(testStr);
  }
}

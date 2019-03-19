// --- Imports -------------------------------------------------------------- //

import './mocks/browser';

import { Expect, SetupFixture, Test, TestFixture, FocusTest } from 'alsatian';
import { StorageProxy } from '../../src/lib';

// -------------------------------------------------------------------------- //

const testKey1 = '[foo]:bar';
const testKey2 = 'baz';
const testStr = 'hello world';
const testObj = { monty: 'python', numbers: [1, 2, 3] };

interface TestStorageNs {
  bar: string;
  test: number;
}

interface TestStorage {
  baz: typeof testObj;
  test: string;
}

@TestFixture('StorageProxy Tests')
export class StorageProxyTestFixture {
  lStore: Partial<TestStorage>;
  lStoreNs: Partial<TestStorageNs>;
  sStore: Partial<TestStorage>;
  sStoreNs: Partial<TestStorageNs>;

  @SetupFixture
  public setupFixture() {
    localStorage.setItem(testKey1, JSON.stringify(testStr));
    localStorage.setItem(testKey2, JSON.stringify(testObj));
    sessionStorage.setItem(testKey1, JSON.stringify(testStr));
    sessionStorage.setItem(testKey2, JSON.stringify(testObj));

    this.lStore = StorageProxy.createLocalStorage<TestStorage>();
    this.lStoreNs = StorageProxy.createLocalStorage<TestStorageNs>('foo');

    this.sStore = StorageProxy.createSessionStorage<TestStorage>();
    this.sStoreNs = StorageProxy.createSessionStorage<TestStorageNs>('foo');
  }

  @Test('Set a namespaced `localStorage` key')
  public setNamespacedLocalStorageKeyTest() {
    this.lStoreNs.test = 123;

    Expect(JSON.parse(localStorage.getItem('[foo]:test')!)).toEqual(123);
  }

  @Test('Set a namespaced `sessionStorage` key')
  public setNamespacedSessionStorageKeyTest() {
    this.sStoreNs.test = 123;

    Expect(JSON.parse(sessionStorage.getItem('[foo]:test')!)).toEqual(123);
  }

  @Test('Get namespaced `localStorage` key')
  public getNamespacedLocalStorageKeyTest() {
    const data = this.lStoreNs.bar;
    Expect(data).toEqual(testStr);
  }

  @Test('Get namespaced `sessionStorage` key')
  public getNamespacedSessionStorageKeyTest() {
    const data = this.sStoreNs.bar;
    Expect(data).toEqual(testStr);
  }

  @Test('Set a non-namespaced `localStorage` key')
  public setLocalStorageKeyTest() {
    this.lStore.test = 'qwerty';

    Expect(JSON.parse(localStorage.getItem('test')!)).toEqual('qwerty');
  }

  @Test('Set a non-namespaced `sessionStorage` key')
  public setSessionStorageKeyTest() {
    this.sStore.test = 'qwerty';

    Expect(JSON.parse(sessionStorage.getItem('test')!)).toEqual('qwerty');
  }

  @Test('Get a non-namespaced `localStorage` key')
  public getLocalStorageKeyTest() {
    const data: typeof testObj = this.lStore.baz as any;
    Expect(data.monty).toEqual(testObj.monty);
    Expect(data.numbers).toEqual(testObj.numbers);
  }

  @Test('Get a non-namespaced `sessionStorage` key')
  public getSessionStorageKeyTest() {
    const data: typeof testObj = this.sStore.baz as any;
    Expect(data.monty).toEqual(testObj.monty);
    Expect(data.numbers).toEqual(testObj.numbers);
  }
}

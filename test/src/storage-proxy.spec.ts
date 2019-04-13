// --- Imports -------------------------------------------------------------- //

import './mocks/browser';

import { Expect, SetupFixture, Test, TestFixture } from 'alsatian';
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

@TestFixture('StorageProxy Tests')
export class StorageProxyTestFixture {
  lStore: Partial<TestStorageNs>;
  sStore: Partial<TestStorageNs>;

  @SetupFixture
  public setupFixture() {
    localStorage.setItem(testKey1, JSON.stringify(testStr));
    localStorage.setItem(testKey2, JSON.stringify(testObj));
    sessionStorage.setItem(testKey1, JSON.stringify(testStr));
    sessionStorage.setItem(testKey2, JSON.stringify(testObj));

    this.lStore = StorageProxy.createLocalStorage<TestStorageNs>('foo');
    this.sStore = StorageProxy.createSessionStorage<TestStorageNs>('foo');
  }

  @Test('Set a namespaced `localStorage` key')
  public setNamespacedLocalStorageKeyTest() {
    this.lStore.test = 123;

    Expect(JSON.parse(localStorage.getItem('[foo]:test')!)).toEqual(123);
  }

  @Test('Set a namespaced `sessionStorage` key')
  public setNamespacedSessionStorageKeyTest() {
    this.sStore.test = 123;

    Expect(JSON.parse(sessionStorage.getItem('[foo]:test')!)).toEqual(123);
  }

  @Test('Get namespaced `localStorage` key')
  public getNamespacedLocalStorageKeyTest() {
    const data = this.lStore.bar;
    Expect(data).toEqual(testStr);
  }

  @Test('Get namespaced `sessionStorage` key')
  public getNamespacedSessionStorageKeyTest() {
    const data = this.sStore.bar;
    Expect(data).toEqual(testStr);
  }
}

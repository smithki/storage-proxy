// --- Imports -------------------------------------------------------------- //

import './mocks/browser';

import { Expect, SetupFixture, Test, TestFixture } from 'alsatian';
import { StorageProxy, StorageProxyObject, StorageTarget } from '../../src/lib';

// -------------------------------------------------------------------------- //

const testNamespace = 'qwerty';
const testStr = 'hello world';
const testObj = { monty: 'python', numbers: [1, 2, 3] };
const testArr = [1, 2, 3];

const storageProxyIntegrityKey = '__storageProxyIntegrity';

interface TestStorage {
  bar: string;
  baz: typeof testObj;
  fizz: number;
  defaults: {
    example: string;
  };
  alreadySetDefault: number;
  arrayValue: number[];
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
  lStore: StorageProxyObject<TestStorage>;
  sStore: StorageProxyObject<TestStorage>;

  @SetupFixture
  public setupFixture() {
    localStorage.setItem(
      testNamespace,
      JSON.stringify({ bar: testStr, test: 999, baz: testObj, alreadySetDefault: 999, arrayValue: testArr }),
    );
    sessionStorage.setItem(
      testNamespace,
      JSON.stringify({ bar: testStr, test: 999, baz: testObj, arrayValue: testArr }),
    );

    this.lStore = StorageProxy.createLocalStorage<TestStorage>(testNamespace, {
      defaults: { example: testStr },
      alreadySetDefault: 123,
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

  @Test('Default key that is already set in storage is not overwritten')
  public defaultsNotAllPowerfulTest() {
    Expect(this.lStore.alreadySetDefault).toEqual(999);
  }

  @Test('Restoring defaults privelages default values over `WebStorage` values.')
  public restoreDefaultsTest() {
    StorageProxy.restoreDefaults(this.lStore);
    Expect(this.lStore.alreadySetDefault).toEqual(123);
  }

  @Test('Set `localStorage` key')
  public setLocalStorageKeyTest() {
    this.lStore.fizz = 123;

    Expect(getItem(StorageTarget.Local, 'fizz')).toEqual(123);
  }

  @Test('Set `sessionStorage` key')
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

  @Test('Verify caching helper works')
  public verifyCacheTest() {
    Expect(getItem(StorageTarget.Local, storageProxyIntegrityKey)).not.toBeDefined();

    const shouldBeTrue = StorageProxy.verifyCache(this.lStore, 'very seedy');
    Expect(getItem(StorageTarget.Local, storageProxyIntegrityKey)).toBeDefined();
    Expect(shouldBeTrue).toBeTruthy();

    const shouldAlsoBeTrue = StorageProxy.verifyCache(this.lStore, 'very seedy');
    Expect(shouldAlsoBeTrue).toBeTruthy();

    const shouldBeFalse = StorageProxy.verifyCache(this.lStore, 'even seedier');
    Expect(shouldBeFalse).not.toBeTruthy();
  }

  @Test('Validate `Array.prototype.push`')
  public arrayPushTest() {
    this.lStore.baz!.numbers.push(4, 5, 6);
    this.lStore.arrayValue!.push(4, 5, 6);
    const dataOne = this.lStore.baz!.numbers;
    const dataTwo = this.lStore.arrayValue;

    const expected = [1, 2, 3, 4, 5, 6];
    Expect(dataOne).toEqual(expected);
    Expect(dataTwo).toEqual(expected);
    Expect(getItem(StorageTarget.Local, 'baz.numbers')).toEqual(expected);
    Expect(getItem(StorageTarget.Local, 'arrayValue')).toEqual(expected);
  }

  @Test('Validate `Array.prototype.pop`')
  public arrayPopTest() {
    this.lStore.baz!.numbers.pop();
    this.lStore.arrayValue!.pop();
    const dataOne = this.lStore.baz!.numbers;
    const dataTwo = this.lStore.arrayValue;

    const expected = [1, 2, 3, 4, 5];
    Expect(dataOne).toEqual(expected);
    Expect(dataTwo).toEqual(expected);
    Expect(getItem(StorageTarget.Local, 'baz.numbers')).toEqual(expected);
    Expect(getItem(StorageTarget.Local, 'arrayValue')).toEqual(expected);
  }

  @Test('Validate `Array.prototype.unshift`')
  public arrayUnshiftTest() {
    this.lStore.baz!.numbers.unshift(999);
    this.lStore.arrayValue!.unshift(999);
    const dataOne = this.lStore.baz!.numbers;
    const dataTwo = this.lStore.arrayValue;

    const expected = [999, 1, 2, 3, 4, 5];
    Expect(dataOne).toEqual(expected);
    Expect(dataTwo).toEqual(expected);
    Expect(getItem(StorageTarget.Local, 'baz.numbers')).toEqual(expected);
    Expect(getItem(StorageTarget.Local, 'arrayValue')).toEqual(expected);
  }

  @Test('Validate `Array.prototype.shift`')
  public arrayShiftTest() {
    this.lStore.baz!.numbers.shift();
    this.lStore.arrayValue!.shift();
    const dataOne = this.lStore.baz!.numbers;
    const dataTwo = this.lStore.arrayValue;

    const expected = [1, 2, 3, 4, 5];
    Expect(dataOne).toEqual(expected);
    Expect(dataTwo).toEqual(expected);
    Expect(getItem(StorageTarget.Local, 'baz.numbers')).toEqual(expected);
    Expect(getItem(StorageTarget.Local, 'arrayValue')).toEqual(expected);
  }

  @Test('Validate `Array.prototype.splice`')
  public arraySpliceTest() {
    this.lStore.baz!.numbers.splice(1, 2, ...[999, 998]);
    this.lStore.arrayValue!.splice(1, 2, ...[999, 998]);
    const dataOne = this.lStore.baz!.numbers;
    const dataTwo = this.lStore.arrayValue;

    const expected = [1, 999, 998, 4, 5];
    Expect(dataOne).toEqual(expected);
    Expect(dataTwo).toEqual(expected);
    Expect(getItem(StorageTarget.Local, 'baz.numbers')).toEqual(expected);
    Expect(getItem(StorageTarget.Local, 'arrayValue')).toEqual(expected);
  }

  @Test('Clearing `StorageProxy` removes all keys from both `WebStorage` and the local object')
  public clearStorageTest() {
    localStorage.clear();
    StorageProxy.clearStorage(this.lStore);

    Expect(this.lStore.alreadySetDefault).toBeNull();
    Expect(this.lStore.arrayValue).toBeNull();
    Expect(this.lStore.bar).toBeNull();
    Expect(this.lStore.baz).toBeNull();
    Expect(this.lStore.defaults).toBeNull();
    Expect(this.lStore.fizz).toBeNull();

    Expect(getItem(StorageTarget.Local, 'alreadySetDefault')).not.toBeDefined();
    Expect(getItem(StorageTarget.Local, 'arrayValue')).not.toBeDefined();
    Expect(getItem(StorageTarget.Local, 'bar')).not.toBeDefined();
    Expect(getItem(StorageTarget.Local, 'baz')).not.toBeDefined();
    Expect(getItem(StorageTarget.Local, 'defaults')).not.toBeDefined();
    Expect(getItem(StorageTarget.Local, 'fizz')).not.toBeDefined();
  }
}

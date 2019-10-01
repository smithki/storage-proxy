import atob from 'atob';
import btoa from 'btoa';
import { mocks } from 'mock-browser';

// -------------------------------------------------------------------------- //
// In this file we are mocking browser globals.

const mb = new mocks.MockBrowser();

(global as any).document = mb.getDocument();
(global as any).window = mb.getWindow();
(global as any).btoa = btoa;
(global as any).window.btoa = btoa;
(global as any).atob = atob;
(global as any).window.atob = atob;
(global as any).location = mb.getLocation();
(global as any).navigator = mb.getNavigator();
(global as any).history = mb.getHistory();
(global as any).localStorage = mb.getLocalStorage();
(global as any).sessionStorage = mb.getSessionStorage();

import assert from 'node:assert/strict';
import test from 'node:test';
import { directionsUrl, isApple } from '../src/directions.js';

const dest = { lat: 44.2022, lng: 12.3375, name: 'Mario Rossi', uid: 'abc' };
const iphone = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 };
const ipad = { userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', platform: 'iPad', maxTouchPoints: 5 };
const ipadAsMac = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 5 };
const mac = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 0 };
const android = { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7)', platform: 'Linux armv81', maxTouchPoints: 5 };
const desktop = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', platform: 'Win32', maxTouchPoints: 0 };

test('iPhone, iPad e iPadOS (Mac con il touch): Apple Maps a piedi', () => {
  for (const nav of [iphone, ipad, ipadAsMac]) {
    assert.equal(directionsUrl(dest, nav), 'https://maps.apple.com/?daddr=44.2022,12.3375&dirflg=w');
  }
});

test('Android, Mac senza touch, desktop e il resto: Google Maps a piedi', () => {
  for (const nav of [android, mac, desktop, {}]) {
    assert.equal(directionsUrl(dest, nav), 'https://www.google.com/maps/dir/?api=1&destination=44.2022,12.3375&travelmode=walking');
  }
});

test('il link contiene solo coordinate e modo: mai nome o uid', () => {
  assert.doesNotMatch(directionsUrl(dest, android), /Rossi|abc/);
  assert.equal(isApple(iphone), true);
  assert.equal(isApple(mac), false);
});

test('coordinate non valide: nessun link', () => {
  for (const bad of [{}, { lat: NaN, lng: 12.3 }, { lat: 44.2, lng: Infinity }, { lat: '44.2', lng: 12.3 }, { lat: null, lng: null }]) {
    assert.equal(directionsUrl(bad, android), null);
    assert.equal(directionsUrl(bad, iphone), null);
  }
});

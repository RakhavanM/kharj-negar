import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

if (!window.matchMedia) {
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
}

if (!window.structuredClone) {
  window.structuredClone = (value) => JSON.parse(JSON.stringify(value));
}

if (!window.crypto?.randomUUID) {
  window.crypto = { ...window.crypto, randomUUID: () => `${Date.now()}-${Math.random()}` };
}

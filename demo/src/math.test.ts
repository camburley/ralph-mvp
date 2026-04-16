import { add } from './math';
import { test, expect } from 'vitest';

test('add(2,2) === 4', () => {
  expect(add(2, 2)).toBe(4);
});

test('add(10,5) === 15', () => {
  expect(add(10, 5)).toBe(15);
});

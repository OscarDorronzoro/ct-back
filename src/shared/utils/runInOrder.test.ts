import { describe, it, expect } from 'vitest';

import runInOrder from './runInOrder';

describe('runInOrder', () => {
  it('runs each step after the previous one finished', async () => {
    const log: string[] = [];
    const wait = (ms: number) => new Promise((resolve) => { setTimeout(resolve, ms); });

    await runInOrder([30, 10, 20], async (ms: number) => {
      log.push(`start ${ms}`);
      await wait(ms);
      log.push(`end ${ms}`);
    });

    expect(log).toEqual(['start 30', 'end 30', 'start 10', 'end 10', 'start 20', 'end 20']);
  });

  it('returns the results in order', async () => {
    expect(await runInOrder([1, 2, 3], async (n: number) => n * 10)).toEqual([10, 20, 30]);
  });
});

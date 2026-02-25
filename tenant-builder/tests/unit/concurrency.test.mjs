import { describe, it, expect } from 'vitest';
import { pool } from '../../lib/concurrency.mjs';

describe('concurrency pool', () => {
  it('should return results in input order', async () => {
    const tasks = [
      async () => 'first',
      async () => 'second',
      async () => 'third',
    ];

    const results = await pool(tasks, 2);
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ status: 'fulfilled', value: 'first' });
    expect(results[1]).toEqual({ status: 'fulfilled', value: 'second' });
    expect(results[2]).toEqual({ status: 'fulfilled', value: 'third' });
  });

  it('should enforce concurrency limit', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const makeTask = (delay) => async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise(r => setTimeout(r, delay));
      concurrent--;
      return delay;
    };

    await pool([makeTask(50), makeTask(50), makeTask(50), makeTask(50)], 2);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('should handle mixed success and failure', async () => {
    const tasks = [
      async () => 'ok',
      async () => { throw new Error('fail'); },
      async () => 'ok2',
    ];

    const results = await pool(tasks, 2);
    expect(results[0]).toEqual({ status: 'fulfilled', value: 'ok' });
    expect(results[1].status).toBe('rejected');
    expect(results[1].reason.message).toBe('fail');
    expect(results[2]).toEqual({ status: 'fulfilled', value: 'ok2' });
  });

  it('should handle empty task list', async () => {
    const results = await pool([], 4);
    expect(results).toEqual([]);
  });

  it('should handle limit greater than task count', async () => {
    const tasks = [async () => 1, async () => 2];
    const results = await pool(tasks, 10);
    expect(results.length).toBe(2);
    expect(results[0].value).toBe(1);
    expect(results[1].value).toBe(2);
  });

  it('should default to limit of 4', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const makeTask = () => async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise(r => setTimeout(r, 30));
      concurrent--;
    };

    await pool(Array.from({ length: 8 }, makeTask));
    expect(maxConcurrent).toBeLessThanOrEqual(4);
  });

  it('should continue processing after failures', async () => {
    const order = [];
    const tasks = [
      async () => { order.push(1); return 1; },
      async () => { order.push(2); throw new Error('boom'); },
      async () => { order.push(3); return 3; },
      async () => { order.push(4); return 4; },
    ];

    const results = await pool(tasks, 1); // sequential
    expect(order).toEqual([1, 2, 3, 4]);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
    expect(results[2].status).toBe('fulfilled');
    expect(results[3].status).toBe('fulfilled');
  });
});

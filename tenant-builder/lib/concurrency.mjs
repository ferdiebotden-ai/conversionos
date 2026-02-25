/**
 * Promise pool with configurable concurrency limit.
 * Returns settled results (like Promise.allSettled) in input order.
 */

/**
 * Run async tasks with a concurrency limit.
 *
 * @template T
 * @param {Array<() => Promise<T>>} tasks - array of async task functions
 * @param {number} [limit=4] - max concurrent tasks
 * @returns {Promise<Array<{ status: 'fulfilled', value: T } | { status: 'rejected', reason: any }>>}
 */
export async function pool(tasks, limit = 4) {
  const results = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      try {
        const value = await tasks[index]();
        results[index] = { status: 'fulfilled', value };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);

  return results;
}

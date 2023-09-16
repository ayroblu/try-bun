/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-function */

export function setupCache<T>() {
  const cacheWaiting = new Map<
    string,
    { resolve: (value: T) => void; reject: (reason?: any) => void }[]
  >();
  const cache = new Map<string, { current: T }>();

  async function withCache(
    key: string,
    func: (key: string) => Promise<T>,
  ): Promise<T> {
    const cacheManager = getCacheManager(key);
    const result = cacheManager.initialCheck();
    if (result instanceof Promise) return result;
    if (result) return result.current;
    try {
      const result = await func(key);
      cacheManager.onSuccess(result);
      return result;
    } catch (err) {
      cacheManager.onFailure(err);
      throw err;
    }
  }

  function getCacheManager(key: string) {
    function initialCheck(): { current: T } | Promise<T> | void {
      const cachedValue = cache.get(key);
      if (cachedValue) {
        return cachedValue;
      }
      const waiting = cacheWaiting.get(key);
      if (waiting) {
        const { promise, reject, resolve } = deferredPromise<T>();
        waiting.push({ resolve, reject });
        return promise;
      }
      cacheWaiting.set(key, []);
    }
    function onSuccess(result: T) {
      cache.set(key, { current: result });
      const handlers = cacheWaiting.get(key);
      if (handlers) {
        handlers.forEach(({ resolve }) => resolve(result));
        cacheWaiting.delete(key);
      }
    }
    function onFailure(err: unknown) {
      const handlers = cacheWaiting.get(key);
      if (handlers) {
        handlers.forEach(({ reject }) => reject(err));
        cacheWaiting.delete(key);
      }
    }
    return {
      initialCheck,
      onSuccess,
      onFailure,
    };
  }
  return {
    withCache,
    cache,
  };
}
const deferredPromise = <T>() => {
  let resolve: (value: T) => void = () => {};
  let reject: (reason?: any) => void = () => {};
  const promise = new Promise<T>((resolveInner, rejectInner) => {
    resolve = resolveInner;
    reject = rejectInner;
  });
  return {
    promise,
    resolve,
    reject,
  };
};

async function getFetchResponseSimple(path: string) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Fetch failed for path: ${path}`);
  }
  return response;
}
export async function fetchSimpleJson(path: string) {
  const response = await getFetchResponseSimple(path);
  return response.json();
}
export async function fetchSimpleText(path: string) {
  const response = await getFetchResponseSimple(path);
  return response.text();
}

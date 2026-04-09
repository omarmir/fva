type PromiseWithResolversResult<T> = {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

declare global {
  interface Map<K, V> {
    getOrInsert(key: K, value: V): V
    getOrInsertComputed(key: K, callbackfn: (key: K) => V): V
  }

  interface PromiseConstructor {
    withResolvers<T>(): PromiseWithResolversResult<T>
  }
}

function defineCompatProperty(target: object, key: PropertyKey, value: unknown) {
  if (key in target) return

  Object.defineProperty(target, key, {
    value,
    configurable: true,
    writable: true,
  })
}

defineCompatProperty(Map.prototype, 'getOrInsert', function getOrInsert<K, V>(this: Map<K, V>, key: K, value: V) {
  if (this.has(key)) return this.get(key) as V

  this.set(key, value)
  return value
})

defineCompatProperty(
  Map.prototype,
  'getOrInsertComputed',
  function getOrInsertComputed<K, V>(this: Map<K, V>, key: K, callbackfn: (key: K) => V) {
    if (this.has(key)) return this.get(key) as V

    const value = callbackfn(key)
    this.set(key, value)
    return value
  },
)

defineCompatProperty(Promise, 'withResolvers', function withResolvers<T>(): PromiseWithResolversResult<T> {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return { promise, resolve, reject }
})

export {}

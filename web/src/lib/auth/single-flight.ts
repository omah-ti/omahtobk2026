const inFlightByKey = new Map<string, Promise<unknown>>()

export async function singleFlightByKey<T>(
  key: string,
  producer: () => Promise<T>
): Promise<T> {
  const existing = inFlightByKey.get(key)
  if (existing) {
    return existing as Promise<T>
  }

  const promise = producer().finally(() => {
    inFlightByKey.delete(key)
  })

  inFlightByKey.set(key, promise)
  return promise
}

export async function safeJson<T>(response: Response, fallback: T): Promise<T> {
  if (!response) return fallback;
  try {
    const text = await response.text();
    if (!text) return fallback;
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

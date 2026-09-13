export class ConvexError<T = { code?: string; message: string }> extends Error {
  data: T;
  constructor(data: T) {
    const message = typeof data === 'object' && data && 'message' in data ? String((data as any).message) : String(data);
    super(message);
    this.name = 'ConvexError';
    this.data = data;
  }
}

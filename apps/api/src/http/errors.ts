/** Error with an HTTP status and a stable machine-readable code, rendered as `{ error: code, message }`. */
export class HttpError extends Error {
  constructor(public statusCode: number, public code: string, message?: string) {
    super(message ?? code);
  }
}

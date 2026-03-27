export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string,
    public errors?: unknown[]
  ) {
    super(message)
    this.name = 'AppError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

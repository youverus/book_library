export class AppError extends Error {
  constructor(public code: number, message: string, public status = 200) {
    super(message);
  }
}

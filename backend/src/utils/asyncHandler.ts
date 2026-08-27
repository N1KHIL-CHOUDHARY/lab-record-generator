import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncFn = (req: any, res: Response, next: NextFunction) => Promise<any>;

export const asyncHandler = (fn: AsyncFn): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

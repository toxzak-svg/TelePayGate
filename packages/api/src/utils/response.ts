import { Response } from 'express';

export function respondSuccess(res: Response, payload: any = {}, status: number = 200) {
  return res.status(status).json(Object.assign({ success: true }, payload));
}

export function respondError(res: Response, code: string, message: string, status: number = 400, extras: any = {}) {
  return res.status(status).json({ success: false, error: Object.assign({ code, message }, extras) });
}

export default { respondSuccess, respondError };

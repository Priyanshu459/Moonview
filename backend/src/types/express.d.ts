import { AuthUserResponse } from '@moonview/shared';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserResponse;
    }
  }
}

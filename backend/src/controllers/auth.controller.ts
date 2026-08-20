import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { InvalidCredentialsError } from '../utils/errors.js';
import { config } from '../config/index.js';
import { CookieOptions } from 'express';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.COOKIE_SECURE,
  sameSite: config.COOKIE_SAME_SITE,
  path: '/',
  signed: true,
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    let result;
    try {
      result = await authService.login(email, password);
    } catch (error: any) {
      if (error.message === 'INVALID_CREDENTIALS') {
        throw new InvalidCredentialsError('Invalid credentials');
      }
      throw error;
    }

    res.cookie('token', result.token, cookieOptions);

    res.json({
      success: true,
      data: result.user,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.clearCookie('token', cookieOptions);
    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is set by the authenticateToken middleware
    res.json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
};

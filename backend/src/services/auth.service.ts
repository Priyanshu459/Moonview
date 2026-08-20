import { prisma } from '../config/database.js';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AuthUserResponse } from '@moonview/shared';

export class AuthService {
  /**
   * Authenticates an admin using email and password.
   * Returns a signed JWT token and safe user details if successful.
   * Throws an error for generic invalid credentials if it fails.
   */
  async login(email: string, password: string): Promise<{ token: string; user: AuthUserResponse }> {
    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!admin) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const isPasswordValid = await argon2.verify(admin.passwordHash, password);
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const user: AuthUserResponse = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: 'ADMIN',
    };

    const options: jwt.SignOptions = { expiresIn: config.JWT_EXPIRES_IN as any };
    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
      },
      config.JWT_SECRET,
      options
    );

    return { token, user };
  }

  /**
   * Verifies a JWT token and checks if the admin still exists in the DB.
   * This is used by the authentication middleware.
   */
  async verifyToken(token: string): Promise<AuthUserResponse> {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as { sub: string; role: string };

      if (!decoded.sub) {
        throw new Error('INVALID_TOKEN');
      }

      const admin = await prisma.admin.findUnique({
        where: { id: decoded.sub },
        select: { id: true, email: true, name: true },
      });

      if (!admin) {
        throw new Error('USER_NOT_FOUND');
      }

      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'ADMIN',
      };
    } catch (error) {
      throw new Error('INVALID_TOKEN');
    }
  }
}

export const authService = new AuthService();

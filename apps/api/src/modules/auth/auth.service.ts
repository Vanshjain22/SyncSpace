import { ConflictError, NotFoundError, UnauthorizedError } from "@/core/errors/HttpErrors";
import { type AsyncResult, Result } from "@/core/result/Result";
import { prisma } from "@/infrastructure/database/prismaClient";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { comparePassword, hashPassword } from "@/lib/password";
import { JWT, type LoginInput, type RegisterInput, type UserPublic } from "@syncspace/shared";

export interface AuthResult {
  user: UserPublic;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Register a new user.
   */
  async register(input: RegisterInput): AsyncResult<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return Result.err(new ConflictError("Email address is already in use"));
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: input.name,
        passwordHash,
      },
    });

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    const expiresAt = new Date(Date.now() + JWT.REFRESH_TOKEN_EXPIRES_MS);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return Result.ok({
      user: this.mapToUserPublic(user),
      accessToken,
      refreshToken,
    });
  }

  /**
   * Log in an existing user.
   */
  async login(input: LoginInput): AsyncResult<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return Result.err(new UnauthorizedError("Invalid email or password"));
    }

    const isPasswordValid = await comparePassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      return Result.err(new UnauthorizedError("Invalid email or password"));
    }

    // Update lastLoginAt
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    const expiresAt = new Date(Date.now() + JWT.REFRESH_TOKEN_EXPIRES_MS);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return Result.ok({
      user: this.mapToUserPublic(updatedUser),
      accessToken,
      refreshToken,
    });
  }

  /**
   * Log out a user by deleting their refresh token.
   */
  async logout(token: string): AsyncResult<void> {
    try {
      await prisma.refreshToken.delete({
        where: { token },
      });
    } catch {
      // Ignore if token not found or already deleted
    }
    return Result.ok(undefined);
  }

  /**
   * Rotate access and refresh tokens.
   */
  async refreshTokens(token: string): AsyncResult<RefreshResult> {
    try {
      // 1. Verify token JWT signature and expiration
      const payload = verifyRefreshToken(token);

      // 2. Lookup in database to ensure it exists and hasn't been blacklisted/revoked
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token },
      });

      if (!storedToken) {
        return Result.err(new UnauthorizedError("Invalid or expired session"));
      }

      if (storedToken.expiresAt < new Date()) {
        // Cleanup expired token
        await prisma.refreshToken.delete({ where: { token } }).catch(() => {});
        return Result.err(new UnauthorizedError("Session has expired — please sign in again"));
      }

      // 3. Delete old token (Rotation)
      await prisma.refreshToken.delete({
        where: { token },
      });

      // 4. Generate new pair
      const userId = payload.sub;
      const accessToken = signAccessToken(userId);
      const refreshToken = signRefreshToken(userId);

      // 5. Store new refresh token
      const expiresAt = new Date(Date.now() + JWT.REFRESH_TOKEN_EXPIRES_MS);
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId,
          expiresAt,
        },
      });

      return Result.ok({
        accessToken,
        refreshToken,
      });
    } catch {
      return Result.err(new UnauthorizedError("Invalid or expired session"));
    }
  }

  /**
   * Get the current authenticated user's profile.
   */
  async getMe(userId: string): AsyncResult<UserPublic> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return Result.err(new NotFoundError("User"));
    }

    return Result.ok(this.mapToUserPublic(user));
  }

  /**
   * Update the user profile name.
   */
  async updateProfile(userId: string, name: string): AsyncResult<UserPublic> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return Result.err(new NotFoundError("User"));
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name },
    });

    return Result.ok(this.mapToUserPublic(updated));
  }

  /**
   * Change user password.
   */
  async changePassword(
    userId: string,
    input: { currentPassword?: string; newPassword?: string },
  ): AsyncResult<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return Result.err(new NotFoundError("User"));
    }

    if (!input.currentPassword || !input.newPassword) {
      return Result.err(new UnauthorizedError("Current password and new password are required"));
    }

    const isPasswordValid = await comparePassword(input.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return Result.err(new UnauthorizedError("Invalid current password"));
    }

    const passwordHash = await hashPassword(input.newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return Result.ok(undefined);
  }

  /**
   * Helper to map Prisma User to UserPublic shape.
   */
  private mapToUserPublic(user: any): UserPublic {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

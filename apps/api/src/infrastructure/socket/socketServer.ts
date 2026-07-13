import { Server } from "socket.io";

import type http from "http";

import { env } from "@/config/env";
import { prisma } from "@/infrastructure/database/prismaClient";
import { logger } from "@/infrastructure/logger";
import { verifyAccessToken } from "@/lib/jwt";

let io: Server | null = null;

/**
 * Initialize Socket.io server with strict JWT authentication.
 */
export function initSocketServer(server: http.Server): Server {
  io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  // Strict Connection Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization;
    if (!token) {
      return next(new Error("Authentication is required"));
    }

    try {
      const jwtToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token;
      const payload = verifyAccessToken(jwtToken);
      (socket as any).user = payload;
      next();
    } catch (err) {
      next(new Error("Invalid or expired session token"));
    }
  });

  io.on("connection", (socket) => {
    const authUser = (socket as any).user;
    logger.info({ socketId: socket.id, userId: authUser.sub }, "🔌 Client connected and authenticated to Socket.io");

    // Client rooms bindings with authorization checks
    socket.on("join-task", async (taskId: string) => {
      try {
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          select: { column: { select: { board: { select: { project: { select: { organizationId: true } } } } } } },
        });

        if (!task) {
          logger.warn({ taskId }, "Task not found for room subscription");
          return;
        }

        const orgId = task.column.board.project.organizationId;
        const isMember = await prisma.organizationMember.findUnique({
          where: {
            userId_organizationId: {
              userId: authUser.sub,
              organizationId: orgId,
            },
          },
        });

        if (!isMember) {
          logger.warn({ taskId, userId: authUser.sub }, "Unauthorized task room join attempt");
          return;
        }

        socket.join(`task:${taskId}`);
        logger.info({ socketId: socket.id, taskId }, `Joined task room: task:${taskId}`);
      } catch (err) {
        logger.error({ err, taskId }, "Error joining task room");
      }
    });

    socket.on("leave-task", (taskId: string) => {
      socket.leave(`task:${taskId}`);
      logger.info({ socketId: socket.id, taskId }, `Left task room: task:${taskId}`);
    });

    socket.on("join-user", (userId: string) => {
      if (userId !== authUser.sub) {
        logger.warn({ socketId: socket.id, userId, callerId: authUser.sub }, "Unauthorized user room subscription attempt");
        return;
      }

      socket.join(`user:${userId}`);
      logger.info({ socketId: socket.id, userId }, `Joined user room: user:${userId}`);
    });

    socket.on("leave-user", (userId: string) => {
      socket.leave(`user:${userId}`);
      logger.info({ socketId: socket.id, userId }, `Left user room: user:${userId}`);
    });

    socket.on("join-board", async (boardId: string) => {
      try {
        const board = await prisma.board.findUnique({
          where: { id: boardId },
          select: { project: { select: { organizationId: true } } },
        });

        if (!board) {
          logger.warn({ boardId }, "Board not found for room subscription");
          return;
        }

        const orgId = board.project.organizationId;
        const isMember = await prisma.organizationMember.findUnique({
          where: {
            userId_organizationId: {
              userId: authUser.sub,
              organizationId: orgId,
            },
          },
        });

        if (!isMember) {
          logger.warn({ boardId, userId: authUser.sub }, "Unauthorized board room join attempt");
          return;
        }

        socket.join(`board:${boardId}`);
        logger.info({ socketId: socket.id, boardId }, `Joined board room: board:${boardId}`);
      } catch (err) {
        logger.error({ err, boardId }, "Error joining board room");
      }
    });

    socket.on("leave-board", (boardId: string) => {
      socket.leave(`board:${boardId}`);
      logger.info({ socketId: socket.id, boardId }, `Left board room: board:${boardId}`);
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id, userId: authUser.sub }, "🔌 Client disconnected from Socket.io");
    });
  });

  return io;
}

/**
 * Get Socket.io server instance.
 */
export function getSocketServer(): Server {
  if (!io) {
    throw new Error("Socket.io server has not been initialized");
  }
  return io;
}

/**
 * Broadcast event to all clients in a task room.
 */
export function emitToTaskRoom(taskId: string, event: string, data: any) {
  if (io) {
    io.to(`task:${taskId}`).emit(event, data);
  }
}

/**
 * Broadcast event to a specific authenticated user's room.
 */
export function emitToUser(userId: string, event: string, data: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

/**
 * Broadcast event to all clients in a board room.
 */
export function emitToBoardRoom(boardId: string, event: string, data?: any) {
  if (io) {
    io.to(`board:${boardId}`).emit(event, data);
  }
}

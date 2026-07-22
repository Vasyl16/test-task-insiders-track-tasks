import { io, type Socket } from "socket.io-client";
import { tokenManager } from "../axios/token-manager";

// Socket.IO's own path (/socket.io) lives at the bare origin, not under the
// REST API's /api prefix — strip it off VITE_API_URL rather than adding a
// second env var for what's really the same server.
const SOCKET_URL: string = (import.meta.env.VITE_API_URL as string).replace(/\/api\/?$/, "");

// Created eagerly (but not connected) so any hook that reads this export can
// always attach listeners to a stable instance, regardless of whether
// RealtimeConnectionManager's effect has run yet. auth is a callback, not a
// static object, so a reconnect always re-reads whatever token is current in
// localStorage (picks up a token rotated by the Axios 401-refresh interceptor
// while this socket stayed connected).
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: (cb) => cb({ token: tokenManager.getAccessToken() }),
});

export function connectSocket(): void {
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket(): void {
  if (socket.connected) {
    socket.disconnect();
  }
}

import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  sub: number;
  username: string;
  email: string;
  iat: number;
  exp: number;
}

export function getUserFromToken(): { userId: number } | null {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return { userId: decoded.sub };
  } catch (err) {
    console.error("Failed to decode token", err);
    return null;
  }
}

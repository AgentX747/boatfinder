import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";


export interface AuthPayload extends JwtPayload {
  sub: string;     
  username: string;
  sid: string;
  role : string;
}


export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies.access_token;

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
    
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.TOKEN_SECRET as string
    ) as AuthPayload;
    

    req.user = payload; // 👈 parsed session

    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

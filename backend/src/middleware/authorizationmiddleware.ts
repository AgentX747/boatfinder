// middleware/authorizeRole.ts
import { Request, Response, NextFunction } from "express";
import { AuthPayload } from "./authmiddleware.js";

export function authorizeRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as AuthPayload | undefined;
  

    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!allowedRoles.includes(user.role)) {
    
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}


import { Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import {AuthPayload} from '../middleware/authmiddleware.js'
import { RowDataPacket } from 'mysql2';
import {connection} from "../config/mysql.js";
import client from '../config/redisconfig.js';
import { withCache } from '../utils/cache.js';

const SESSION_TTL = 4000;

export async function getUserSessionController(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'User not authenticated' });

  const { sub, username, role } = req.user as AuthPayload;

  try {
    const sessionData = await withCache(`user:${sub}`, SESSION_TTL, async () => {
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT firstName, lastName FROM users WHERE user_id = ?',
        [sub]
      );
      if (rows.length === 0) throw Object.assign(new Error('User not found'), { status: 404 });

      return { userId: sub, username, firstName: rows[0].firstName, lastName: rows[0].lastName, role };
    });

    return res.json(sessionData);
  } catch (err: any) {
    return res.status(err.status ?? 500).json({ message: err.message ?? 'Internal server error' });
  }
}

export async function getBoatOperatorSessionController(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  const { sub, username, role } = req.user as AuthPayload;

  try {
    const sessionData = await withCache(`boatoperator:${sub}`, SESSION_TTL, async () => {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT operator_id, firstName, lastName, registration_status
         FROM boatoperators WHERE user_id = ?`,
        [sub]
      );
      if (rows.length === 0) throw Object.assign(new Error('Boat operator profile not found'), { status: 404 });

      const op = rows[0];
      if (op.registration_status === 'pending')
        throw Object.assign(new Error('Boat operator not yet verified'), { status: 403 });

      return { operatorId: op.operator_id, username, firstName: op.firstName, lastName: op.lastName, role };
    });

    return res.json(sessionData);
  } catch (err: any) {
    return res.status(err.status ?? 500).json({ message: err.message ?? 'Server error' });
  }
}


export async function getAdminSessionController(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const { sub, username, role } = req.user as AuthPayload;

  try {
    const sessionData = await withCache(`admin:${sub}`, SESSION_TTL, async () => {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT admin_id, firstName, lastName
         FROM admin WHERE user_id = ?`,
        [sub]
      );
      if (rows.length === 0)
        throw Object.assign(new Error('Admin profile not found'), { status: 404 });

      return {
        adminId: rows[0].admin_id,
        username,
        firstName: rows[0].firstName,
        lastName: rows[0].lastName,
        role,
      };
    });

    return res.json(sessionData);
  } catch (err: any) {
    return res.status(err.status ?? 500).json({ message: err.message ?? 'Server error' });
  }
}
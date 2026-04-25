import { Request, Response } from "express";
import { connection } from "../config/mysql.js";

import crypto from "crypto";
import jwt from "jsonwebtoken";
import { RowDataPacket } from "mysql2";
import { hashPassword, verifyPassword } from "../lib/passwordhash.js";

// ─── Helper ────────────────────────────────────────────────────────────────
async function insertLog(
  action_type: string,
  user_id: number | null,
  role: string | null,
  user_agent: string | null
) {
  try {
    await connection.execute(
      `INSERT INTO system_logs (user_id, role, action_type, user_agent)
       VALUES (?, ?, ?, ?)`,
      [user_id, role, action_type, user_agent]
    );
  } catch (logErr) {
    console.error("Failed to write system log:", logErr);
  }
}

// ─── Login ─────────────────────────────────────────────────────────────────
export async function LoginController(req: Request, res: Response) {
  const { username, password } = req.body;
  const ua = req.headers["user-agent"] ?? null;

  try {
    // 1️⃣ Find user
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT user_id, username, password, role FROM users WHERE username = ?",
      [username.toLowerCase()]
    );

    if (rows.length === 0) {
      await insertLog("LOGIN_FAILED", null, null, ua);
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const user = rows[0];

    // 2️⃣ Check boat operator verification only if role is boatoperator
    if (user.role === "boatoperator") {
      const [operatorRows] = await connection.execute<RowDataPacket[]>(
        "SELECT registration_status FROM boatoperators WHERE user_id = ?",
        [user.user_id]
      );

      const operator = operatorRows[0];

      if (!operator) {
        await insertLog("LOGIN_FAILED", user.user_id, user.role, ua);
        return res.status(404).json({ message: "Boat operator profile not found" });
      }

      if (operator.registration_status === "pending") {
        await insertLog("LOGIN_FAILED_UNVERIFIED", user.user_id, user.role, ua);
        return res.status(403).json({ message: "Boat operator not yet verified" });
      }
    }

    // 3️⃣ Verify password
    const isMatch = await verifyPassword(user.password, password);
    if (!isMatch) {
      await insertLog("LOGIN_FAILED", user.user_id, user.role, ua);
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // 4️⃣ Create session ID & JWT
    const sessionId = crypto.randomBytes(32).toString("hex");
    const token = jwt.sign(
      {
        sub: user.user_id,
        username: user.username,
        sid: sessionId,
        role: user.role,
      },
      process.env.TOKEN_SECRET as string,
      {
        expiresIn: "15m",
        issuer: "boat-finder",
      }
    );

    // 5️⃣ Set cookie
    res.cookie("access_token", token, {
      httpOnly: true,
      secure: true,
       sameSite: "none",
      maxAge: 15 * 60 * 1000,
    });

    // ✅ Log successful login
    await insertLog("LOGIN", user.user_id, user.role, ua);

    return res.json({
      message: "Login successful",
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ─── Refresh Token ──────────────────────────────────────────────────────────
export function refreshTokenController(req: Request, res: Response) {
  const refreshToken = req.cookies.access_token;
  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token" });
  }

  try {
   const payload = jwt.verify(
  refreshToken,
  process.env.TOKEN_SECRET as string,
  { ignoreExpiration: true } // ✅ allow expired tokens to be refreshed
) as jwt.JwtPayload;

    const newAccessToken = jwt.sign(
      {
        sub: payload.sub,
        username: payload.username,
        sid: payload.sid,
        role: payload.role,
      },
      process.env.TOKEN_SECRET as string,
      { expiresIn: "15m" }
    );

    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
      secure: true,
       sameSite: "none",
      maxAge: 15 * 60 * 1000,
    });

    return res.json({ message: "Token refreshed" });
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
}

// ─── Register ───────────────────────────────────────────────────────────────
export async function RegisterController(req: Request, res: Response) {
  const ua = req.headers["user-agent"] ?? null;

  const clean = (value: any, lower = false) => {
    if (value === undefined || value === null || value === "") return null;
    const v = String(value).trim();
    return lower ? v.toLowerCase() : v;
  };

  const {
    firstName, lastName, username, email,
    password, confirmPassword,
    phoneNumber, address, birthdate,
    gender, role,
    companyName, companyAddress, companyPhoneNumber, companyEmail,gcashNumber,gcashName
  } = req.body;

  // 🔹 Sanitize
  const fName       = clean(firstName);
  const lName       = clean(lastName);
  const uName       = clean(username, true);
  const mail        = clean(email, true);
  const phone       = clean(phoneNumber);
  const addr        = clean(address);
  const gend        = clean(gender, true);
  const userRole    = clean(role, true) || "user";
  const birth       = clean(birthdate);
  const compName    = clean(companyName);
  const compAddr    = clean(companyAddress);
  const compPhone   = clean(companyPhoneNumber);
  const compEmail   = clean(companyEmail, true);

  // 🔹 Validation
  if (!mail || !uName || !password)
    return res.status(400).json({ message: "Missing required fields" });

  if (password !== confirmPassword)
    return res.status(400).json({ message: "Passwords do not match" });

  if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password))
    return res.status(400).json({ message: "Password must be 8+ chars, 1 uppercase & 1 number" });

  if (!/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(mail))
    return res.status(400).json({ message: "Invalid email format" });

  if (userRole === "boat operator" && !compName)
    return res.status(400).json({ message: "Company name required for boat operators" });

  if (!/^\+639\d{9}$/.test(phone || ""))
    return res.status(400).json({ message: "Invalid phone number format" });

  if (compPhone && !/^\+639\d{9}$/.test(compPhone))
    return res.status(400).json({ message: "Invalid company number format" });

  let conn;

  try {
    conn = await connection.getConnection();
    await conn.beginTransaction();

    // Check duplicates
    const [existing] = await conn.execute<RowDataPacket[]>(
      "SELECT user_id FROM users WHERE  userName = ?",
      [mail, uName]
    );

    if (existing.length > 0) {
      await conn.rollback();
      await insertLog("REGISTER_FAILED_DUPLICATE", null, userRole, ua);
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await hashPassword(password);

    // Insert user
    const [userResult] = await conn.execute(
      `INSERT INTO users 
      (firstName, lastName, userName, email, password, phone_number, address, gender, role, birthdate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fName, lName, uName, mail, hashedPassword, phone, addr, gend, userRole, birth]
    );

    const userId = (userResult as any).insertId;
    let companyId: number | null = null;

    if (userRole === "boatoperator") {
  // Check if company already exists
  const [existingCompany] = await conn.execute<RowDataPacket[]>(
    `SELECT company_id FROM companies WHERE companyName = ?`,
    [compName]
  );

  if (existingCompany.length > 0) {
    // Use existing company
    companyId = existingCompany[0].company_id;
  } else {
    // Insert new company
    const [companyResult] = await conn.execute(
      `INSERT INTO companies (companyName, address, phone_number, email)
       VALUES (?, ?, ?, ?)`,
      [compName, compAddr, compPhone, compEmail]
    );
    companyId = (companyResult as any).insertId;
  }

  await conn.execute(
    `INSERT INTO boatoperators
    (company_id, user_id, firstName, lastName, userName, email, password, phone_number, address, gender, birthdate, gcash_number, gcash_account_name, registration_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [companyId, userId, fName, lName, uName, mail, hashedPassword, phone, addr, gend, birth, gcashNumber, gcashName, "pending"]
  );
}
    if (userRole === "admin") {
      const [companyResult] = await conn.execute(
        `INSERT INTO companies (companyName, address, phone_number, email)
         VALUES (?, ?, ?, ?)`,
        [compName, compAddr, compPhone, compEmail]
      );

      companyId = (companyResult as any).insertId;

      await conn.execute(
        `INSERT INTO admin
         (user_id, firstName, lastName, email, password, phone_number, address, gender, birthdate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, fName, lName, mail, hashedPassword, phone, addr, gender, birth]
      );
    }

    await conn.commit();

    // ✅ Log successful registration
    await insertLog("REGISTER", userId, userRole, ua);

    return res.status(201).json({ message: "Registration successful" });

  } catch (err) {
    if (conn) await conn.rollback();
    console.error(err);
    await insertLog("REGISTER_FAILED_ERROR", null, userRole, ua);
    return res.status(500).json({ message: "Server error" });

  } finally {
    if (conn) conn.release();
  }
}

// ─── Logout ─────────────────────────────────────────────────────────────────
export async function logoutController(req: Request, res: Response) {
  // Extract user info from JWT before clearing the cookie
  const token = req.cookies.access_token;
  let userId: number | null = null;
  let role: string | null = null;

  if (token) {
    try {
      const payload = jwt.verify(
        token,
        process.env.TOKEN_SECRET as string
      ) as jwt.JwtPayload;
      userId = payload.sub ? Number(payload.sub) : null;
      role   = payload.role ?? null;
    } catch {
      // token expired or invalid — still allow logout, log anyway
    }
  }

  res.clearCookie("access_token", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });

  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });

  // ✅ Log logout
  await insertLog("LOGOUT", userId, role, req.headers["user-agent"] ?? null);

  return res.json({ message: "Logged out successfully" });
}
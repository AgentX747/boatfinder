import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";
import fs from "fs"; // ES module import

export const connection = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: {
    ca: fs.readFileSync('./ca.pem'), // 👈 path to your ca.pem('./ca.pem'),
  },

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
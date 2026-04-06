import { Request, Response, NextFunction } from "express";
import { upload } from "./multerconfig.js"; // keep your memoryStorage multer
import supabase from "../config/supabaseconfig.js";
import path from "path";

export const parseFile = upload.single("legaldocs");

export async function uploadLegalDocs(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const file = files?.["legaldocs"]?.[0];
    if (!file) return next();

    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    const filename = `${Date.now()}-${base}${ext}`;

    const { data, error } = await supabase.storage
      .from("legaldocs")
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return res.status(500).json({ message: "Failed to upload file" });
    }

    const { data: publicUrlData } = supabase.storage
      .from("legaldocs")
      .getPublicUrl(filename);

    req.body.legaldocs = publicUrlData.publicUrl;
    next();
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
}
import { Request, Response, NextFunction } from "express";
import { upload } from "./multerconfig.js";
import supabase from "../config/supabaseconfig.js";
import path from "path";

export const parseGcashImage = upload.single("gcashImage");

export async function uploadGcashImage(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const file = files?.["gcashImage"]?.[0]; // read from req.files since parseBoatFiles uses upload.fields
    if (!file) return next();

    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    const filename = `${Date.now()}-${base}${ext}`;

    const { data, error } = await supabase.storage
      .from("gcashimages")
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return res.status(500).json({ message: "Failed to upload gcash image" });
    }

    const { data: publicUrlData } = supabase.storage
      .from("gcashimages")
      .getPublicUrl(filename);

    req.body.image = publicUrlData.publicUrl;
    next();
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
}
import { Request, Response, NextFunction } from "express";
import { upload } from "./multerconfig.js";
import supabase from "../config/supabaseconfig.js";
import path from "path";

export const parseBoatImage = upload.single("boatImage");

export async function uploadBoatImage(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const file = files?.["boatImage"]?.[0];
    if (!file) return next();

    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    const filename = `${Date.now()}-${base}${ext}`;

    const { data, error } = await supabase.storage
      .from("boatimages")
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return res.status(500).json({ message: "Failed to upload boat image" });
    }

    const { data: publicUrlData } = supabase.storage
      .from("boatimages")
      .getPublicUrl(filename);

    req.body.boatImage = publicUrlData.publicUrl;
    next();
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
}
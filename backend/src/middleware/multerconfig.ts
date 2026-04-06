import multer from "multer";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }
});

export const parseBoatFiles = upload.fields([
  { name: "legaldocs", maxCount: 1 },
  { name: "boatImage", maxCount: 1 },
  { name: "gcashImage", maxCount: 1 },
   { name: "refundImage", maxCount: 1 }

]);

export const parseGcashImage = upload.single("gcashImage"); // add this
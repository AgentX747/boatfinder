import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authroutes.js";
import userRoutes from "./routes/userroutes.js";
import boatOperatorRoutes from "./routes/boatoperatorroutes.js";
import weatherRoutes from "./routes/weatherroutes.js";
import adminRoutes from "./routes/adminroutes.js";
import predictionRoutes from "./routes/predictionsrouter.js";

dotenv.config();
const app = express();
const port = 3000;



app.use(cors({
   origin: ['https://boatfinders.onrender.com', 'http://localhost:3000'],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));


app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/boatoperator", boatOperatorRoutes);
app.use("/weather", weatherRoutes);
app.use("/admin", adminRoutes);
app.use("/predictions", predictionRoutes);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

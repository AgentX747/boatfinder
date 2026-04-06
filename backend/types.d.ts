import {AuthPayload} from "./src/middleware/authmiddleware.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

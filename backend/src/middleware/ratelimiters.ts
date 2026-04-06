import rateLimit from "express-rate-limit";


export const loginLimiter = rateLimit({
   windowMs: 5 * 60 * 1000, // 15 mins
  max: 5, // limit each IP
  message: {
    success: false,
    message: "Too many login attempts. Try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});
export const registerLimiter = rateLimit({
   windowMs: 5 * 60 * 1000, // 15 mins
  max: 5, // limit each IP
  message: {
    success: false,
    message: "Too many registration attempts. Try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
})
  export const addBoatLimiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 5, // limit each IP
    message: {
      success: false,
      message: "Too many addboat attempts. Try again in 2 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false,
  })
  // Auth - strict (already have loginLimiter, registerLimiter)

// Booking actions - prevent spam bookings
export const bookingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, message: "Too many booking attempts. Try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Booking mutations (accept/decline/cancel) - operator actions
export const bookingActionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: { success: false, message: "Too many actions. Slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// File uploads (refund, gcash image)
export const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: { success: false, message: "Too many upload attempts. Try again in 5 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Support/refund ticket submissions
export const ticketLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: { success: false, message: "Too many ticket submissions. Try again in 10 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Edit/update profile or boat details
export const editLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: { success: false, message: "Too many edit attempts. Try again in 5 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Read/GET endpoints - lenient
export const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: { success: false, message: "Too many requests. Slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});
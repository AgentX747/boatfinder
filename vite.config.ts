import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react() , tailwindcss()],
   preview: {
    allowedHosts: ['boatfinders.onrender.com', 'localhost:5173', 'localhost:3000']  // ← ADD THIS
  }


})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages deployment base path (must match your repo name exactly)
  base: '/Loan-Processing-Git/', 
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 👉 MUITO IMPORTANTE: base = '/dsxenergiapoda/'
export default defineConfig({
  plugins: [react()],
  base: '/dsxenergiapoda/',
})

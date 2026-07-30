import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tailwind v4 se configureaza prin plugin + CSS-first (@theme in src/index.css).
// Nu exista tailwind.config.js si nici postcss.config.js — vezi CLAUDE.md.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    // jsdom peste tot: testele de logica pura nu-l folosesc, dar asa un test de
    // componenta adaugat mai tarziu nu cere reconfigurare.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/teste/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Fusul orar al masinii NU trebuie sa influenteze testele: jumatate din
    // logica de timp exista tocmai ca sa separe instantul absolut de ziua
    // locala a restaurantului. Fixam un fus diferit de cel al restaurantelor
    // testate, ca o confuzie intre cele doua sa iasa la iveala.
    env: { TZ: 'UTC' },
  },
})

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function validateProductionApiEnv(env, command) {
  if (command !== 'build') return;
  const apiUrl = (env.VITE_API_URL || '').trim();
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(apiUrl)) {
    throw new Error(
      `[BorrowHub Build Guard] Refusing production build with localhost VITE_API_URL ("${apiUrl}"). Set VITE_API_URL=https://borrowhub.onrender.com/api.`
    );
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  validateProductionApiEnv(env, command);

  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    test: {
      environment: 'jsdom',
      setupFiles: './src/tests/setup.js'
    }
  };
})

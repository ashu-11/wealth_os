import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/** Must match API `PORT` in server/.env (default 5050 in .env.example; macOS often uses 5000). */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = env.VITE_API_PORT || '5050';
  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});

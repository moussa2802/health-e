import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  let env: Record<string, string> = {};
  try {
    env = loadEnv(mode, process.cwd(), '');
  } catch {
    // Ignorer les erreurs de lecture du .env (problème de permissions iCloud)
  }

  const plugins = [react()];

  // Upload source maps to Sentry only during production builds when auth token is available
  if (mode === 'production' && env.SENTRY_AUTH_TOKEN) {
    plugins.push(
      sentryVitePlugin({
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN,
        sourcemaps: { filesToDeleteAfterUpload: ['./dist/assets/*.js.map'] },
        telemetry: false,
      })
    );
  }

  return {
    plugins,
    define: {
      global: 'globalThis',
    },
    resolve: {
      alias: {
        stream: 'stream-browserify',
      },
    },
    optimizeDeps: {
      include: ['buffer'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            firebase: ['firebase/app', 'firebase/firestore', 'firebase/storage'],
            ui: ['lucide-react'],
          },
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
            return `assets/${facadeModuleId}-[hash].js`;
          },
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      chunkSizeWarningLimit: 1000,
      // Source maps activés pour Sentry (supprimés après upload en prod)
      sourcemap: mode === 'production',
      target: 'es2015',
      minify: 'esbuild',
    },
    server: {
      hmr: { overlay: true },
      watch: { usePolling: true, interval: 1000 },
    },
  };
});

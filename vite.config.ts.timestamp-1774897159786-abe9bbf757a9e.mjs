// vite.config.ts
import { defineConfig, loadEnv } from "file:///Users/admin/Library/Mobile%20Documents/com%7Eapple%7ECloudDocs/Health-e/node_modules/vite/dist/node/index.js";
import react from "file:///Users/admin/Library/Mobile%20Documents/com%7Eapple%7ECloudDocs/Health-e/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { sentryVitePlugin } from "file:///Users/admin/Library/Mobile%20Documents/com%7Eapple%7ECloudDocs/Health-e/node_modules/@sentry/vite-plugin/dist/esm/index.mjs";
var vite_config_default = defineConfig(({ mode }) => {
  let env = {};
  try {
    env = loadEnv(mode, process.cwd(), "");
  } catch {
  }
  const plugins = [react()];
  if (mode === "production" && env.SENTRY_AUTH_TOKEN) {
    plugins.push(
      sentryVitePlugin({
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN,
        sourcemaps: { filesToDeleteAfterUpload: ["./dist/assets/*.js.map"] },
        telemetry: false
      })
    );
  }
  return {
    plugins,
    define: {
      global: "globalThis"
    },
    resolve: {
      alias: {
        stream: "stream-browserify"
      }
    },
    optimizeDeps: {
      include: ["buffer"]
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            router: ["react-router-dom"],
            firebase: ["firebase/app", "firebase/firestore", "firebase/storage"],
            ui: ["lucide-react"]
          },
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split("/").pop() : "chunk";
            return `assets/${facadeModuleId}-[hash].js`;
          },
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]"
        }
      },
      chunkSizeWarningLimit: 1e3,
      // Source maps activés pour Sentry (supprimés après upload en prod)
      sourcemap: mode === "production",
      target: "es2015",
      minify: "esbuild"
    },
    server: {
      hmr: { overlay: true },
      watch: { usePolling: true, interval: 1e3 }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYWRtaW4vTGlicmFyeS9Nb2JpbGUgRG9jdW1lbnRzL2NvbX5hcHBsZX5DbG91ZERvY3MvSGVhbHRoLWVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9hZG1pbi9MaWJyYXJ5L01vYmlsZSBEb2N1bWVudHMvY29tfmFwcGxlfkNsb3VkRG9jcy9IZWFsdGgtZS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvYWRtaW4vTGlicmFyeS9Nb2JpbGUlMjBEb2N1bWVudHMvY29tJTdFYXBwbGUlN0VDbG91ZERvY3MvSGVhbHRoLWUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBzZW50cnlWaXRlUGx1Z2luIH0gZnJvbSAnQHNlbnRyeS92aXRlLXBsdWdpbic7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIGxldCBlbnY6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgdHJ5IHtcbiAgICBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKTtcbiAgfSBjYXRjaCB7XG4gICAgLy8gSWdub3JlciBsZXMgZXJyZXVycyBkZSBsZWN0dXJlIGR1IC5lbnYgKHByb2JsXHUwMEU4bWUgZGUgcGVybWlzc2lvbnMgaUNsb3VkKVxuICB9XG5cbiAgY29uc3QgcGx1Z2lucyA9IFtyZWFjdCgpXTtcblxuICAvLyBVcGxvYWQgc291cmNlIG1hcHMgdG8gU2VudHJ5IG9ubHkgZHVyaW5nIHByb2R1Y3Rpb24gYnVpbGRzIHdoZW4gYXV0aCB0b2tlbiBpcyBhdmFpbGFibGVcbiAgaWYgKG1vZGUgPT09ICdwcm9kdWN0aW9uJyAmJiBlbnYuU0VOVFJZX0FVVEhfVE9LRU4pIHtcbiAgICBwbHVnaW5zLnB1c2goXG4gICAgICBzZW50cnlWaXRlUGx1Z2luKHtcbiAgICAgICAgb3JnOiBlbnYuU0VOVFJZX09SRyxcbiAgICAgICAgcHJvamVjdDogZW52LlNFTlRSWV9QUk9KRUNULFxuICAgICAgICBhdXRoVG9rZW46IGVudi5TRU5UUllfQVVUSF9UT0tFTixcbiAgICAgICAgc291cmNlbWFwczogeyBmaWxlc1RvRGVsZXRlQWZ0ZXJVcGxvYWQ6IFsnLi9kaXN0L2Fzc2V0cy8qLmpzLm1hcCddIH0sXG4gICAgICAgIHRlbGVtZXRyeTogZmFsc2UsXG4gICAgICB9KVxuICAgICk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHBsdWdpbnMsXG4gICAgZGVmaW5lOiB7XG4gICAgICBnbG9iYWw6ICdnbG9iYWxUaGlzJyxcbiAgICB9LFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgIHN0cmVhbTogJ3N0cmVhbS1icm93c2VyaWZ5JyxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgIGluY2x1ZGU6IFsnYnVmZmVyJ10sXG4gICAgfSxcbiAgICBidWlsZDoge1xuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAgIHZlbmRvcjogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcbiAgICAgICAgICAgIHJvdXRlcjogWydyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgICAgICBmaXJlYmFzZTogWydmaXJlYmFzZS9hcHAnLCAnZmlyZWJhc2UvZmlyZXN0b3JlJywgJ2ZpcmViYXNlL3N0b3JhZ2UnXSxcbiAgICAgICAgICAgIHVpOiBbJ2x1Y2lkZS1yZWFjdCddLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2h1bmtGaWxlTmFtZXM6IChjaHVua0luZm8pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGZhY2FkZU1vZHVsZUlkID0gY2h1bmtJbmZvLmZhY2FkZU1vZHVsZUlkID8gY2h1bmtJbmZvLmZhY2FkZU1vZHVsZUlkLnNwbGl0KCcvJykucG9wKCkgOiAnY2h1bmsnO1xuICAgICAgICAgICAgcmV0dXJuIGBhc3NldHMvJHtmYWNhZGVNb2R1bGVJZH0tW2hhc2hdLmpzYDtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnLFxuICAgICAgICAgIGFzc2V0RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uW2V4dF0nLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcbiAgICAgIC8vIFNvdXJjZSBtYXBzIGFjdGl2XHUwMEU5cyBwb3VyIFNlbnRyeSAoc3VwcHJpbVx1MDBFOXMgYXByXHUwMEU4cyB1cGxvYWQgZW4gcHJvZClcbiAgICAgIHNvdXJjZW1hcDogbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nLFxuICAgICAgdGFyZ2V0OiAnZXMyMDE1JyxcbiAgICAgIG1pbmlmeTogJ2VzYnVpbGQnLFxuICAgIH0sXG4gICAgc2VydmVyOiB7XG4gICAgICBobXI6IHsgb3ZlcmxheTogdHJ1ZSB9LFxuICAgICAgd2F0Y2g6IHsgdXNlUG9sbGluZzogdHJ1ZSwgaW50ZXJ2YWw6IDEwMDAgfSxcbiAgICB9LFxuICB9O1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQThYLFNBQVMsY0FBYyxlQUFlO0FBQ3BhLE9BQU8sV0FBVztBQUNsQixTQUFTLHdCQUF3QjtBQUdqQyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN4QyxNQUFJLE1BQThCLENBQUM7QUFDbkMsTUFBSTtBQUNGLFVBQU0sUUFBUSxNQUFNLFFBQVEsSUFBSSxHQUFHLEVBQUU7QUFBQSxFQUN2QyxRQUFRO0FBQUEsRUFFUjtBQUVBLFFBQU0sVUFBVSxDQUFDLE1BQU0sQ0FBQztBQUd4QixNQUFJLFNBQVMsZ0JBQWdCLElBQUksbUJBQW1CO0FBQ2xELFlBQVE7QUFBQSxNQUNOLGlCQUFpQjtBQUFBLFFBQ2YsS0FBSyxJQUFJO0FBQUEsUUFDVCxTQUFTLElBQUk7QUFBQSxRQUNiLFdBQVcsSUFBSTtBQUFBLFFBQ2YsWUFBWSxFQUFFLDBCQUEwQixDQUFDLHdCQUF3QixFQUFFO0FBQUEsUUFDbkUsV0FBVztBQUFBLE1BQ2IsQ0FBQztBQUFBLElBQ0g7QUFBQSxFQUNGO0FBRUEsU0FBTztBQUFBLElBQ0w7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxRQUFRO0FBQUEsTUFDVjtBQUFBLElBQ0Y7QUFBQSxJQUNBLGNBQWM7QUFBQSxNQUNaLFNBQVMsQ0FBQyxRQUFRO0FBQUEsSUFDcEI7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLGVBQWU7QUFBQSxRQUNiLFFBQVE7QUFBQSxVQUNOLGNBQWM7QUFBQSxZQUNaLFFBQVEsQ0FBQyxTQUFTLFdBQVc7QUFBQSxZQUM3QixRQUFRLENBQUMsa0JBQWtCO0FBQUEsWUFDM0IsVUFBVSxDQUFDLGdCQUFnQixzQkFBc0Isa0JBQWtCO0FBQUEsWUFDbkUsSUFBSSxDQUFDLGNBQWM7QUFBQSxVQUNyQjtBQUFBLFVBQ0EsZ0JBQWdCLENBQUMsY0FBYztBQUM3QixrQkFBTSxpQkFBaUIsVUFBVSxpQkFBaUIsVUFBVSxlQUFlLE1BQU0sR0FBRyxFQUFFLElBQUksSUFBSTtBQUM5RixtQkFBTyxVQUFVLGNBQWM7QUFBQSxVQUNqQztBQUFBLFVBQ0EsZ0JBQWdCO0FBQUEsVUFDaEIsZ0JBQWdCO0FBQUEsUUFDbEI7QUFBQSxNQUNGO0FBQUEsTUFDQSx1QkFBdUI7QUFBQTtBQUFBLE1BRXZCLFdBQVcsU0FBUztBQUFBLE1BQ3BCLFFBQVE7QUFBQSxNQUNSLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixLQUFLLEVBQUUsU0FBUyxLQUFLO0FBQUEsTUFDckIsT0FBTyxFQUFFLFlBQVksTUFBTSxVQUFVLElBQUs7QUFBQSxJQUM1QztBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=

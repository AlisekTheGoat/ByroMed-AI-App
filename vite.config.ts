import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables based on the current mode
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react({
        // Use React 17+ automatic JSX runtime
        jsxRuntime: 'automatic',
        // Configure Babel options
        babel: {
          plugins: [
            // Add any Babel plugins you might need
            '@babel/plugin-transform-runtime',
          ],
        },
        // Enable Fast Refresh (implicitly enabled in development)
      }),
    ],
    
    // Base public path when served in development or production
    base: './',
    
    // Build configuration
    build: {
      outDir: 'dist/renderer',
      sourcemap: mode === 'development', // Enable source maps in development
      minify: mode === 'production' ? 'esbuild' : false,
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1000, // in kBs
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor libraries into separate chunks
            react: ['react', 'react-dom', 'react-router-dom'],
            // Add other dependencies that are large and don't change often
            // vendor: ['axios', 'date-fns', 'etc...'],
          },
        },
      },
    },
    
    // Development server configuration
    server: {
      port: 5173, // Default port
      strictPort: true, // Exit if port is in use
      open: false, // Don't open browser automatically
      cors: true, // Enable CORS
      host: true, // Listen on all network interfaces
      hmr: {
        // Enable HMR with WebSocket
        protocol: 'ws',
        host: 'localhost',
        port: 5173,
      },
      // Proxy API requests in development
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          // Rewrite path if needed
          // rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    
    // Resolve configuration
    resolve: {
      alias: {
        // Set up path aliases for cleaner imports
        '@': resolve(__dirname, './src'),
        '@components': resolve(__dirname, './src/components'),
        '@hooks': resolve(__dirname, './src/hooks'),
        '@styles': resolve(__dirname, './src/styles'),
        '@utils': resolve(__dirname, './src/utils'),
      },
    },
    
    // CSS configuration
    css: {
      // Configure CSS modules
      modules: {
        generateScopedName: mode === 'development' 
          ? '[name]__[local]__[hash:base64:5]' 
          : '[hash:base64:5]',
      },
      // PostCSS configuration
      postcss: './postcss.config.cjs',
      // Enable CSS source maps in development
      devSourcemap: mode === 'development',
    },
    
    // Environment variables that will be available in the client
    define: {
      'process.env': { ...env },
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
    
    // Optimize dependencies (pre-bundling)
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
      // Exclude dependencies that don't need to be pre-bundled
      exclude: ['@node-rs/argon2'],
      // Force dependency pre-bundling, ignoring browser field
      esbuildOptions: {
        // Node.js global to browser globalThis
        define: {
          global: 'globalThis',
        },
      },
    },
  };
});

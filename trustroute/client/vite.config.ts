import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      // x402's avm signer pulls @algorandfoundation/algokit-utils →
      // xhd-wallet-api, which statically imports node "crypto"/"util".
      // Polyfill them for the browser bundle (ed25519/sha512/randomBytes).
      include: ["crypto", "util", "stream", "buffer"],
    }),
  ],
  resolve: {
    alias: {
      // algosdk's Node build pulls @algorandfoundation/xhd-wallet-api, which
      // statically imports node "crypto"/"util" and breaks the browser bundle.
      // Its UMD browser build polyfills everything and only touches "crypto"
      // behind a runtime typeof-guard — safe in browsers and in Vite/Rollup.
      algosdk: fileURLToPath(new URL("./node_modules/algosdk/dist/browser/algosdk.min.js", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/health": "http://localhost:4000",
    },
  },
});
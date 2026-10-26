import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Matches tsconfig's "@/*" path, so component tests can import like the app
export default defineConfig({
    resolve: {
        alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
});

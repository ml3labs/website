import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Plain HTML in out/, which GitHub Pages serves at ml3labs.com. Nothing
    // can run on a server at request time, so no route handlers that read
    // the request, cookies, redirects or default image optimization.
    output: "export",
    images: {
        unoptimized: true,
    },
    trailingSlash: true,
    // Otherwise next dev writes an AGENTS.md whenever it detects a coding agent
    agentRules: false,
    // No cacheComponents, though create-next-app turns it on: it implies
    // Partial Prerendering, and the build fails with "PPR cannot be enabled
    // in export mode".

    // Let a phone on the same network load the dev server by the dev
    // machine's LAN address. Next blocks other hosts by default, and the
    // page then never hydrates.
    allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
};

export default nextConfig;

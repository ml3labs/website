# website

Website of ML³, McMaster Low Latency Labs

**Live:** [ml3labs.com](https://ml3labs.com)

## Stack

- [Next.js 16](https://nextjs.org) (App Router, static export)
- [React 19](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- TypeScript, deployed to GitHub Pages via Actions

## Development

```
npm install
npm run dev
```

## Structure

```
src/
  app/          # App Router: the pages, the root layout with the site's
                # chrome (nav, deadline, footer), styles and metadata
  components/   # UI components
  lib/          # Framework-free logic
public/         # Served as-is, including CNAME
  media/brand/  # Logo: light and dark PNGs, and the mark as SVG
assets/fonts/   # Fonts for the link-preview image (OFL)
```

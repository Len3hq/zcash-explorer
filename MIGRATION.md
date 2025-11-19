# Migration to Next.js - Summary

This document summarizes the migration from Express.js + EJS to Next.js 14.

## What Changed

### Architecture
- **From**: Express.js server with EJS templates
- **To**: Next.js 14 with App Router, React Server Components, and TypeScript

### Project Structure

**Old Structure:**
```
├── server.js                 # Express server
├── zcashRpcClient.js        # RPC client (CommonJS)
├── views/                   # EJS templates
│   ├── index.ejs
│   ├── block.ejs
│   ├── blocks.ejs
│   ├── tx.ejs
│   └── txs.ejs
└── public/
    ├── app.js              # Vanilla JS
    └── styles.css
```

**New Structure:**
```
├── app/                     # Next.js App Router
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   ├── blocks/page.tsx     # Blocks list
│   ├── block/[id]/page.tsx # Block detail
│   ├── txs/page.tsx        # Transactions list
│   ├── tx/[txid]/page.tsx  # Transaction detail
│   └── globals.css         # Global styles
├── components/              # React components
│   ├── Header.tsx
│   ├── StatsCard.tsx
│   ├── BlocksTable.tsx
│   └── RawModal.tsx
├── lib/                     # Utilities
│   ├── zcashRpcClient.ts   # RPC client (ES modules)
│   └── utils.ts            # Helper functions
├── public/                  # Static assets
│   └── styles.css          # (kept for reference)
├── next.config.js
├── tsconfig.json
└── .env.local              # Environment variables
```

### Key Technical Changes

1. **Server-Side Rendering (SSR)**
   - All pages now use React Server Components by default
   - Data fetching happens on the server for better performance
   - Automatic static optimization where possible

2. **TypeScript**
   - Full TypeScript support for better type safety
   - All new code is written in TypeScript

3. **ES Modules**
   - Migrated from CommonJS (`require`) to ES modules (`import/export`)
   - Uses native `fetch` instead of `node-fetch`

4. **Component-Based Architecture**
   - Reusable React components instead of EJS partials
   - Client-side interactivity with React hooks
   - Cleaner separation of concerns

5. **Routing**
   - File-system based routing (Next.js App Router)
   - Dynamic routes: `/block/[id]` and `/tx/[txid]`
   - Client-side navigation with `next/link`

6. **Search Functionality**
   - Client-side form handling with React
   - Uses Next.js router for navigation

### Dependencies

**Removed:**
- `express` - No longer needed (Next.js has built-in server)
- `ejs` - Replaced with React/JSX
- `node-fetch` - Using native fetch API

**Added:**
- `next` - Next.js framework
- `react` - React library
- `react-dom` - React DOM renderer
- `typescript` - TypeScript support
- `@types/*` - Type definitions

## Running the Application

### Development
```bash
npm run dev
```
Visit http://localhost:3000

### Production
```bash
npm run build
npm start
```

## Environment Variables

The application now uses `.env.local` (instead of `.env`). Make sure your environment variables are configured:

```
ZCASH_RPC_URL=https://your-zcash-endpoint
PORT=3000
```

## Features Preserved

All original features have been preserved:
- ✅ Home page with network overview and stats
- ✅ Blocks list page
- ✅ Block detail page (by height or hash)
- ✅ Transactions list page
- ✅ Transaction detail page
- ✅ Search functionality (block height, hash, or txid)
- ✅ Raw JSON modal for transactions
- ✅ All styling and visual design
- ✅ Zcash RPC integration

## Benefits of Next.js

1. **Performance**: Server-side rendering and automatic code splitting
2. **Developer Experience**: Hot reloading, TypeScript, better error messages
3. **Modern Stack**: React ecosystem, component reusability
4. **SEO**: Better crawlability with SSR
5. **Scalability**: Easier to add new features and pages
6. **Type Safety**: TypeScript catches errors at compile time

## Future Enhancements

Consider these improvements now that you're on Next.js:
- Add loading states with `loading.tsx` files
- Implement error boundaries with `error.tsx` files
- Add API routes for real-time data updates
- Implement client-side data caching
- Add progressive web app (PWA) features
- Use Next.js Image optimization for any images

# Tractor Inspection OCR — Frontend

Enterprise dashboard for the Tractor Inspection OCR system. Upload inspection PDFs, review AI-extracted fields, manage batches, and view analytics.

## Tech Stack
- **Next.js 16** with App Router
- **React 19**
- **Tailwind CSS v4**
- **shadcn/ui** components
- **PWA** support via `@serwist/next`

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Login (simulated auth) |
| `/` | Dashboard — KPI cards, recent inspections |
| `/upload` | Upload PDF with drag-and-drop or camera |
| `/review` | Review queue with status filters |
| `/batches` | Batch listing with pagination |
| `/batches/[id]` | Batch detail with entries table |
| `/verify/[id]` | Individual inspection verification |
| `/analytics` | Charts, trends, factory comparison |
| `/reports` | Export management |
| `/settings` | App settings (10 sections) |

## Getting Started

```bash
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` (defaults to `http://localhost:8000/api`).

## Deployment

Deploy on Vercel. Set `NEXT_PUBLIC_API_URL` in Vercel environment variables pointing to the production API.

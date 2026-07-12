# Design System

## UI Framework
- **Next.js 16** with App Router
- **React 19**
- **Tailwind CSS v4** for styling
- **shadcn/ui** components (built on `@base-ui/react`)
- **next-themes** for dark/light mode
- **sonner** for toast notifications

## Layout
- **Desktop**: Sidebar navigation (7 items) + main content area
- **Mobile**: Bottom navigation bar (5 items) + collapsible header
- **PWA**: Offline support via `@serwist/next`, install prompt component

## Core Pages & Components
| Component | Description |
|-----------|-------------|
| `app-shell.tsx` | Main layout wrapper with sidebar + mobile nav |
| `sidebar.tsx` | Desktop sidebar nav |
| `mobile-nav.tsx` | Mobile bottom nav |
| `camera-capture.tsx` | Mobile camera capture for upload |
| `VoiceInput.tsx` | Speech-to-text input for hands-free data entry |
| `InstallPrompt.tsx` | PWA install banner |
| `PwaStatus.tsx` | Online/offline status indicator |

## Key UI Components (shadcn)
button, card, input, select, badge, table, dialog, label, separator, sonner

# kitsun-obs-overlay

Nuxt 4 + TypeScript MVP for a cross-platform chat overlay (Twitch + YouTube stub).

## Setup

```bash
pnpm install
pnpm dev
```

## Routes

- `/overlay`: OBS browser source overlay
- `/dashboard`: send mock messages
- `GET /api/events`: SSE stream
- `POST /api/mock`: inject mock message

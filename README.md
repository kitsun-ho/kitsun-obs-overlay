# kitsun-obs-overlay

Nuxt 3 SSE overlay demo for Twitch/YouTube chat.

## Run

```bash
pnpm install
pnpm dev
```

## API

- `GET /api/events`: SSE stream for overlay clients.
- `POST /api/events`: publish chat payload.

Example payload:

```json
{
  "platform": "twitch",
  "author": "StreamerBot",
  "message": "Hello from chat"
}
```

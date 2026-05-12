# Tech Stack

## Frontend

| Layer | Technology |
|---|---|
| Framework | Vue 3 (`<script setup>` + Composition API) |
| Language | TypeScript (strict mode) |
| Build tool | Vite |
| Router | Vue Router 5 |
| State | Pinia 3 (Setup Store style) |
| Styles | Tailwind CSS 4 (via `@tailwindcss/vite`) |
| Icons | FontAwesome 7 (`@fortawesome/vue-fontawesome`) |
| i18n | vue-i18n 11 (`legacy: false`) |
| Component dev | Storybook 10 |

## Services

| Service | Purpose |
|---|---|
| OpenAI API | Real-time transcription responses + conversation summarization |
| Firebase Auth | User authentication (login / session management) |
| Firebase Firestore | Persisting conversations and summaries per user |

## Environment Variables

Variables are stored in `.env.local` for local development and configured in **Netlify environment settings** for production.

```bash
# .env.local (never committed)
VITE_OPENAI_API_KEY=sk-...
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=
```

## Deployment

- **Platform:** Netlify
- **CI/CD:** Netlify auto-deploy on push to `main`
- **Environment variables:** set in Netlify site settings (mirrors `.env.local` keys)

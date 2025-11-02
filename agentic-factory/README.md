## Dog Shorts Factory

Generate AI-powered dog shorts via Veo 3.1 and optionally upload them directly to YouTube Shorts.

### Requirements

- Node.js 18+
- Vercel account (for deployment)
- Veo API access & key
- YouTube Data API OAuth credentials with the `youtube.upload` scope

### Environment Variables

Create a `.env.local` (and configure the same keys in Vercel):

```ini
VEO_API_KEY=...
VEO_API_URL=https://generativelanguage.googleapis.com/v1beta
VEO_MODEL=veo-3.1
# optional project/region overrides
VEO_PROJECT_ID=
VEO_LOCATION=

YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REFRESH_TOKEN=...
YOUTUBE_DEFAULT_PRIVACY=unlisted
YOUTUBE_DEFAULT_CATEGORY_ID=22

# set to true to bypass external calls and use mock pipeline
MOCK_PIPELINE=false
```

### Local Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to access the orchestration dashboard.

### Production Build

```bash
npm run lint
npm run build
npm start
```

### Deployment

Deploy with Vercel once environment variables are configured:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-5fc17e83
```

### Features

- Prompt-driven Veo 3.1 video generation tuned for dog content
- Batch execution (up to 10 runs per submission)
- Automatic YouTube uploads with visibility controls and scheduling
- Environment-aware mock mode for local iteration without hitting APIs
- Activity feed with contextual logging for each pipeline run

# Empires of Earth

This is the production web app inside the `claude game` repository.

## Deployment

- Repo root: `C:\Users\caleb\Downloads\claude game`
- App root: `Empires of Earth/`
- Vercel project: `empires-of-earth`
- Production URL: `https://empires-of-earth.vercel.app`

Vercel should build this directory as the project root. If production ever shows the wrong app, check the Vercel project's `Root Directory` setting before debugging gameplay code.

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run party:dev
npm run party:deploy
```

## Notes

- This app is separate from the archived root `src/` app.
- Multiplayer depends on `VITE_PARTYKIT_HOST` being set for this subproject.

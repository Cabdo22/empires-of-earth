# Empires of Earth Workspace

This repository is a multi-project game workspace. The GitHub repo stays rooted at `C:\Users\caleb\Downloads\claude game`, but the production web app is the standalone project in `Empires of Earth/`.

## Production App

- Production frontend: `Empires of Earth/`
- Production deploy target on Vercel: `Empires of Earth/`
- Production branch: `master`
- Production URL: `https://empires-of-earth.vercel.app`

`Empires of Earth/` has its own `package.json`, Vite entrypoint, PartyKit config, and environment settings. Treat it as the source of truth for live gameplay and deployment work.

## Repository Layout

- `Empires of Earth/`
  The active production game.
- `src/` and `party/`
  Archived root app from an older deployment setup. Keep for reference and recovery work, but do not treat it as the production app.
- `Poly+Civ/`
  Older standalone variant.
- `_archive/`
  Historical snapshots and experiments.

## Working Rules

- Make production gameplay changes in `Empires of Earth/`.
- Verify production builds from `Empires of Earth/`, not the repo root.
- Do not assume the root `src/` app is live just because it is at the repo root.
- If Vercel deploy behavior looks wrong, check the project root directory first.

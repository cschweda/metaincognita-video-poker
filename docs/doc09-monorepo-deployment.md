# Doc 09 — Monorepo & Deployment

> **Project:** Video Poker Simulator
> **Purpose:** Project structure, deployment configuration, relationship to the simulator collection

---

## Project Structure

This is a **standalone Nuxt 4 application**, not a monorepo. There are no sub-packages, no shared libraries, no workspace configuration. One repo, one app, one deployment.

```
video-poker-simulator/       ← Git repository root
├── app/                     ← Nuxt application source
├── docs/                    ← Design documents (this 13-doc suite)
├── tests/                   ← Vitest test files
├── nuxt.config.ts
├── package.json
├── netlify.toml
├── .gitignore
├── README.md
└── yarn.lock
```

If a shared component library across the simulator collection becomes valuable in the future (e.g., a shared card rendering component, shared chart library), that would be a separate initiative. For now, each simulator is self-contained.

---

## Deployment

### Target: Netlify (Static)

The application deploys as a static SPA on Netlify. No server-side rendering, no serverless functions, no backend.

```toml
# netlify.toml
[build]
  command = "yarn generate"
  publish = ".output/public"

[build.environment]
  NODE_VERSION = "20"

# SPA fallback — all routes serve index.html
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'none';"
```

### Domain

TBD. Likely `videopoker.[personal-domain]` or a subdomain of the simulator collection if a shared landing page is created.

### Environment Variables

None. This is a static site with no secrets, no API keys, no backend connections.

### Build Pipeline

1. Push to `main` branch
2. Netlify detects push, runs `yarn generate`
3. Static output deployed to CDN
4. HTTPS enforced automatically (Let's Encrypt)

### Preview Deployments

Netlify generates preview URLs for pull requests. Useful for testing phase builds before merging to `main`.

---

## Relationship to the Simulator Collection

The Video Poker Simulator is one of several planned and in-progress casino game simulators:

| Simulator | Status | Stack | Repo |
|-----------|--------|-------|------|
| No-Limit Hold'em | In progress | Nuxt 4 / Nuxt UI v4 / Pinia / Yarn / Netlify | Standalone |
| Craps | In progress (design complete) | Nuxt 4 / Nuxt UI v4 / Pinia / Yarn / Netlify | Standalone |
| Video Poker | Design complete | Nuxt 4 / Nuxt UI v4 / Pinia / Yarn / Netlify | Standalone |
| Blackjack | Future | Same stack | Standalone |
| Roulette | Future | Same stack | Standalone |
| Baccarat | Future | Same stack | Standalone |

All simulators share the same tech stack. All are standalone repos. All deploy independently on Netlify.

### Shared Landing Page (Future)

When 3+ simulators are deployed, a lightweight landing page that links to all of them may be valuable. This would be its own Nuxt app (or a simple static page) with:

- Brief description of each simulator
- Links to each deployed instance
- The "What It Teaches" comparison table from Doc 00

This is not part of the Video Poker Simulator's scope. Noted here for future planning.

### Code Sharing (Not Currently Planned)

The simulators share common patterns (card types, deck shuffling, statistical validation) but not enough to justify a shared library at this scale. Each simulator's card engine is small enough (~100 lines) that duplication is cheaper than abstraction.

If the collection grows to 5+ simulators, consider extracting:
- Card type definitions and deck utilities
- Fisher-Yates shuffle with crypto RNG
- Statistical validation framework (chi-squared test, convergence checker)
- Chart components (bankroll lines, frequency distributions)

For now, copy and adapt as needed. Premature abstraction is worse than a little repetition.

---

## Development Workflow

### Local Development

```bash
yarn install
yarn dev          # Starts Nuxt dev server at localhost:3000
yarn test         # Runs Vitest test suite
yarn generate     # Builds static output for deployment
```

### Git Branching

- `main` — Production. Deploys to Netlify automatically.
- `phase-N` — Phase development branches. Merged to `main` when phase is complete and tested.
- Feature branches off phase branches for specific deliverables if needed.

### Commit Convention

```
Phase N: [brief description]

- Detailed bullet points if needed
```

---

## Why Not a Monorepo?

The simulators share a stack but not code. Each game has its own domain logic, its own UI, its own test suite, and its own deployment. A monorepo would add complexity (workspace configuration, shared dependency management, coordinated deployments) without meaningful benefit at this scale.

If code sharing becomes valuable later, a monorepo migration is straightforward: move repos into a workspace structure, extract shared packages. But don't pay that complexity cost before it's justified.

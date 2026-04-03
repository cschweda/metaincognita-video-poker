# Doc 06 — Security

> **Project:** Video Poker Simulator
> **Threat model:** Client-side SPA with no backend, no authentication, no user data persistence beyond localStorage

---

## Threat Model Summary

This is a purely client-side application deployed as a static site on Netlify. There is no server, no database, no authentication, no API, and no user accounts. The attack surface is minimal compared to server-backed applications like A11yDash or the ResearchHub migration tools.

The primary security concerns are:

1. **RNG integrity** — The game's educational value depends on fair, unpredictable card deals
2. **Client-side code integrity** — Ensuring the deployed code hasn't been tampered with
3. **Dependency supply chain** — Third-party packages introducing vulnerabilities
4. **Content Security Policy** — Preventing injection attacks on the static site

---

## RNG Integrity

### Requirement

The card shuffle must be cryptographically unpredictable. Players must not be able to predict, influence, or reconstruct the deck order. While this is a training tool (not a real-money game), the educational value depends on the cards being genuinely random — otherwise the training data is meaningless.

### Implementation

**Use `crypto.getRandomValues()` for all randomness.** Do not use `Math.random()`, which is not cryptographically secure and can be predicted if the seed is known.

```typescript
// Fisher-Yates shuffle with crypto-grade randomness
function shuffle(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomBuffer = new Uint32Array(1)
    crypto.getRandomValues(randomBuffer)
    const j = randomBuffer[0] % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
```

**Modulo bias note:** The `% (i + 1)` operation introduces a tiny modulo bias when `(i + 1)` doesn't evenly divide 2^32. For a 52-card deck, the maximum bias is ~0.000000012% per swap — statistically negligible for a training simulator. If paranoid, use rejection sampling:

```typescript
const max = Math.floor(0xFFFFFFFF / (i + 1)) * (i + 1)
let j: number
do {
  crypto.getRandomValues(randomBuffer)
  j = randomBuffer[0]
} while (j >= max)
j = j % (i + 1)
```

**Validation:** The statistical validation suite (Phase 4) proves the shuffle is uniform by dealing 1M+ hands and verifying hand frequencies match theoretical probabilities within chi-squared tolerance.

### What This Does NOT Protect Against

- A determined user can inspect the JavaScript source and see the dealt hand before it renders. This is inherent to any client-side game. For a training tool, this is acceptable — cheating only cheats yourself.
- Browser extensions or DevTools can modify game state. Same caveat.

---

## Content Security Policy

Netlify deployment should include strict CSP headers via `netlify.toml` or `_headers` file:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'none';
```

**Notes:**
- `'unsafe-inline'` for scripts is required by Nuxt's client-side hydration. If Nuxt 4 supports nonce-based CSP, prefer that.
- `frame-ancestors 'none'` prevents clickjacking
- `form-action 'none'` — there are no forms in this application
- `connect-src 'self'` — no external API calls

Additional headers:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## Dependency Supply Chain

### Mitigation

- **Lockfile integrity:** `yarn.lock` pins exact dependency versions. Verify lockfile hasn't been tampered with on CI.
- **Minimal dependencies:** The project's computational core (deck, shuffle, classifier, EV calculator) uses zero third-party packages. Only the UI layer (Nuxt, Nuxt UI, Pinia) and build tools have external dependencies.
- **Audit:** Run `yarn audit` regularly. Address critical/high vulnerabilities before deployment.
- **No CDN scripts:** All JavaScript is bundled at build time. No external script tags, no CDN loads at runtime.

---

## Data Storage

### localStorage Usage

The only persistent data is:
- Machine Scout high scores
- Hand Category Trainer progress
- User preferences (speed, denomination, variant selection)

This data has no security sensitivity. It's convenience data that improves UX between sessions.

**No PII is collected, stored, or transmitted.** No analytics, no tracking, no cookies (beyond what Netlify's CDN may set), no telemetry.

---

## Build & Deployment Security

- **Netlify deployment:** Triggered from a Git branch. Only the `main` branch deploys to production.
- **Environment variables:** None required. This is a static site with no secrets.
- **Build output:** Static HTML/JS/CSS only. No server-side code, no serverless functions, no API endpoints.
- **HTTPS:** Enforced by Netlify with automatic Let's Encrypt certificates.

---

## Security Checklist

- [ ] Shuffle uses `crypto.getRandomValues()`, not `Math.random()`
- [ ] CSP headers configured in Netlify deployment
- [ ] `X-Frame-Options: DENY` set
- [ ] No external script tags in HTML
- [ ] `yarn audit` shows zero critical/high vulnerabilities
- [ ] No environment variables or secrets in the build
- [ ] HTTPS enforced
- [ ] No PII collected or stored

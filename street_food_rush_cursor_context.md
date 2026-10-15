# Street Food Rush — Product & Engineering Context

## Purpose

Use this document as the source of truth for building **Street Food Rush**, a mobile-first cooking game distributed inside the Lagos Life Games app through the official Vatar developer platform.

This project replaces the earlier standalone social-network concept. It must use only documented Vatar developer capabilities and comply with the Vatar Developer Agreement.

## 1. Product concept

The player runs a busy Lagos street-food stand during short, increasingly difficult shifts. Customers place orders, and the player taps ingredients and cooking stations in the correct sequence before customer patience expires.

The experience should be:

- Easy to understand within seconds.
- Designed for portrait touch screens.
- Playable in 60–90 second sessions.
- Energetic, humorous and recognizably Nigerian.
- Replayable through scores, combos, daily challenges and leaderboards.
- Fair without requiring purchases.

## 2. Why this product

The Lagos Life Games catalog currently includes:

- Lagos Life originals: 8-Ball Pool, Ayo Olopon, Whot!, Ludo and Chess.
- Creator games: Maruwa Drive, Landlord and Naija Farmer.

The visible creator catalog leaves room for a polished cooking/time-management game. Street Food Rush is differentiated from the existing driving, property, farming and board-game experiences while retaining a strong local theme.

This is still a hypothesis. Validate it with a playable vertical slice and player feedback before building extensive progression or monetization.

## 3. Core game loop

1. A customer arrives with a visible food order.
2. The player taps the required ingredients or stations in order.
3. A completed order awards points based on accuracy, remaining patience and combo.
4. A wrong ingredient reduces patience and breaks the combo.
5. Customer volume and recipe complexity increase during the shift.
6. The shift ends after 90 seconds.
7. The result screen shows score, orders served, accuracy, best combo, personal best and leaderboard position.

## 4. MVP scope

### Include

- One Lagos roadside food stand.
- Three dishes:
  - Jollof rice with chicken.
  - Suya with onions.
  - Amala with ewedu.
- A small shared set of ingredients and preparation stations.
- Customer queue with visible orders and patience bars.
- Tap-based order preparation.
- Ninety-second shifts.
- Score, accuracy and combo calculation.
- Increasing difficulty during a shift.
- Start, pause/resume, result and retry states.
- Sound controls, with audio beginning only after player interaction.
- Vatar player display name and avatar.
- Vatar leaderboard submission and display.
- Responsive portrait presentation at 375 × 812.
- Basic event logging without personal data.

### Explicitly out of scope

- Real Lagos Life balances, jobs, inventory, contacts, usernames or CV data.
- Standalone authentication or player accounts.
- Scraping or undocumented Lagos Life APIs.
- Multiplayer cook-offs.
- Real-time chat.
- User-generated content.
- Multiple locations or a large campaign.
- External payments, ads or payment links.
- Real-money prizes, gambling or cash-out.
- Pay-to-win boosts.

## 5. Progression after MVP

Add only after the core loop demonstrates retention:

- Daily challenges.
- Additional recipes and customer types.
- New kitchens such as a Surulere buka, Lekki food truck and Victoria Island restaurant.
- Cosmetic counters, utensils and chef outfits.
- Permanent recipe or location packs through `Vatar.purchase`.
- Seasonal leaderboards.
- Approved 1v1 cook-offs using Vatar matches.

Do not build these before the first playable version is validated.

## 6. Official Vatar integration

Official documentation:

- Developer overview: https://lagoslife.app/developers
- Documentation: https://lagoslife.app/developers/docs
- Test keys: https://lagoslife.app/developers/keys
- Developer Agreement: https://lagoslife.app/developers/agreement

### Permitted player data

`Vatar.init()` provides:

- A pseudonymous player ID unique to this game.
- Display name.
- Small avatar image or `null`.
- A signed session token valid for 15 minutes.
- Test or live mode.

Never attempt to obtain or infer Lagos Life usernames, email addresses, phone numbers, location, balances, platform IDs or data from another game.

### SDK capabilities needed for MVP

- `Vatar.init()` for initialization and player presentation.
- `Vatar.submitScore(score)` for the player's best score.
- `Vatar.leaderboard()` for rankings.
- `Vatar.onPause()` and `Vatar.onResume()` for lifecycle handling.
- `Vatar.session()` only when calling our server.

### Integration boundary

Wrap the browser SDK behind a small `VatarPlatform` interface. Game rules must not depend directly on global SDK calls.

Use:

- The real SDK only inside Lagos Life or its sandbox.
- A local standalone adapter for ordinary gameplay development that has no real player data.
- Test fakes only in automated tests.

The local adapter must never pretend to be a verified Lagos Life session.

### Purchases

Purchases are not part of the gameplay MVP. If the review checklist requires a test product, use one permanent cosmetic product such as an Ankara counter theme.

Before any live purchase:

- Configure the product in the Vatar dashboard.
- Call `Vatar.purchase(productId)` only from the framed client.
- Verify the fresh player session on our server.
- Retrieve the purchase from the Vatar server API.
- Confirm the purchase belongs to that player and this game.
- Grant it exactly once using the purchase ID as the idempotency key.
- Mark it delivered through the Vatar API.

Never trust a client-side paid result by itself.

## 7. Technical direction

The game is a Vite and TypeScript app. Phaser draws the stand. HTML overlays handle the menu, tutorial, orders, pause and results so the controls stay accessible.

The review checklist requires a server-verified test purchase. The cosmetic Ankara counter is verified by a small Node server and stored in a JSON file. There is no database in this MVP.

Stack:

- Vite and TypeScript.
- Phaser 3 for the stand scene.
- DOM overlays for onboarding, the order HUD and results.
- Node.js, Zod and a file-based entitlement store for purchase verification.
- Vitest for rules, adapters and the purchase server.
- Playwright for the mobile and desktop shift flow.

```text
src/
  core/
  game/
  platform/
  ui/
  app.ts
  main.ts
shared/
server/
tests/
e2e/
public/
review/
```

## 8. Gameplay rules

- A shift lasts 90 seconds.
- Begin with one customer slot and introduce additional pressure over time.
- Each recipe is an ordered sequence of actions.
- Base points are awarded per completed order.
- Remaining patience contributes a speed bonus.
- Consecutive correct orders increase a capped combo multiplier.
- Any incorrect action breaks the combo and reduces the active customer's patience.
- An abandoned customer gives no points.
- Final score must be a non-negative whole number before submission.

Store recipe definitions as data rather than hard-coding them into scenes.

## 9. Security and platform requirements

- Keep all Vatar secret and webhook keys server-side.
- Never commit secrets or place them in Vite client environment variables.
- Validate sessions using `POST /api/games/v1/session/verify`.
- Verify purchase ownership and status server-side.
- Verify webhook signatures against the raw request body using constant-time comparison.
- Deduplicate webhook deliveries and purchase grants.
- Apply timeouts and bounded retries to Vatar API calls.
- Never log secrets or full session tokens.
- Delete player data when required by Vatar or when the game is removed.
- Comply with the Nigeria Data Protection Act 2023.
- Do not fingerprint, track or profile players.

The hosted game must:

- Use HTTPS.
- Permit framing only from the documented Vatar/Lagos Life origins.
- Avoid incompatible `X-Frame-Options` headers.
- Work without third-party cookies.
- Handle pause and resume correctly.
- Avoid camera, microphone, location, clipboard, download and popup dependencies.

## 10. Developer onboarding

1. Build and deploy a minimal HTTPS placeholder.
2. Add the documented `frame-ancestors` Content Security Policy.
3. Sign in to Lagos Life and submit the developer key form.
4. Store the one-time test credentials securely.
5. Load the official hosted SDK; do not copy it locally.
6. Open the game through the Vatar sandbox.
7. Confirm initialization, pause/resume and leaderboard behavior.
8. Complete any required test-purchase flow with server verification.
9. Add the icon, screenshots and listing descriptions.
10. Submit for review.

Live credentials are issued only after approval. Test and live data must remain strictly separated.

## 11. Implementation phases

### Phase 0 — Foundation

- Initialize an independent Git repository for this project.
- Scaffold Vite, TypeScript and Phaser.
- Add formatting, linting, tests and environment validation.
- Configure the portrait canvas and responsive shell.
- Deploy a minimal HTTPS build.
- Obtain Vatar test keys and confirm sandbox initialization.

### Phase 1 — Playable vertical slice

- Implement one customer and one recipe.
- Add ingredient taps, patience, timer, score and result screen.
- Add deterministic unit tests for recipe and scoring rules.
- Verify the complete loop at 375 × 812 using touch controls.

### Phase 2 — MVP content

- Add all three recipes.
- Add customer variation, combos and difficulty progression.
- Add animation, sound, tutorial and accessibility feedback.
- Add local personal-best behavior for development only.

### Phase 3 — Platform integration

- Display the permitted Vatar player identity.
- Submit scores and show the leaderboard.
- Handle signed-out, timeout, rate-limit and unavailable states.
- Handle pause/resume and reload safely.
- Add the server-side purchase verification flow only if required.

### Phase 4 — Review readiness

- Complete sandbox and integration checklists.
- Add privacy information and support contact.
- Test slow mobile networks and common phone dimensions.
- Produce the icon, screenshots and descriptions.
- Validate every item in Vatar's review checklist.
- Submit for review.

## 12. Acceptance criteria for the first vertical slice

- A player can start and finish a 90-second shift.
- Customers present understandable orders.
- Correct and incorrect inputs produce immediate feedback.
- Score and combo calculations are deterministic and tested.
- The game remains usable at 375 × 812.
- Pausing prevents the timer and audio from continuing.
- The result screen supports retry without reloading.
- No Vatar secret or private player data exists in client code.

## 13. Instructions for Cursor

- Inspect the repository before implementing.
- Work incrementally and keep files focused.
- Prefer a tested vertical slice over broad scaffolding.
- Follow the official Vatar documentation; do not invent endpoints or fields.
- Keep game rules separate from rendering.
- Keep the Vatar SDK behind the platform adapter.
- Use fake player or purchase data only in automated tests.
- Do not add production monetization before gameplay validation.
- Keep this document updated when product decisions change.

### Current build

The playable MVP is in this repository. Practice mode runs without Lagos Life. The purchase server is included because review requires a verified test delivery, and it uses a JSON file rather than a database. Test keys, the sandbox session and store submission still have to be completed by the developer account owner.

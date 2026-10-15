# Vatar review checklist

Local checks are marked from this repository. Sandbox and store submission stay with the person who owns the Vatar developer account.

- [x] Portrait layout at 375 × 812, with touch controls and no hover-only actions.
- [x] `frame-ancestors` allows only the documented Vatar origins in `vercel.json`. Development also allows this site.
- [x] No `X-Frame-Options: DENY` or `SAMEORIGIN`.
- [x] Sound starts after the first tap. Pause and resume stop the timer and suspend sound.
- [x] Direct play uses practice mode when the SDK is missing, unsigned, timed out or rate limited.
- [x] Score submission and leaderboard go through the SDK adapter. The local best is labeled practice mode.
- [x] Cosmetic product `ankara_counter` is verified on the server, granted once per purchase id, then marked delivered.
- [x] Webhook signatures are checked in constant time. A webhook does not grant an item by itself.
- [x] Secrets stay in server environment variables. The client source has no secret key.
- [x] No login, personal-data form, outside payment, ad, gambling or cash-out.
- [x] Privacy and support pages are published with the game.
- [ ] Deploy the HTTPS build and confirm the frame header on that origin. (`dist/` is built; use Vercel/Netlify/Cloudflare — configs in repo.)
- [ ] Submit the developer key form while signed in to Lagos Life: https://lagoslife.app/developers/keys
- [ ] Store the one-time test secret and webhook signing secret outside the repository.
- [ ] Add the Ankara counter in the Vatar dashboard with the id `ankara_counter`.
- [ ] Open the sandbox and confirm init, pause, score, leaderboard and a test purchase.
- [x] Upload assets prepared: `review/icon-512.png`, `review/screenshots/01–05-*.png`, copy in `review/listing.md` and `review/SUBMISSION-PACKET.md`.
- [ ] Submit the game for review from the Vatar dashboard.

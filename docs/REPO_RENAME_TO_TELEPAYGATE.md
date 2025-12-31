# Repository rename: telepaygate (short-form rename + action checklist)

This pull request renames short-form and long-form instances of the project name across the repository to `telepaygate`.

Summary of changes included in this branch / repo:

- Replace `telegram-payment-gateway` -> `telepaygate` (root package name, docs, docs links, render, README)
- Replace short-form `tg-payment-gateway` -> `telepaygate` for docker tags, docs, Discord and support contact.

Files touched (high-level):

- `package.json` / `package-lock.json` (root package name, docker build tag)
- Docs: `README.md`, `docs/*` (multiple docs updated to point to telepaygate URLs/links)
- Helper scripts and deployment templates updated where safe (examples and docs only)

Important external actions you will need to perform AFTER this merge:

1. Rename the GitHub repository (owner: toxzak-svg) from `TelePayGate` to `telepaygate` so that URLs match the repository and docs.
   - GitHub will maintain redirects but it's best to confirm branch protection rules, webhooks, and any CI configuration referencing the old repo name.

2. Update Render / hosting service configuration
   - If you're using Render.com (or other hosting) with service names or service manifests referencing `telegram-payment-gateway`, update those service names to `telepaygate` (or confirm the existing redirect behavior).
   - Check `render.yaml` to update service names if you want the internal names to match the new project name.

3. Update DNS and email/service endpoints
   - If you host `telegram-payment-gateway.onrender.com` or `support@tg-payment-gateway.com`, update DNS records and mail routing to point at the new `telepaygate` hostnames/email addresses or add appropriate forwarding rules.

4. Update inbound webhooks / Telegram Bot settings
   - If any existing webhook endpoints, Telegram bot webhooks, or third-party integrations use the old repository name or hostname, update them to the new hostname or confirm URL redirection works.

5. External references
   - Update README and docs that link to the old GitHub repo URL (e.g., project websites, social profiles, README badges).
   - Update any CI or deployment configuration stored outside the repo (like CI secrets referencing repo name) to avoid surprises.

6. Communication plan
   - Announce the rename to your contributors and users (docs, README top note) so they update remote URLs in local clones if needed.

Notes and scope
- These changes are limited to repository content (code, docs, and examples). They do not change environment variable names or database identifiers that are intentionally stable.
- If you'd like a follow-up pass to rename all `tg-payment-*` internal service IDs (e.g., `tg-payment-db`) to `telepaygate-*` also in deployment manifests, I can do that—but note deployments will need to be updated accordingly.

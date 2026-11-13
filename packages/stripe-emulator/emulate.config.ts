import { execFileSync } from "node:child_process";

import "varlock/auto-load";

// The emulator listens where the app's STRIPE_API_URL points, and its checkout page links back to that address.
const api = new URL(process.env.STRIPE_API_URL ?? "");

// portless picks the app's address, which depends on the checkout (a worktree gets its own prefix).
// oxlint-disable-next-line sonarjs/no-os-command-from-path -- dev-only script; portless is a pinned devDependency that pnpm puts first on PATH.
const appUrl = execFileSync("portless", ["get", "garage-comics"], {
  encoding: "utf-8",
}).trim();

export default {
  stripe: {
    port: Number(api.port),
    baseUrl: api.origin,
    webhooks: [
      {
        url: `${appUrl}/api/stripe/webhook`,
        events: ["checkout.session.completed"],
        secret: process.env.STRIPE_WEBHOOK_SECRET,
      },
    ],
  },
};

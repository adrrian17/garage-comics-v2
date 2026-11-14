// oxlint-disable sonarjs/no-wildcard-import -- Alchemy and Effect modules are used as namespaces.
import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Alchemy from "alchemy";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import "varlock/auto-load";
// oxlint-enable sonarjs/no-wildcard-import

export const db = Cloudflare.D1.Database("database", {
  migrations: "../../packages/db/src/migrations",
});

// Under `alchemy dev` this writes each message as an .eml file to .alchemy/local/email.
const email = Cloudflare.Email.SendEmail("EMAIL");

// Set by portless in `pnpm dev`; unset on deploy.
const portlessUrl = process.env.PORTLESS_URL;

export const web = Cloudflare.Website.Vite("web", {
  rootDir: "../../apps/web",
  env: {
    DB: db,
    BETTER_AUTH_SECRET: Config.Redacted("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: portlessUrl ?? Cloudflare.Worker.URL,
    ADMIN_EMAIL: Config.String("ADMIN_EMAIL"),
    EMAIL_FROM: Config.String("EMAIL_FROM"),
    STRIPE_SECRET_KEY: Config.Redacted("STRIPE_SECRET_KEY"),
    STRIPE_PUBLISHABLE_KEY: Config.String("STRIPE_PUBLISHABLE_KEY"),
    STRIPE_WEBHOOK_SECRET: Config.Redacted("STRIPE_WEBHOOK_SECRET"),
    // Empty outside development, where the Stripe SDK talks to Stripe itself.
    STRIPE_API_URL: Config.String("STRIPE_API_URL").pipe(
      Config.withDefault("")
    ),
    EMAIL: email,
  },
  dev: {
    // portless assigns the port; see the dev script in package.json.
    port: Number(process.env.PORT),
    strictPort: true,
  },
});

export type WebEnv = Cloudflare.InferEnv<typeof web>;

export default Alchemy.Stack(
  "garage-comics",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* deployStack() {
    const webWorker = yield* web;

    return {
      web: webWorker.url,
    };
  })
);

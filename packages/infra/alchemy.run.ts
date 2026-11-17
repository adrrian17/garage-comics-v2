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

// Browsers PUT file parts straight to this bucket through presigned URLs, so it allows any origin: the signature is the credential.
const comics = Cloudflare.R2.Bucket("comics", {
  cors: [
    {
      allowedMethods: ["GET", "PUT"],
      allowedOrigins: ["*"],
      allowedHeaders: ["content-type"],
      exposeHeaders: ["etag"],
    },
  ],
  lifecycleRules: [
    {
      id: "abort-stale-uploads",
      abortMultipartUploadsTransition: {
        condition: { type: "Age", maxAge: 60 * 60 * 24 },
      },
    },
  ],
});

// Watermarked copies and nothing else, so its delete rule can never reach an original, which lives in `comics`.
// A Download Link's 24 hours are enforced in D1; this rule only cleans up, and R2 may run it up to a day late.
const downloads = Cloudflare.R2.Bucket("downloads", {
  lifecycleRules: [
    {
      id: "delete-copies-after-a-day",
      deleteObjectsTransition: {
        condition: { type: "Age", maxAge: 60 * 60 * 24 },
      },
    },
  ],
});

/**
 * What the Watermarker Durable Object answers over RPC. The class in apps/web/src/server/watermarker.ts implements it.
 * Declared here, not taken from the class: typing the binding with the class makes `Cloudflare.Env` depend on itself,
 * which silently turns other bindings into `any`.
 */
export interface WatermarkerRpc {
  prepare: (downloadLinkId: string) => Promise<void>;
}

// Stamps the Customer's email and Order Number on every page (containers/watermarker). Its class is exported from apps/web/src/server.ts.
const watermarker = Cloudflare.Container<WatermarkerRpc>("Watermarker", {
  context: "../../containers/watermarker",
  className: "Watermarker",
  instanceType: "standard-1",
  // One container per Download Link being prepared; more Links than this wait for a slot, and their alarm retries.
  maxInstances: 5,
});

// Under `alchemy dev` this writes each message as an .eml file to .alchemy/local/email.
const email = Cloudflare.Email.SendEmail("EMAIL");

// Set by portless in `pnpm dev`; unset on deploy.
const portlessUrl = process.env.PORTLESS_URL;

export const web = Cloudflare.Website.Vite("web", {
  rootDir: "../../apps/web",
  // Names the entry that exports the Watermarker class next to Start's handler, instead of relying on Start's virtual entry to re-export it.
  main: "src/server.ts",
  compatibility: {
    // Pending I/O (a container call of minutes for a 500 MB PDF) keeps a Durable Object alive. A flag, not a newer
    // compatibility date, which would change every other runtime behaviour of the app at once.
    flags: ["durable_object_io_tasks_prevent_eviction"],
  },
  env: {
    DB: db,
    BETTER_AUTH_SECRET: Config.Redacted("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: portlessUrl ?? Cloudflare.Worker.URL,
    ADMIN_EMAIL: Config.String("ADMIN_EMAIL"),
    EMAIL_FROM: Config.String("EMAIL_FROM"),
    STRIPE_SECRET_KEY: Config.Redacted("STRIPE_SECRET_KEY"),
    STRIPE_PUBLISHABLE_KEY: Config.String("STRIPE_PUBLISHABLE_KEY"),
    STRIPE_WEBHOOK_SECRET: Config.Redacted("STRIPE_WEBHOOK_SECRET"),
    STRIPE_CONNECT_WEBHOOK_SECRET: Config.Redacted(
      "STRIPE_CONNECT_WEBHOOK_SECRET"
    ),
    // Empty outside development, where the Stripe SDK talks to Stripe itself.
    STRIPE_API_URL: Config.String("STRIPE_API_URL").pipe(
      Config.withDefault("")
    ),
    EMAIL: email,
    COMICS: comics,
    COMICS_S3: Cloudflare.R2.S3Credentials(comics, { access: "read-write" }),
    DOWNLOADS: downloads,
    WATERMARKER: watermarker,
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

// oxlint-disable sonarjs/no-wildcard-import -- Alchemy and Effect modules are used as namespaces.
import * as Cloudflare from "@alchemy.run/cloudflare";
import * as GitHub from "@alchemy.run/github";
import * as Stripe from "@alchemy.run/stripe";
import * as Alchemy from "alchemy";
import { AlchemyContext } from "alchemy/AlchemyContext";
import * as Output from "alchemy/Output";
import { Stage } from "alchemy/Stage";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import type * as Redacted from "effect/Redacted";
import "varlock/auto-load";
// oxlint-enable sonarjs/no-wildcard-import

// A PR preview's files are disposable, so destroying it may empty its buckets; every other stage keeps R2's refusal to
// delete a bucket that still holds objects. Read from the stage Alchemy resolved (--stage, then $ALCHEMY_STAGE), so the
// flag saved with the bucket always matches the stage it belongs to.
const bucketProps = (props: Cloudflare.R2.BucketProps) =>
  Effect.gen(function* withForceDestroy() {
    const stage = yield* Stage;

    return { ...props, forceDestroy: /^pr-\d+$/u.test(stage) };
  });

export const db = Cloudflare.D1.Database("database", {
  migrations: "../../packages/db/src/migrations",
});

// Browsers PUT file parts straight to this bucket through presigned URLs, so it allows any origin: the signature is the credential.
const comics = Cloudflare.R2.Bucket(
  "comics",
  bucketProps({
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
  })
);

// A Download Link's 24 hours are enforced in D1; this rule only cleans up, and R2 may run it up to a day late.
const downloads = Cloudflare.R2.Bucket(
  "downloads",
  bucketProps({
    lifecycleRules: [
      {
        id: "delete-copies-after-a-day",
        deleteObjectsTransition: {
          condition: { type: "Age", maxAge: 60 * 60 * 24 },
        },
      },
    ],
  })
);

/**
 * What the Watermarker Durable Object answers over RPC. The class in apps/web/src/server/watermarker.ts implements it.
 * Declared here, not taken from the class: typing the binding with the class makes `Cloudflare.Env` depend on itself,
 * which silently turns other bindings into `any`.
 */
export interface WatermarkerRpc {
  prepare: (downloadLinkId: string) => Promise<void>;
}

const watermarker = Cloudflare.Container<WatermarkerRpc>("Watermarker", {
  context: "../../containers/watermarker",
  className: "Watermarker",
  instanceType: "standard-1",
  maxInstances: 5,
});

// Under `alchemy dev` this writes each message as an .eml file to .alchemy/local/email.
const email = Cloudflare.Email.SendEmail("EMAIL");

// Set by portless in `pnpm dev`; unset on deploy.
const portlessUrl = process.env.PORTLESS_URL;

// Every event `routeCheckoutEvent` (apps/web/src/lib/stripe-events.ts) handles; Stripe never sends the rest.
const checkoutEvents = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
];

// Stripe returns a signing secret only when it creates an endpoint; one missing from state can never be recovered, so
// the deploy fails instead of uploading an empty secret. See "Stripe webhooks" in docs/agents/deployment.md.
const requireSecret =
  (endpointId: string) => (secret: Redacted.Redacted | undefined) => {
    if (secret === undefined) {
      throw new Error(
        `Stripe endpoint "${endpointId}" has no signing secret in state. Delete it in Stripe and rename it in alchemy.run.ts.`
      );
    }

    return secret;
  };

/**
 * The Worker's script name on a deployed stage, and the Stripe webhook signing secrets it verifies deliveries with.
 *
 * A deployed stage names its Worker after the stage, so its workers.dev URL is known before the Worker exists. Its two
 * Stripe endpoints are created from that URL first and their secrets go into the Worker's env like any other value.
 * Endpoints built from the Worker's own `url` would need the secrets bound back afterwards, and Alchemy uploads the
 * Worker before that binding resolves, leaving both secrets empty. Stripe only delivers to public URLs, so `alchemy dev`
 * creates no endpoints and reads both secrets from .env.
 */
const deployedWorker = Effect.gen(function* deployedWorker() {
  const alchemyContext = yield* Effect.serviceOption(AlchemyContext);

  if (Option.isSome(alchemyContext) && alchemyContext.value.dev) {
    return {
      name: null,
      STRIPE_WEBHOOK_SECRET: Output.literal(
        yield* Config.Redacted("STRIPE_WEBHOOK_SECRET")
      ),
      STRIPE_CONNECT_WEBHOOK_SECRET: Output.literal(
        yield* Config.Redacted("STRIPE_CONNECT_WEBHOOK_SECRET")
      ),
    };
  }

  const name = `garage-comics-web-${yield* Stage}`;
  // Alchemy reads the same variable to build the Worker's URL, so both agree.
  const subdomain = yield* Config.String("CLOUDFLARE_WORKERS_SUBDOMAIN");
  const url = `https://${name}.${subdomain}.workers.dev`;

  const webhook = yield* Stripe.WebhookEndpoint("checkout-webhook", {
    url: `${url}/api/stripe/webhook`,
    description: "Garage Cómics: pagos de Compras e Inscripciones",
    enabledEvents: checkoutEvents,
  });

  const connectWebhookId = "connect-webhook";

  const connectWebhook = yield* Stripe.WebhookEndpoint(connectWebhookId, {
    url: `${url}/api/stripe/connect-webhook`,
    description: "Garage Cómics: cuentas de Autores",
    enabledEvents: ["account.updated"],
    connect: true,
  });

  return {
    name,
    STRIPE_WEBHOOK_SECRET: Output.map(requireSecret("checkout-webhook"))(
      webhook.secret
    ),
    STRIPE_CONNECT_WEBHOOK_SECRET: Output.map(requireSecret(connectWebhookId))(
      connectWebhook.secret
    ),
  };
}).pipe(Effect.orDie);

export const web = Cloudflare.Website.Vite(
  "web",
  deployedWorker.pipe(
    Effect.map(
      ({ name, STRIPE_WEBHOOK_SECRET, STRIPE_CONNECT_WEBHOOK_SECRET }) => ({
        // Unset under `alchemy dev`, which runs the Worker locally.
        name: Output.literal(name ?? undefined),
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
          STRIPE_WEBHOOK_SECRET,
          STRIPE_CONNECT_WEBHOOK_SECRET,
          // Empty outside development, where the Stripe SDK talks to Stripe itself.
          STRIPE_API_URL: Config.String("STRIPE_API_URL").pipe(
            Config.withDefault("")
          ),
          EMAIL: email,
          COMICS: comics,
          COMICS_S3: Cloudflare.R2.S3Credentials(comics, {
            access: "read-write",
          }),
          DOWNLOADS: downloads,
          WATERMARKER: watermarker,
        },
        dev: {
          // portless assigns the port; see the dev script in package.json.
          port: Number(process.env.PORT),
          strictPort: true,
        },
      })
    )
  )
);

export type WebEnv = Cloudflare.InferEnv<typeof web>;

export default Alchemy.Stack(
  "garage-comics",
  {
    // Stripe.providers() provides its own credentials from STRIPE_API_KEY, which no sibling layer can replace, so the
    // workflows set it to the app's STRIPE_SECRET_KEY. Credentials resolve lazily, so `alchemy dev` needs no key.
    providers: Layer.mergeAll(
      Cloudflare.providers(),
      GitHub.providers(),
      Stripe.providers()
    ),
    state: Cloudflare.state(),
  },
  Effect.gen(function* deployStack() {
    const webWorker = yield* web;

    // Set only in GitHub Actions; `pr` only when the workflow passes PULL_REQUEST.
    const github = yield* GitHub.GitHubEnv;

    if (github?.pr !== undefined) {
      yield* GitHub.Comment("preview-comment", {
        owner: github.owner,
        repository: github.repository,
        issueNumber: github.pr,
        // Destroying the preview stage removes the comment with it.
        allowDelete: true,
        body: Output.interpolate`
          ## Preview

          **Web:** ${webWorker.url}

          Commit \`${(process.env.PR_HEAD_SHA ?? github.sha).slice(0, 7)}\`

          _Este comentario se actualiza con cada push._
        `,
      });
    }

    return {
      web: webWorker.url,
    };
  })
);

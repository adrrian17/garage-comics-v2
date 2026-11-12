# One TanStack Start app on Cloudflare

Garage Cómics runs entirely on Cloudflare (Workers, D1, R2, Cloudflare Email Service), provisioned with Alchemy, as a single TanStack Start app deployed as one Worker. We chose Cloudflare to keep the store on one managed platform with no servers to operate, accepting lock-in to D1 and Workers' runtime limits. The Helios base this repo started from split the product into a TanStack Router SPA and a Hono + oRPC API Worker; we replace both with TanStack Start because public pages need server rendering for SEO, and one Worker keeps the session on one origin with no CORS between web and API.

## Consequences

- Pages, server functions and Stripe webhooks live in one app; Hono, oRPC and `apps/server` go away.
- Comic PDFs and covers live in R2. PDFs of up to 500 MB are uploaded straight to R2, since Worker request bodies are capped at 100 MB.
- Watermarking runs in a Cloudflare Container with qpdf, the one piece outside the Worker: a Worker's 128 MB of memory cannot hold a 500 MB PDF. That adds a Docker image, cold starts and separate billing.
- Sending email to arbitrary addresses needs the Workers Paid plan and a verified sender domain.

import type { WebEnv } from "@garage-comics/infra/alchemy.run";

// Infers the cloudflare:workers env types from the Alchemy Worker.
// @see https://alchemy.run/cloudflare/compute/workers

declare global {
  type Env = WebEnv;
}

declare module "cloudflare:workers" {
  namespace Cloudflare {
    // oxlint-disable-next-line typescript/no-empty-interface, typescript/no-empty-object-type -- module augmentation needs an interface to merge into.
    export interface Env extends WebEnv {}
  }
}

import type { WebEnv } from "@garage-comics/infra/alchemy.run";

import type { Watermarker } from "./src/server/watermarker";

// Infers the cloudflare:workers env types from the Alchemy Worker.
// @see https://alchemy.run/cloudflare/compute/workers
//
// WATERMARKER is typed here instead of in infra: the class lives in this app, and infra importing it while this app imports infra's types would be a cycle.
type AppEnv = Omit<WebEnv, "WATERMARKER"> & {
  WATERMARKER: DurableObjectNamespace<Watermarker>;
};

declare global {
  // oxlint-disable-next-line typescript/no-empty-interface, typescript/no-empty-object-type -- the global Env names the same bindings as cloudflare:workers' Env.
  interface Env extends AppEnv {}
}

declare module "cloudflare:workers" {
  namespace Cloudflare {
    // oxlint-disable-next-line typescript/no-empty-interface, typescript/no-empty-object-type -- module augmentation needs an interface to merge into.
    export interface Env extends AppEnv {}
  }
}

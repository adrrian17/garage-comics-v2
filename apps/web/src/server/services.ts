import { createAuth as createConfiguredAuth } from "@garage-comics/auth";
import { createDb } from "@garage-comics/db";
import { env } from "cloudflare:workers";

export const createAuth = () => createConfiguredAuth(env, createDb(env));

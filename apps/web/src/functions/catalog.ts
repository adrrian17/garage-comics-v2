import { createServerFn } from "@tanstack/react-start";

import { sellableComics } from "@/server/catalog";
import { createDatabase } from "@/server/services";

export const getCatalog = createServerFn({ method: "GET" }).handler(
  async () => await sellableComics(createDatabase(), new Date())
);

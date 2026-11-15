import { createFileRoute } from "@tanstack/react-router";

import { AuthorComics } from "@/components/author-comics";
import { getMyComics } from "@/functions/comics";

const ComicsPage = () => <AuthorComics data={Route.useLoaderData()} />;

export const Route = createFileRoute("/autor/comics")({
  loader: async () => await getMyComics(),
  head: () => ({ meta: [{ title: "Mis cómics · Garage Cómics" }] }),
  component: ComicsPage,
});

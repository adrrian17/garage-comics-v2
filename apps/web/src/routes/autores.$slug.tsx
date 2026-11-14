import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@garage-comics/ui/components/empty";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { getAuthorPage } from "@/functions/authors";
import { initials, isBlankProfile } from "@/lib/author";

const BIO_DESCRIPTION_LENGTH = 160;

const AuthorPage = () => {
  const author = Route.useLoaderData();

  const links = [
    { label: "Instagram", href: author.instagramUrl },
    { label: "X", href: author.xUrl },
    { label: "Facebook", href: author.facebookUrl },
    { label: "Portafolio", href: author.portfolioUrl },
  ].flatMap(({ label, href }) => (href === null ? [] : [{ label, href }]));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <header className="flex items-center gap-4">
        <div
          aria-hidden
          className="bg-muted text-muted-foreground flex size-20 shrink-0 items-center justify-center rounded-full text-2xl font-semibold"
        >
          {initials(author.displayName)}
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight break-words">
            {author.displayName}
          </h1>
          {author.role === "" ? null : (
            <p className="text-muted-foreground mt-1 wrap-anywhere">
              {author.role}
            </p>
          )}
        </div>
      </header>
      {author.bio === "" ? null : (
        <p className="mt-8 wrap-anywhere whitespace-pre-line">{author.bio}</p>
      )}
      {links.length === 0 ? null : (
        <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
          {links.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className="underline"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
      <section className="mt-12">
        <h2 className="text-xl font-semibold">Cómics</h2>
        <Empty className="mt-4">
          <EmptyHeader>
            <EmptyTitle>Todavía no hay cómics</EmptyTitle>
            <EmptyDescription>
              Aquí aparecerán los cómics que venda en la Edición abierta.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    </main>
  );
};

export const Route = createFileRoute("/autores/$slug")({
  loader: async ({ params }) => {
    const author = await getAuthorPage({ data: { slug: params.slug } });

    if (author === null) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router signals a missing page by throwing notFound().
      throw notFound();
    }

    return author;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.displayName ?? "Autor"} · Garage Cómics` },
      {
        name: "description",
        content:
          loaderData === undefined || loaderData.bio === ""
            ? "Autor de Garage Cómics."
            : loaderData.bio.slice(0, BIO_DESCRIPTION_LENGTH),
      },
      // A profile with only a name stays out of search engines until its Author fills it in.
      ...(loaderData === undefined || isBlankProfile(loaderData)
        ? [{ name: "robots", content: "noindex" }]
        : []),
    ],
  }),
  component: AuthorPage,
});

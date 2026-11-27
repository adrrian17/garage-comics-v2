import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@garage-comics/ui/components/empty";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { ComicGrid } from "@/components/comic-grid";
import { SectionRule } from "@/components/page-intro";
import { getAuthorPage } from "@/functions/authors";
import { initials, isBlankProfile } from "@/lib/author";

const BIO_DESCRIPTION_LENGTH = 160;

const AuthorPage = () => {
  const { profile: author, comics } = Route.useLoaderData();

  const links = [
    { label: "Instagram", href: author.instagramUrl },
    { label: "X", href: author.xUrl },
    { label: "Facebook", href: author.facebookUrl },
    { label: "Portafolio", href: author.portfolioUrl },
  ].flatMap(({ label, href }) => (href === null ? [] : [{ label, href }]));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-10 pb-20 sm:px-6 sm:pt-16 lg:pb-28">
      <header className="grid gap-8 sm:grid-cols-[auto_1fr] sm:gap-10 lg:gap-14">
        <div
          aria-hidden
          className="seal bg-print text-print-foreground font-display grid size-28 place-items-center text-4xl font-semibold tracking-tight sm:size-40 sm:text-6xl lg:size-48"
        >
          {initials(author.displayName)}
        </div>
        <div className="flex min-w-0 flex-col justify-end gap-5">
          <div>
            {author.role === "" ? null : (
              <p className="text-muted-foreground mb-2 font-medium wrap-anywhere">
                {author.role}
              </p>
            )}
            <h1 className="font-display text-5xl leading-none font-semibold tracking-tight text-balance break-words sm:text-6xl lg:text-7xl">
              {author.displayName}
            </h1>
          </div>
          {links.length === 0 ? null : (
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="decoration-print inline-flex items-center gap-1 font-medium decoration-2 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    {link.label}
                    <ArrowUpRight
                      aria-hidden
                      className="text-muted-foreground size-4"
                    />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        {author.bio === "" ? null : (
          <p className="max-w-2xl text-lg leading-relaxed text-pretty wrap-anywhere whitespace-pre-line sm:col-start-2">
            {author.bio}
          </p>
        )}
      </header>
      <section aria-labelledby="comics-del-autor" className="mt-20 lg:mt-28">
        <h2
          id="comics-del-autor"
          className="font-display text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Cómics en esta Edición
        </h2>
        <SectionRule />
        {comics.length === 0 ? (
          <div className="border-foreground/20 mt-10 rounded-2xl border border-dashed">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Todavía no hay cómics</EmptyTitle>
                <EmptyDescription>
                  Aquí aparecerán los cómics que venda en la Edición abierta.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="mt-10">
            <ComicGrid comics={comics} showAuthor={false} />
          </div>
        )}
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
      {
        title: `${loaderData?.profile.displayName ?? "Autor"} · Garage Cómics`,
      },
      {
        name: "description",
        content:
          loaderData === undefined || loaderData.profile.bio === ""
            ? "Autor de Garage Cómics."
            : loaderData.profile.bio.slice(0, BIO_DESCRIPTION_LENGTH),
      },
      // A profile with only a name stays out of search engines until its Author fills it in.
      ...(loaderData === undefined || isBlankProfile(loaderData.profile)
        ? [{ name: "robots", content: "noindex" }]
        : []),
    ],
  }),
  component: AuthorPage,
});

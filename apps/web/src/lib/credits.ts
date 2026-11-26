import type { Collaborator } from "@garage-comics/db/schema/comics";

const listFormat = new Intl.ListFormat("es-MX", {
  style: "long",
  type: "conjunction",
});

/** The Collaborators' names as one phrase, such as "Luis y Sofía"; past `max` names the rest become "y 2 más". */
export const collaboratorNames = (
  collaborators: Pick<Collaborator, "name">[],
  max = Number.POSITIVE_INFINITY
) => {
  const names = collaborators.map((collaborator) => collaborator.name);

  if (names.length <= max) {
    return listFormat.format(names);
  }

  return listFormat.format([
    ...names.slice(0, max),
    `${names.length - max} más`,
  ]);
};

/** A short label for a link: its site, such as "instagram.com". */
export const linkLabel = (href: string) => {
  try {
    return new URL(href).hostname.replace(/^www\./u, "");
  } catch {
    return href;
  }
};

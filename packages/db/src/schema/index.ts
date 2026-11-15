// oxlint-disable-next-line sonarjs/no-wildcard-import -- drizzle-kit and defineRelations read every table from here.
export * from "./auth";

export { authorProfile } from "./authors";

export { comic, comicSlots, comicStatuses, editionComic } from "./comics";

export type { Collaborator, ComicSlot, ComicStatus } from "./comics";

export { edition, proposal, proposalStatuses, registration } from "./editions";

export type { ProposalStatus } from "./editions";

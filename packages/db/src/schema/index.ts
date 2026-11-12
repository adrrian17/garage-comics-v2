// oxlint-disable-next-line sonarjs/no-wildcard-import -- drizzle-kit and defineRelations read every table from here.
export * from "./auth";

export { authorProfile } from "./authors";

export { edition, proposal, proposalStatuses, registration } from "./editions";

export type { ProposalStatus } from "./editions";

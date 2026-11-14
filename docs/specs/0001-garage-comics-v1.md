---
status: draft
---

# Garage Cómics v1

## Problem Statement

Mexican comic authors need a place to sell digital comics directly to readers, and Garage Cómics wants to run that store as recurring, limited-time Editions: a call for Proposals, a short window to register and prepare comics, then a short sales window. Each Edition has to admit Authors, collect their Registration, review their comics, sell them to Customers with a watermark, and pay Authors their share through Stripe.

## Solution

A web app with three kinds of people. Anyone can send a Proposal for the open Edition; an Admin accepts or rejects it; an accepted proposer pays a Registration, which creates their Author account. Authors complete Stripe onboarding inside Garage Cómics, upload one Exclusive and up to two Previous Works, and wait for Admin approval. During the sales window Customers fill a cart with comics from any Authors and pay once, by card or OXXO, without an account. Each paid Order gets watermarked PDFs behind a 24-hour Download Link. Garage Cómics keeps a 10% Commission and sends each Author a Transfer for their share once the payment is available. Authors see their sales and their Stripe balance and Payouts in their own section.

## User Stories

### Editions

1. As an Admin, I want to create an Edition with its Proposal window, its sales window and its Registration price, so that the year's run is set up in one place.
2. As an Admin, I want only one Edition to be active at a time, so that Proposals, Registrations and sales never mix between Editions.
3. As an Admin, I want past Editions kept with their Proposals, Authors, comics and Orders, so that I can look back at earlier runs.
4. As a visitor between sales windows, I want to see a landing page with the next Edition's dates, or the call for Proposals when its window is open, so that I know when to come back. No catalog is shown.

### Proposals

5. As anyone, I want to send a Proposal for the open Edition without an account and without paying, so that I can apply to take part.
6. As a proposer, I want to receive an email confirming my Proposal arrived, so that I know it was sent.
7. As a proposer, I want to have only one open Proposal per email at a time, and to send a new one if mine was rejected or my acceptance expired, so that I can try again in the same Edition.
8. As an Admin, I want to accept or reject each Proposal, so that I decide who joins the Edition.
9. As a rejected proposer, I want an email telling me my Proposal was not accepted, without a stated reason.
10. As an accepted proposer, I want an email with a payment link for the Registration that is valid for 7 days, so that I can secure my place.
11. As an Admin, I want an acceptance to expire automatically if the Registration is not paid within 7 days, so that unpaid places do not linger.

### Registration and Author accounts

12. As an accepted proposer, I want paying the Registration to create my Author account and email me a magic link, so that I can sign in right away.
13. As a returning Author, I want my existing account reused when I pay a Registration in a later Edition, so that my profile and history carry over.
14. As an Author, I want to sell only in the Editions I hold a Registration for, so that a new Edition always needs a new Proposal and Registration.
15. As an Author, I want a public page with my display name, photo, bio, role and links (Instagram, X, Facebook, portfolio), listing the comics I sell in the open Edition, so that readers can find my work.

### Stripe onboarding

16. As an Author, I want to complete Stripe Connect onboarding inside Garage Cómics, without being sent to Stripe's pages, so that the whole flow stays in one place.
17. As an Author, I must finish Stripe onboarding before the sales window opens, so that every sale has an account to send my Transfer to.

### Comics

18. As an Author, I want to upload, per Edition, one Exclusive of 12 to 24 pages and up to two Previous Works of any length, so that I know exactly what I can sell.
19. As an Author, I want to offer an Exclusive from an earlier Edition as a Previous Work, so that past Exclusives keep selling.
20. As an Author, I want to give each comic a title, description, genre, cover, PDF of up to 500 MB and price in whole MXN of at least $70, so that it is ready to sell.
21. As an Author, I want to credit Collaborators on a comic with their name, role and links, so that everyone who worked on it is recognised; they have no account and receive no money from Garage Cómics.
22. As an Admin, I want to approve or reject every comic before the sales window opens, with a reason when I reject it, so that only reviewed comics are sold.
23. As an Author, I want an email when my comic is approved or rejected, including the reason when it is rejected, so that I can fix it.
24. As an Admin, I want any change to an approved comic to send it back to review, so that what is sold is what I approved.
25. As an Author, I want a Previous Work approved in an earlier Edition to stay approved in a new one unless I change it, so that I do not wait on review again.

### Buying

26. As a Customer, I want to add comics from any Authors to a cart and pay once, so that I can buy everything in one checkout.
27. As a Customer, I want to pay by card or OXXO, giving only my email, so that I do not need an account.
28. As a Customer paying with OXXO, I want a voucher valid for 2 days and Stripe's payment instructions email, so that I can pay in cash at a store.
29. As a Customer, I want an OXXO Order created during the sales window to be honoured until its voucher expires, even if the window closes first.
30. As a Customer, I want an Order confirmation email with my Order Number and a Download Link once my payment is confirmed, so that I can get my comics.
31. As a Customer whose OXXO voucher expired unpaid, I want nothing further to happen; the Order is cancelled silently.
32. As a Customer, I want my comics as PDFs watermarked with my email and Order Number in the footer of every page, so that the files are tied to my purchase.
33. As a Customer, I want my Download Link to work for 24 hours from when it is sent, with no download limit within that time.
34. As an Admin, I want to resend a new 24-hour Download Link for an Order from the admin panel, regenerating the watermarked copies, so that a Customer who missed the window can still get their comics.

### Money

35. As Garage Cómics, I want to keep a 10% Commission on each comic sold, which also absorbs Stripe's processing fees.
36. As an Author, I want a Transfer for my share of each comic sold, which reaches my Stripe balance once that Order's payment is available.
37. As an Author, I want weekly Payouts from my Stripe balance to my bank account, so that my money reaches me soon after the sales window.
38. As Garage Cómics, I do not offer refunds in the app; any exceptional refund is handled by hand in Stripe.

### Author section

39. As an Author, I want a Sales view listing each comic I sold with its Edition, date, Order Number, price, Commission and my share, so that I know what sold.
40. As an Author, I want a Payments view showing my Stripe balance, the Transfers I received and my Payouts, so that I can follow my money.

### Admins

41. As the first Admin, I want my account seeded from configuration, so that someone can sign in on day one.
42. As an Admin, I want to invite other Admins by email, all with the same permissions, so that the work can be shared.
43. As an Admin or Author, I want to sign in with a magic link, so that there are no passwords.

## Implementation Decisions

### Platform

- One TanStack Start app on Cloudflare (Workers, D1, R2, Cloudflare Email Service), provisioned with Alchemy, as recorded in `docs/adr/0001-cloudflare-platform.md`. The Helios-era `apps/server` (Hono + oRPC) is removed; pages, server functions and Stripe webhooks live in the Start app.
- Public pages (landing, catalog, Author pages, comic pages) are server-rendered for SEO.
- Better Auth with the magic-link plugin only; email and password sign-in is removed.
- UI copy is Mexican Spanish and uses the UI words in `GLOSSARY.md`; code and docs are English.

### Stripe

- Separate charges and transfers. The platform controls pricing ("Tú controlas los precios"), and connected accounts are onboarded and managed through Connect embedded components (Account onboarding, Balances, Payouts list).
- Checkout Sessions with card and OXXO. OXXO vouchers use `expires_after_days: 2`. Orders are fulfilled on payment success (`checkout.session.completed` for card, `checkout.session.async_payment_succeeded` for OXXO), never on the redirect.
- Each Transfer is created after payment success with the Order's charge as `source_transaction`, so funds reach the Author only when the charge's funds are available.
- Connected accounts use a weekly payout schedule, anchored on Monday. A week with no available balance makes no Payout, so an Author has about two or three Payouts per Edition.
- The Registration is paid through its own Checkout Session.

### Comic files and watermarking

- Authors upload PDFs straight to R2 through presigned multipart URLs; files never pass through the Worker, whose request bodies are capped at 100 MB.
- Watermarking runs in a Cloudflare Container, because PDFs of up to 500 MB do not fit in a Worker's 128 MB of memory. It uses qpdf to overlay a one-page stamp (Customer email and Order Number) on every page without decoding the images. Start with the `standard-1` instance (4 GiB memory, 8 GB disk) and confirm by measuring a 500 MB PDF.
- Watermarked copies live in R2 and are deleted 24 hours after creation by an R2 lifecycle rule. Resending a Download Link regenerates them.
- The Download Link streams the watermarked copy from R2.

### Rules worth stating precisely

- Order Numbers are one global sequence across all Editions, starting at `GRG-1000`.
- An acceptance expires 7 days after the Proposal is accepted if the Registration is unpaid.
- Comic prices are whole MXN with a minimum of $70, which covers card (3.6% + $3 + IVA) and OXXO (4% + $3 + IVA) fees within the 10% Commission.
- The Registration price is set per Edition and should cover Stripe Connect's per-Author costs ($35 per active account per month plus 0.25% + $12 per Payout, before IVA).
- An Exclusive has 12 to 24 pages. Previous Works have no page limit.
- A Download Link is valid for 24 hours from when it is sent.
- A comic PDF is at most 500 MB, checked before the upload is accepted.

## Out of Scope

- Customer accounts.
- Refunds and partial refunds inside the app.
- Overlapping Editions.
- Payment of Collaborators.
- Payment methods other than card and OXXO.

## Further Notes

- Testing decisions are not settled yet.

# Garage Cómics Glossary

Garage Cómics is a limited-time store that sells digital comics by Mexican authors. Terms are in English for code and docs; the Spanish word shown in the UI follows each term.

## Language

### Editions

**Edition** (UI: Edición): One run of Garage Cómics, with its own Proposal window and sales window. Editions recur and past ones are kept. _Avoid_: Event, season, round

### People

**Admin** (UI: Administrador): A person with an account who runs Garage Cómics: manages Editions and reviews Proposals. _Avoid_: Staff, moderator, owner

**Author** (UI: Autor): A person who has paid at least one Registration. Their account is created by that first payment and reused in later Editions. _Avoid_: Creator, artist, vendor, seller

**Customer** (UI: Comprador): A person who buys comics. A Customer has no account and is known only by email. _Avoid_: Buyer, client, user

### Joining an Edition

**Proposal** (UI: Propuesta): A request from anyone to take part in an Edition. Sending one costs nothing. _Avoid_: Application, submission, pitch

**Registration** (UI: Inscripción): The paid entry into an Edition that an accepted Proposal unlocks. An Author sells only in the Editions they hold a Registration for. _Avoid_: Enrollment, signup, proposal payment

### Comics

**Exclusive** (UI: Exclusivo de la edición): The one new comic an Author releases for an Edition. _Avoid_: Event comic, main comic, release

**Previous Work** (UI: Trabajo previo): A comic an Author already released that they also sell in an Edition, including an Exclusive from an earlier Edition. _Avoid_: Back catalog, old comic, extra

**Collaborator** (UI: Colaborador): A person credited on an Author's comic who has no account and receives no money from Garage Cómics. _Avoid_: Co-author, contributor, additional author

### Sales

**Order** (UI: Compra): One checkout by a Customer, covering one or more comics from any Authors in the open Edition. _Avoid_: Purchase, sale, transaction, cart

**Order Number** (UI: Número de compra): The readable identifier of an Order, such as `GRG-1000`, shown to Customers and Admins. _Avoid_: Folio, order ID, reference

**Commission** (UI: Comisión): Garage Cómics's share of each comic sold in an Order; the rest goes to the comic's Author. _Avoid_: Fee, cut, platform fee

**Transfer** (UI: Envío de fondos): Money Garage Cómics sends to an Author's Stripe balance for a comic sold in an Order, once the Order's payment is available. _Avoid_: Payment, payout, earning

**Payout** (UI: Transferencia a tu banco): Money moved from an Author's Stripe balance to their bank account. _Avoid_: Transfer, deposit, withdrawal

**Download Link** (UI: Link de descarga): A short-lived link, emailed to a Customer, to download the watermarked comics of an Order. _Avoid_: Download token, access link

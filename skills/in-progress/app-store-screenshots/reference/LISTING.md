# Listing text

The store's own text, written from the same benefits as the screenshot headlines. Load this only when the user asked for listing text (Step 1, item 15). Limits live in [STORE-SPECS.md](STORE-SPECS.md#listing-text); the live pages win over that cache.

## Steps

1. **Collect benefits from the app's own words.** Sources are a README section titled Why or Benefits, an onboarding screen's description, and the accepted slide headlines. Cite each benefit with the file or screen it came from. A feature is not a benefit ("has dark mode" versus "easy on the eyes at night"): turn a feature into a promise only when the app's own text already makes it. When nothing in the app says why anyone would want it, report that gap to the user and stop there; a benefit invented to fill it is the claim a store rejects.
2. **Draft each field for each store the user targets**, one benefit leading each. Apple has Name, Subtitle, Promotional text, Description, Keywords, What's New. Google Play has App name, Short description, Full description, Release notes; it has no subtitle or keyword field, so write none for it.
3. **Measure every field with a command**, not by eye, and rewrite until it fits. Characters: `printf %s "<text>" | wc -m`. Apple Keywords in bytes: `printf %s "<text>" | wc -c`. Cut a word and keep the sentence whole; a field cut mid-word is a defect.
4. **Check the rules** on every field, in every locale:
   - No superlative, ranking, award, price, URL, call to action, or the other platform's store. This is the same list the editor's export advice applies to screenshot copy. Reword as a claim the app can show.
   - Keywords: comma-separated, no space after the comma, none repeating the name or subtitle, none naming another app or company, each longer than two characters.
   - Release notes: say what changed, in the user's terms. "Bug fixes and improvements" says nothing; Play release notes carry no promotion or call to action.
5. **Localize** per [LOCALES.md](LOCALES.md): rewrite for the market, re-measure (a translation changes length, and an accented keyword changes its byte count). A locale the app does not ship in still gets its own listing when the user targets that store locale.
6. **Write `store-listing.md`** at the project root, one section per locale, one heading per field with its measured length beside it (`Subtitle (27/30)`). Commit it beside `app-store-screenshots.json`. The user pastes each field into App Store Connect or Play Console; upload nothing for them.

**Done when:** every field is measured inside its limit, no field matches a rule above, every benefit cites its source, and `store-listing.md` exists with a section for each targeted locale.

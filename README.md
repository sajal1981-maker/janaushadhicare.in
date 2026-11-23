**Kendra code:** PMBJK16587 · **Shop mobile:** 7029699874

# Pradhan Mantri Bhartiya Janaushadhi Kendra — Punglia, Chakdaha

Website for the shop: live stock search, OTC product section, WhatsApp ordering, address & reviews.
All in this folder — no build step, no dependencies.

```
index.html              the whole site (styles + scripts inside)
data/stock.json         generated — what the stock page reads
downloads/              the StockReport files pulled from OneDrive
scripts/build-stock-json.cjs   BPPI Stock Register Report → data/stock.json
scripts/fetch-onedrive-stock.cjs  rebuilds from the newest file in downloads/ (+ month folder ids)
scripts/sync-stock.cjs  optional: newest Excel/CSV in a local folder → data/stock.json
stock-folder.txt        the local folder that optional sync watches
assets/OTC-poster.pdf   printable OTC poster
```

## 0. How to run the site

The site is served by its own small server, which also runs the brand→salt lookup:

```
"$ABACUSAI_BOT_NODE" /Users/sajalghosh/.abacusai-bot/session-home/janaushadhi-kendra/server.cjs 8090
```

Then open **http://127.0.0.1:8090**. (`server.cjs` replaces the plain static server: the
lookup below needs it.)

## 0b. Brand → salt search (Dolo 650 → Paracetamol 650 mg)

There are two search boxes on the page:

1. **Stock search** — matches the shop's own register by medicine name, **drug code** or salt.
2. **"Know the brand, not the salt?"** — type a branded medicine and it looks the product up on
   **Tata 1mg**, reads its salt composition, then offers a one-click "Search this salt in our
   stock" plus an "Ask us on WhatsApp" button.

How it works: the browser calls `/api/salt-lookup` on `server.cjs`, which fetches
`1mg.com/pwa-api/api/v4/search/all` (brand suggestions) and the 1mg drug page (salt
composition). This has to run on the shop's computer because 1mg does not allow direct
cross-site calls from a browser; if 1mg is unreachable the page falls back to plain links to
1mg and Apollo Pharmacy and a WhatsApp button. Apollo Pharmacy has no public lookup that can be
read this way, so it is offered as a search link rather than a data source.

## 1. Where the daily sync looks — the shop's OneDrive

Source: **OneDrive → PMBI → 2026 → <month> → the newest `StockReport ….xlsx`**
(one file per day, e.g. `StockReport 21st november.xlsx`).

Every night at **12:00 am** the routine *"Janaushadhi stock sync from OneDrive"* runs:

1. lists the current month's folder through the OneDrive connector,
2. downloads the newest `StockReport*.xlsx` into `downloads/`,
3. runs `scripts/build-stock-json.cjs` on it, which rewrites `data/stock.json`.

The site reads `data/stock.json`, so after the sync a page refresh shows the new stock.
The month folder ids are in `scripts/fetch-onedrive-stock.cjs` (`MONTH_FOLDERS`).

**What the parser does with a BPPI Stock Register Report:** it finds the header row
(`Drug Code`, `Drug Name`, `Drug Group`, `Drug Category`, `UOM`, `Batch No`, `Expiry Date`,
`Qty`, `MRP`), then **adds up every batch of the same drug code** into one entry —
quantity = total units held, MRP = the pack MRP, expiry = the latest batch's expiry.
710 medicines are currently listed, from 929 batch rows.

## 2. What the website shows per medicine

| Column | Comes from |
|---|---|
| Code | `Drug Code` |
| Name + composition | `Drug Name` (BPPI names medicines by their salt), group, pack size (`UOM`), batch count |
| Status | Available when total quantity > 0, else Not Available |
| Quantity | total `Qty` across batches, with the pack size |
| MRP | `MRP` per pack, in ₹ |

Search matches name, code, salt, group and pack — so "Paracetamol", "1488", "Metformin 500"
and "Anti-Diabetic" all work.

## 3. OTC section

`scripts/build-stock-json.cjs` marks a row as **OTC** when the name is a device, dressing,
hygiene or personal-care item (thermometer, nebulizer, bandage, mask, gloves, syrup-free
items like sanitary napkins, diapers, condoms, toothpaste, soap, knee caps…). A dose form in
the name (Tablets / Capsules / Syrup / Inhalation / Powder…) always keeps it a medicine.
That currently gives 50 OTC items, each with an illustration, pack size, MRP and an Ask button.
To force a particular item into or out of the OTC list, edit `OTC_WORDS` / `DOSE_FORMS` in
that script.

### The old folder-based sync
`scripts/sync-stock.cjs` + `stock-folder.txt` still work if you ever want to feed the site from
a local folder of Excel/CSV files instead. It is not scheduled any more.

## 3. OTC section

Rows whose **Category** is `OTC` (or Surgical / Wellness) appear in the colourful OTC grid with
an illustration, MRP and an "Ask" button. Medicines stay in the search table only.

## 4. Things to replace with real details

- `REVIEWS` array near the bottom of `index.html` — the six reviews there are **sample text**,
  clearly labelled on the page. Paste your real Google Business Profile reviews.
- The "Send on WhatsApp" feedback form under the reviews sends the customer's rating and
  message straight to the shop's WhatsApp — a review only appears on the site once you add it.
- The Facebook link in the footer (`data-social="facebook"`) — put your page URL in `href`.
- Shop timings appear in three places: the top bar, the contact card, and the poster.

## 5. Shop photos (already wired, waiting for the files)

Drop your photos into `assets/images/` with exactly these names — `.jpg` (or `.jpeg`, `.png`,
`.webp`) — and they appear automatically, cropped to fit. No code change needed.

| File name | Where it shows | Best photo |
|---|---|---|
| `shopfront.jpg` | banner, right-hand card (4:3) | **done** — the shop from outside at night, signboard and 50%–90% board |
| `shopfront-hero.jpg` | banner strip under the shop photo | **done** — wide crop of the lit doorway and counter |
| `counter-wide.jpg` | "Visit the shop" section | **done** — the counter and shelves, wide crop |
| `counter.jpg` | photo strip under "Why Janaushadhi" | **done** — the counter, 9:7 crop |
| `shelves.jpg` | photo strip under "Why Janaushadhi" | **done** — the yellow medicine shelves |
| `otc-display.jpg` | photo strip under "Why Janaushadhi" | **done** — OTC products, health drinks, protein powders |
| `shop-inside.jpg` | "Visit the shop" section | optional — staff at work |

All five shop photos are in place; a labelled placeholder appears only if one is missing. The banner crops were made with `sips` from your photos; if you send a daytime shot of the
shopfront, replace `shopfront.jpg` with it (same name, keep it landscape).

Until a file is there, a labelled placeholder shows in its place — visitors see a soft
coloured card, not a broken image. Landscape photos at least 1600 px wide look sharpest.

## 6. Events & photo gallery (update it yourself)

The **Events & photo gallery** section reads `data/events.json`. To add an event, open that file
and add one block:

```json
{ "date": "2026-12-01", "title": "Free health check camp", "text": "One or two lines about it.", "image": "assets/images/events/camp.jpg" }
```

- `date` is `YYYY-MM-DD`; events are sorted newest first.
- `image` is optional — put the photo in `assets/images/events/` and give its path.
- The three blocks currently in the file are labelled **sample**; delete them when you add real ones.
- To add a photo only, add a block with a title and the image and leave the text short.

## 7. Logos, banner and video

- `assets/images/janaushadhi-logo.svg` and `pmbi-logo.png` — downloaded from
  **janaushadhi.gov.in** (the official Jan Aushadhi / PMBI marks). They appear in the
  big store banner at the top and in the header.
- The store banner shows the shop name in large type with **"Dam Kam Aur Davai Uttam"**,
  and the timings, address and mobile number in bold highlighted cards.
- The video section embeds the YouTube Short `o0bfcBu_NDg`
  (`https://youtube.com/shorts/o0bfcBu_NDg`). To change it, edit the iframe `src` in
  `index.html` — keep the `/embed/<video id>` form.

## 8. Editing

Open `index.html` in a text editor. Colours are CSS variables at the top of the `<style>` block.

## OTC product photos and reference links

`scripts/otc-images.json` maps each OTC item on the stock list to:

- `img` — a product photo in `assets/images/otc/` (16 files, 560 px, white background)
- `refs` — the other websites where the same item can be checked (Zeelab Pharmacy product page, Tata 1mg search, GPVDS Pharma for Jan Aushadhi items)

The page reads this file at load time, so adding a product photo or a reference link needs no HTML edit — only a new row in the JSON.

**These photos are reference shots of the same generic composition, taken from Zeelab Pharmacy. They are not photos of the packs on our counter.** The page says so under the grid. When a real photo of our own pack is available, save it in `assets/images/otc/` and point that row's `img` at it, and drop the `photoFrom` / `photoFromUrl` note.

24 of the 50 OTC items have a photo; the rest show a line-art icon and keep their reference links.

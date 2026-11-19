# Pinterest LocalBoard — A4 Layout fork

A fork of [thetejasagrawal/Pinterest-LocalBoard](https://github.com/thetejasagrawal/Pinterest-LocalBoard) that adds a layout step: capture a Pinterest board, then arrange every image on A4 sheets (original aspect ratios, no cropping) and print it or export it as PDF/PNG.

All the board scanning logic is the original project's work (MIT licensed, see `LICENSE`). This fork only changes what happens after the scan.

## What's different from the original

||Original|This fork|
|---|---|---|
|Toolbar click|Opens a popup with _Download ZIP_|Scans the board and opens a layout page in a new tab|
|After capture|ZIP is saved|Choose: **Download ZIP** or **Arrange & print on A4**|
|Output|ZIP|ZIP, browser **Print**, **PDF**, or **PNG pages (zip)**|
|Popup / history / resume|Yes|Bypassed in this fork (files remain, unused)|

### Layout page features

- **Layouts:** justified rows or masonry columns, both keeping each image's aspect ratio
- **Page setup:** portrait/landscape, margin, gap, row height, column count (live preview)
- **Realign:** shuffle, _Best fit_ (tries 300 orders, keeps the one that fills pages best), drag an image onto another to reorder, hover ✕ to remove
- **Extra images:** add local files or a whole folder, or drop files onto the page
- **Output:** Print (exact A4 pages), PDF (up to 300 dpi per image), PNG pages (150 dpi, zipped), or the original images as a ZIP

## Install (no build step)

1. Download this repo: **Code → Download ZIP**, then unzip it.
2. Open `chrome://extensions` in Chrome and turn on **Developer mode**.
3. Click **Load unpacked** and select the **`extension/`** folder.
4. If you also have the original LocalBoard installed, disable it so the two don't both run on Pinterest.

## Use

1. Open a Pinterest board (the actual pin feed, not a sections overview) and let it load.
2. Click the extension icon. The on-page progress overlay shows the scan.
3. A new tab opens and fetches the images. When it finishes, choose **Download ZIP** or **Arrange & print on A4**.
4. Adjust the layout, then **Print**, or export a PDF / PNG zip.

A red `!` on the icon means the tab isn't a Pinterest board, or the page needs a refresh.

## Files changed or added (all inside `extension/`)

|File|Change|
|---|---|
|`content.js`|Added a `layout` export mode: after the original scan, it sends each pin's best image URLs to the background script instead of building a ZIP|
|`background.js`|Replaced. Starts the scan on icon click and opens the layout page|
|`manifest.json`|Popup and `downloads` permission removed; renamed; version bumped|
|`layout.html`, `layout.js`|New layout page (fetching, layout engine, reorder, print/PDF/PNG/ZIP)|
|`vendor/jspdf.umd.min.js`|jsPDF 2.5.1, used for PDF export|

## Limitations

- It relies on Pinterest's current page structure, like the original, so it can break when Pinterest changes it.
- Large boards are held in browser memory while laying out.
- Private boards only work if your signed-in session can already view them.

## Credits and license

Built on Pinterest LocalBoard by Tejas Agrawal. MIT licensed. This project is independent and not affiliated with Pinterest.
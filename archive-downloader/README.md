# Archive Collection Studio v1.1

**Web tool:** https://jjune33.github.io/notepad/archive-downloader/

## Download directly to Windows without Python

1. Open the web tool, paste an Internet Archive collection URL, and click **Find items**.
2. Select all items or just the ones you want. Choose **PDF documents** (or another format).
3. Click **Windows direct download (.zip)**. Inspecting files first is optional. If file metadata was already inspected, the ZIP includes those matching filenames so Windows does not need to re-request them.
4. Extract the complete ZIP to a folder on Windows. Double-click **START_DOWNLOAD.cmd**.
5. Files download directly into `Archive_Downloads`, grouped by Internet Archive item. Existing complete files are skipped, and `.part` downloads resume via HTTP byte ranges when supported.
6. To stop, press Ctrl+C. Restart `START_DOWNLOAD.cmd` to continue.

This package uses built-in Windows PowerShell and .NET, not Python. It does **not** contain the PDF files itself, and needs an internet connection and enough free disk space. See `download-log.txt` and `failed-downloads.txt` for results.

The browser ZIP stores your **selected item identifiers**. It never automatically expands a partial selection into the entire collection. It also stores the format and original-only preferences.

## Advanced: full LEGO collection preset

For direct use without selecting files in the browser, a `selection.json` with
`{"collection":"lego-magazines","allCollection":true,"format":"pdf","originalOnly":false,"items":[]}`
asks the Windows downloader to discover every current item in the collection before downloading matching PDFs.

## Other export options

The original macOS/Linux and Windows `ia` downloader scripts, item ID list, direct URL list, and CSV inventory are still available. The `ia` scripts require `pip install internetarchive`.

---


A free static web app for searching and downloading public Internet Archive collections.

## Features
- Paste a collection URL (for example `https://archive.org/details/lego-magazines`).
- Load all items with paginated searches through the official Advanced Search API (up to 10,000 results).
- Search within a collection, filter results, and select items.
- Choose PDFs, EPUB, CBZ, ZIP, JPG, PNG, MP3, or all files; optionally originals only.
- Inspect file metadata and estimated sizes with at most three requests at a time.
- Export a macOS/Linux `.sh` script, Windows PowerShell `.ps1` script, item list, file inventory CSV, or direct URL list after file inspection.

## Usage
Open `index.html` in a browser or host the `archive-downloader` directory on any static host.

To run a generated macOS/Linux script:
1. Install the official client: `python3 -m pip install internetarchive`.
2. In Terminal, run `bash lego-magazines_download.sh` (replace with your downloaded filename).
3. Files download to `Archive_Downloads/`. Rerun the script to retry.

For Windows:
1. Install the official client: `py -m pip install internetarchive`. Ensure `ia` is on PATH.
2. Run `powershell -ExecutionPolicy Bypass -File .\lego-magazines_download.ps1` (replace with your downloaded filename).

Bulk scripts pass the selected identifiers to `ia download --itemlist`. They do not stream large archives through the browser. Files may be unavailable or subject to restrictions.

## APIs
- `https://archive.org/advancedsearch.php`
- `https://archive.org/metadata/{identifier}`
- `https://archive.org/download/{identifier}/{filename}`

The app uses Archive.org public APIs without an API key or tracking. Browser CORS availability, Internet Archive rate limits and access restrictions apply.

MIT License, 2026 JJune33.

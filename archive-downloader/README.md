# Archive Collection Studio

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

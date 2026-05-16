#!/usr/bin/env python3
"""
NasheedHub Scraper
==================
Scrapes nasheeds from free Islamic audio sites and imports them into Supabase.

SETUP:
  pip install requests beautifulsoup4 supabase python-dotenv yt-dlp mutagen

USAGE:
  python scraper.py --source islamicfinder --limit 100
  python scraper.py --source youtube-playlist --url "https://youtube.com/playlist?list=..."
  python scraper.py --source csv --file my_nasheeds.csv
"""

import os
import re
import csv
import json
import time
import hashlib
import argparse
import logging
from dataclasses import dataclass, asdict
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
log = logging.getLogger('nasheed-scraper')

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL    = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY    = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')  # use SERVICE ROLE for scraper
HEADERS         = {'User-Agent': 'Mozilla/5.0 (compatible; NasheedHubBot/1.0)'}
REQUEST_DELAY   = 1.5   # seconds between requests (be polite)
MAX_RETRIES     = 3

# ── Data model ────────────────────────────────────────────────────────────────
@dataclass
class ScrapedNasheed:
    title:      str
    audio_url:  str
    artist:     str      = 'Unknown Artist'
    album:      str      = ''
    cover_url:  str      = ''
    duration:   int      = 0
    language:   str      = 'Arabic'
    lyrics:     str      = ''
    tags:       list     = None
    source_url: str      = ''

    def __post_init__(self):
        if self.tags is None:
            self.tags = []

# ── Helpers ───────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text[:80]

def unique_slug(base: str, existing: set) -> str:
    slug = slugify(base)
    if slug not in existing:
        existing.add(slug)
        return slug
    i = 2
    while f"{slug}-{i}" in existing:
        i += 1
    new = f"{slug}-{i}"
    existing.add(new)
    return new

def get_page(url: str, retries: int = MAX_RETRIES) -> Optional[BeautifulSoup]:
    for attempt in range(retries):
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            r.raise_for_status()
            time.sleep(REQUEST_DELAY)
            return BeautifulSoup(r.text, 'html.parser')
        except Exception as e:
            log.warning(f"Attempt {attempt+1}/{retries} failed for {url}: {e}")
            time.sleep(2 ** attempt)
    return None

def check_audio_url(url: str) -> bool:
    """Verify the audio URL is reachable."""
    try:
        r = requests.head(url, headers=HEADERS, timeout=8, allow_redirects=True)
        return r.status_code == 200
    except:
        return False

# ── Scrapers ──────────────────────────────────────────────────────────────────

def scrape_islamicfinder(limit: int = 50) -> list[ScrapedNasheed]:
    """Scrape IslamicFinder nasheeds section."""
    base = 'https://www.islamicfinder.org'
    results = []
    page = 1

    while len(results) < limit:
        url = f'{base}/nasheeds/?page={page}'
        log.info(f'Scraping IslamicFinder page {page}: {url}')
        soup = get_page(url)
        if not soup:
            break

        cards = soup.select('.nasheed-item, .audio-item, article.nasheed')
        if not cards:
            # Try generic audio links
            cards = soup.select('a[href$=".mp3"], a[href$=".m4a"]')

        if not cards:
            log.info('No more items found, stopping.')
            break

        for card in cards:
            if len(results) >= limit:
                break
            try:
                title_el = card.select_one('h2, h3, .title, .nasheed-title')
                title     = title_el.get_text(strip=True) if title_el else 'Untitled'
                audio_el  = card.select_one('audio source, a[href$=".mp3"]')
                audio_url = ''
                if audio_el:
                    audio_url = audio_el.get('src') or audio_el.get('href', '')
                    if audio_url and not audio_url.startswith('http'):
                        audio_url = urljoin(base, audio_url)

                if not audio_url:
                    continue

                artist_el  = card.select_one('.artist, .nasheed-artist, .by')
                artist     = artist_el.get_text(strip=True) if artist_el else 'Unknown'
                img_el     = card.select_one('img')
                cover_url  = img_el.get('src', '') if img_el else ''
                if cover_url and not cover_url.startswith('http'):
                    cover_url = urljoin(base, cover_url)

                results.append(ScrapedNasheed(
                    title=title, audio_url=audio_url,
                    artist=artist, cover_url=cover_url,
                    source_url=url, language='Arabic'
                ))
                log.info(f'  Found: {title} — {artist}')
            except Exception as e:
                log.warning(f'  Error parsing card: {e}')

        page += 1

    return results


def scrape_from_csv(filepath: str) -> list[ScrapedNasheed]:
    """
    Import from a CSV file. Required columns: title, audio_url
    Optional: artist, album, cover_url, duration, language, lyrics, tags
    """
    results = []
    with open(filepath, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not row.get('title') or not row.get('audio_url'):
                continue
            tags = [t.strip() for t in row.get('tags', '').split(',') if t.strip()]
            results.append(ScrapedNasheed(
                title     = row['title'],
                audio_url = row['audio_url'],
                artist    = row.get('artist', 'Unknown'),
                album     = row.get('album', ''),
                cover_url = row.get('cover_url', ''),
                duration  = int(row.get('duration', 0) or 0),
                language  = row.get('language', 'Arabic'),
                lyrics    = row.get('lyrics', ''),
                tags      = tags,
                source_url= row.get('source_url', ''),
            ))
    log.info(f'Loaded {len(results)} nasheeds from CSV')
    return results


def scrape_youtube_playlist(playlist_url: str, limit: int = 50) -> list[ScrapedNasheed]:
    """
    Extract audio from a YouTube playlist using yt-dlp.
    IMPORTANT: Only use for content you have permission to use!
    """
    try:
        import yt_dlp
    except ImportError:
        log.error('yt-dlp not installed. Run: pip install yt-dlp')
        return []

    results = []
    ydl_opts = {
        'quiet': True,
        'extract_flat': True,
        'playlistend': limit,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(playlist_url, download=False)
        entries = info.get('entries', [])
        log.info(f'Found {len(entries)} videos in playlist')

        for entry in entries[:limit]:
            try:
                video_url = f"https://youtube.com/watch?v={entry['id']}"
                # Get direct audio URL
                audio_opts = {'quiet': True, 'format': 'bestaudio/best'}
                with yt_dlp.YoutubeDL(audio_opts) as ydl2:
                    video_info = ydl2.extract_info(video_url, download=False)
                    audio_url  = video_info['url']
                    duration   = int(video_info.get('duration', 0))
                    thumbnail  = video_info.get('thumbnail', '')
                    artist     = video_info.get('uploader', 'Unknown')

                results.append(ScrapedNasheed(
                    title     = entry.get('title', 'Untitled'),
                    audio_url = audio_url,
                    artist    = artist,
                    cover_url = thumbnail,
                    duration  = duration,
                    source_url= video_url,
                    language  = 'Arabic',
                ))
                log.info(f'  ✓ {entry.get("title")}')
                time.sleep(REQUEST_DELAY)
            except Exception as e:
                log.warning(f'  Error: {e}')

    return results


# ── Supabase importer ─────────────────────────────────────────────────────────

class SupabaseImporter:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError(
                'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env'
            )
        self.base = SUPABASE_URL.rstrip('/')
        self.headers = {
            'apikey':        SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type':  'application/json',
            'Prefer':        'return=representation',
        }
        self.artist_cache: dict[str, str] = {}  # name -> id
        self.album_cache:  dict[str, str] = {}  # title -> id
        self.slugs_used:   set[str]       = set()

    def _req(self, method: str, path: str, body: dict = None) -> dict:
        url = f'{self.base}/rest/v1/{path}'
        r   = requests.request(method, url, headers=self.headers, json=body, timeout=15)
        r.raise_for_status()
        return r.json() if r.text else {}

    def get_or_create_artist(self, name: str) -> str:
        if name in self.artist_cache:
            return self.artist_cache[name]
        slug = unique_slug(name, self.slugs_used)
        try:
            existing = self._req('GET', f'artists?name=eq.{requests.utils.quote(name)}&select=id')
            if existing:
                self.artist_cache[name] = existing[0]['id']
                return existing[0]['id']
        except:
            pass
        data = self._req('POST', 'artists', {'name': name, 'slug': slug})
        aid  = data[0]['id'] if isinstance(data, list) else data['id']
        self.artist_cache[name] = aid
        log.info(f'  Created artist: {name} ({aid})')
        return aid

    def get_or_create_album(self, title: str, artist_id: str) -> Optional[str]:
        if not title:
            return None
        key = f'{title}::{artist_id}'
        if key in self.album_cache:
            return self.album_cache[key]
        slug = unique_slug(title, self.slugs_used)
        try:
            existing = self._req('GET', f'albums?title=eq.{requests.utils.quote(title)}&artist_id=eq.{artist_id}&select=id')
            if existing:
                self.album_cache[key] = existing[0]['id']
                return existing[0]['id']
        except:
            pass
        data = self._req('POST', 'albums', {'title': title, 'slug': slug, 'artist_id': artist_id})
        aid  = data[0]['id'] if isinstance(data, list) else data['id']
        self.album_cache[key] = aid
        log.info(f'  Created album: {title}')
        return aid

    def import_nasheed(self, n: ScrapedNasheed) -> bool:
        try:
            artist_id = self.get_or_create_artist(n.artist)
            album_id  = self.get_or_create_album(n.album, artist_id) if n.album else None
            slug      = unique_slug(n.title, self.slugs_used)

            payload = {
                'title':      n.title,
                'slug':       slug,
                'artist_id':  artist_id,
                'album_id':   album_id,
                'audio_url':  n.audio_url,
                'cover_url':  n.cover_url or None,
                'duration':   n.duration or None,
                'language':   n.language,
                'lyrics':     n.lyrics or None,
                'tags':       n.tags or [],
                'source_url': n.source_url or None,
                'is_published': True,
            }
            self._req('POST', 'nasheeds', payload)
            log.info(f'  ✓ Imported: {n.title}')
            return True
        except Exception as e:
            log.error(f'  ✗ Failed to import "{n.title}": {e}')
            return False

    def import_batch(self, nasheeds: list[ScrapedNasheed]) -> tuple[int, int]:
        ok = fail = 0
        for n in nasheeds:
            if self.import_nasheed(n):
                ok += 1
            else:
                fail += 1
            time.sleep(0.1)   # rate limit
        return ok, fail


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='NasheedHub Scraper')
    parser.add_argument('--source', choices=['islamicfinder', 'youtube-playlist', 'csv'],
                        default='islamicfinder')
    parser.add_argument('--limit', type=int, default=50)
    parser.add_argument('--url',  help='Playlist URL (for youtube-playlist source)')
    parser.add_argument('--file', help='CSV file path (for csv source)')
    parser.add_argument('--dry-run', action='store_true', help='Scrape but do not import')
    args = parser.parse_args()

    log.info('═' * 60)
    log.info('NasheedHub Scraper')
    log.info('═' * 60)

    # Scrape
    nasheeds: list[ScrapedNasheed] = []
    if args.source == 'islamicfinder':
        nasheeds = scrape_islamicfinder(args.limit)
    elif args.source == 'youtube-playlist':
        if not args.url:
            parser.error('--url required for youtube-playlist source')
        nasheeds = scrape_youtube_playlist(args.url, args.limit)
    elif args.source == 'csv':
        if not args.file:
            parser.error('--file required for csv source')
        nasheeds = scrape_from_csv(args.file)

    log.info(f'\nScraped {len(nasheeds)} nasheeds total.')

    if args.dry_run:
        log.info('Dry run — not importing to Supabase.')
        for n in nasheeds:
            log.info(f'  {n.title} — {n.artist} [{n.language}]')
        return

    # Import
    log.info('\nImporting to Supabase…')
    importer = SupabaseImporter()
    ok, fail = importer.import_batch(nasheeds)

    log.info('\n' + '═' * 60)
    log.info(f'Done! ✓ {ok} imported  ✗ {fail} failed')
    log.info('═' * 60)


if __name__ == '__main__':
    main()

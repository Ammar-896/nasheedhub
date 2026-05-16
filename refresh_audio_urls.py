#!/usr/bin/env python3
"""
refresh_audio_urls.py
─────────────────────
Re-extracts fresh audio stream URLs from YouTube for all nasheeds in the DB.
Works exactly like the scraper's YouTube import — fetches all formats and
picks the best audio one. Run this every 5-6 hours since YouTube URLs expire.

USAGE:
    python refresh_audio_urls.py

REQUIREMENTS:
    pip install yt-dlp supabase python-dotenv
"""

import os, time, logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
log = logging.getLogger(__name__)

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env/.env.local')

try:
    from supabase import create_client
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
except ImportError:
    raise ImportError('Run: pip install supabase')

try:
    import yt_dlp
except ImportError:
    raise ImportError('Run: pip install yt-dlp')


def extract_audio_url(video_url: str) -> str | None:
    """
    Extract a fresh audio stream URL from a YouTube video URL.
    Same approach as the scraper — fetches all formats, picks best audio.
    """
    # Step 1: get all available formats (no format filter = no "not available" errors)
    opts = {
        'quiet': True,
        'no_warnings': True,
        
    }

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(video_url, download=False)

            formats = info.get('formats', [])

            if not formats:
                # Some videos return a direct url at the top level
                if info.get('url'):
                    return info['url']
                return None

            # Prefer: audio-only (no video stream), highest quality
            audio_only = [
                f for f in formats
                if f.get('vcodec') == 'none'
                and f.get('acodec') != 'none'
                and f.get('url')
            ]

            if audio_only:
                # Sort by quality (abr = audio bitrate)
                audio_only.sort(key=lambda f: f.get('abr') or 0)
                return audio_only[-1]['url']  # highest bitrate

            # Fallback: any format with audio and a url
            with_audio = [
                f for f in formats
                if f.get('acodec') != 'none' and f.get('url')
            ]
            if with_audio:
                return with_audio[-1]['url']

            # Last resort: any format with a url
            any_url = [f for f in formats if f.get('url')]
            if any_url:
                return any_url[-1]['url']

            return None

    except Exception as e:
        log.warning(f'  yt-dlp error: {e}')
        return None


def main():
    log.info('=' * 60)
    log.info('NasheedHub Audio URL Refresher')
    log.info('=' * 60)
    log.info('Fetching nasheeds from database...')

    result = sb.table('nasheeds').select('id, title, source_url').execute()
    rows = result.data or []

    # Only process rows that have a YouTube source_url
    youtube_rows = [
        r for r in rows
        if r.get('source_url') and 'youtube.com' in r['source_url']
    ]

    log.info(f'Found {len(youtube_rows)} nasheeds with YouTube source URLs\n')

    updated = 0
    failed  = 0

    for i, row in enumerate(youtube_rows, 1):
        title      = (row['title'] or 'Untitled')[:55]
        video_url  = row['source_url']
        nasheed_id = row['id']

        log.info(f'[{i}/{len(youtube_rows)}] {title}')

        fresh_url = extract_audio_url(video_url)

        if not fresh_url:
            log.warning('  ✗ Could not extract URL')
            failed += 1
        else:
            sb.table('nasheeds').update({'audio_url': fresh_url}).eq('id', nasheed_id).execute()
            log.info('  ✓ Updated')
            updated += 1

        # Polite delay — 1s normally, 3s every 10 to avoid rate limiting
        time.sleep(5 if i % 10 == 0 else 2)

    log.info('')
    log.info('=' * 60)
    log.info(f'Done!  ✓ {updated} updated   ✗ {failed} failed')
    log.info('=' * 60)
    log.info('Tip: Run this every 5-6 hours to keep audio working.')


if __name__ == '__main__':
    main()
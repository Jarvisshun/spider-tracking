# UGC Backend Server — Spider-Man Sighting Upload API
import os, json, uuid, hashlib, time, re, random
import urllib.request, ssl
import xml.etree.ElementTree as ET
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # server/
ROOT_DIR = os.path.dirname(BASE_DIR)                    # repo root
SRC_DIR = os.path.join(ROOT_DIR, 'src')
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
DATA_FILE = os.path.join(BASE_DIR, 'sightings.json')
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_IMAGE = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
ALLOWED_VIDEO = {'mp4', 'webm', 'mov', 'avi'}
ALLOWED_EXT = ALLOWED_IMAGE | ALLOWED_VIDEO
SPIDERMAN_KEYWORDS = [
    'spider-man', 'spiderman', '蜘蛛侠', '蜘蛛人',
    'peter parker', 'miles morales', 'venom', 'green goblin',
    'web', 'webs', 'web-slinger', 'spidey', 'spider',
    'marvel', 'new york', 'nyc', 'mask', 'costume', 'cosplay',
    'avengers', 'iron man', '黑豹', '漫威',
    'tom holland', 'tobey maguire', 'andrew garfield',
]

os.makedirs(UPLOAD_DIR, exist_ok=True)

def load_sightings():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_sightings(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def moderate_content(description, filename):
    """Check if content is Spider-Man related. Returns (passed, reason)."""
    text = (description + ' ' + filename).lower()
    matches = [kw for kw in SPIDERMAN_KEYWORDS if kw in text]
    if not matches:
        return False, '请上传与蜘蛛侠相关的内容（描述中需包含蜘蛛侠、Spider-Man 等关键词）'
    return True, ''

@app.route('/api/upload', methods=['POST'])
def upload_sighting():
    if 'file' not in request.files:
        return jsonify({'error': '未选择文件'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '文件名为空'}), 400

    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED_EXT:
        return jsonify({'error': f'不支持的文件类型: .{ext}，仅支持 {", ".join(sorted(ALLOWED_EXT))}'}), 400

    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > MAX_FILE_SIZE:
        return jsonify({'error': f'文件过大: {size/1024/1024:.1f}MB，最大 {MAX_FILE_SIZE/1024/1024:.0f}MB'}), 400

    description = request.form.get('description', '').strip()
    lat = request.form.get('lat', '')
    lng = request.form.get('lng', '')
    author = request.form.get('author', '匿名用户').strip() or '匿名用户'

    passed, reason = moderate_content(description, file.filename)
    if not passed:
        return jsonify({'error': reason, 'moderation_failed': True}), 400

    sighting_id = str(uuid.uuid4())[:8]
    safe_name = secure_filename(file.filename)
    saved_name = f"{sighting_id}_{safe_name}"
    filepath = os.path.join(UPLOAD_DIR, saved_name)
    file.save(filepath)

    media_type = 'video' if ext in ALLOWED_VIDEO else 'image'

    sighting = {
        'id': sighting_id,
        'author': author,
        'description': description,
        'lat': float(lat) if lat else None,
        'lng': float(lng) if lng else None,
        'filename': saved_name,
        'media_type': media_type,
        'size': size,
        'created_at': datetime.utcnow().isoformat() + 'Z',
    }

    sightings = load_sightings()
    sightings.append(sighting)
    save_sightings(sightings)

    return jsonify({'success': True, 'sighting': sighting}), 201

@app.route('/api/sightings', methods=['GET'])
def list_sightings():
    return jsonify(load_sightings())

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'sightings_count': len(load_sightings())})

# ============================================================
# Social Media Feed API — RSS + Cache + Refresh
# ============================================================

_social_cache = {}
_CACHE_TTL = 300  # 5 minutes

# --- Dynamic content generators for infinite scroll ---
_YT_TEMPLATES = [
    ("Spider-Man: Brand New Day - Official Trailer {n}", "Sony Pictures", "8.5M"),
    ("Behind the Scenes - Spider-Man Brand New Day {n}", "Marvel Entertainment", "3.1M"),
    ("Spider-Man Swings Into NYC - Fan Reactions {n}", "SpiderFan Channel", "450K"),
    ("Spider-Man: Brand New Day - All Easter Eggs {n}", "Screen Rant", "2.3M"),
    ("Spider-Man PS5 Gameplay - Swinging Through NYC {n}", "GameRanx", "1.8M"),
    ("Every Spider-Man Movie Ranked Worst to Best {n}", "IGN", "4.2M"),
    ("Spider-Man Villains Explained - Complete Lore {n}", "Comicstorian", "980K"),
    ("Tom Holland Reacts to Spider-Man Fan Theories {n}", "Vanity Fair", "5.6M"),
    ("Spider-Man Suit Collection - Every Costume {n}", "Screen Crush", "1.5M"),
    ("Spider-Man Brand New Day - Post Credit Scene {n}", "Sony Pictures", "2.8M"),
    ("Top 10 Spider-Man Moments in MCU History {n}", "WatchMojo", "3.4M"),
    ("Spider-Man No Way Home - Full Timeline {n}", "CBR", "1.1M"),
    ("Tom Holland Interview - Brand New Day {n}", "Happy Sad Confused", "890K"),
    ("Spider-Man PS5 vs Movie Comparison {n}", "Digital Foundry", "670K"),
    ("Every Spider-Man Suit in Brand New Day {n}", "Variant Comics", "1.3M"),
    ("Spider-Man Brand New Day - Set Tour {n}", "Entertainment Tonight", "2.1M"),
    ("Spider-Man Stunts Revealed - Brand New Day {n}", "Corridor Crew", "1.9M"),
    ("Spider-Man Brand New Day - Premiere Live {n}", "Sony Pictures", "5.2M"),
    ("Spider-Man Comics to Read Before Brand New Day {n}", "ComicTropes", "420K"),
    ("Spider-Man Brand New Day - Final Trailer Breakdown {n}", "New Rockstars", "3.7M"),
]
_REDDIT_TEMPLATES = [
    ("Spider-Man spotted swinging through {loc}!", "u/webslinger_fan", 2847, 156),
    ("Brand New Day trailer breakdown - Easter eggs you missed", "u/marvel_detective", 5120, 423),
    ("Peter Parker's apartment in real life - {loc} edition", "u/nyc_explorer", 1893, 87),
    ("Cosplayed as Spider-Man at {loc}, got mobbed", "u/friendly_neighborhood", 3456, 201),
    ("Brand New Day fan art - my take on the new suit", "u/Chrrisdraws", 8901, 567),
    ("Spider-Man Brand New Day theory: {theory}", "u/theory_master", 2103, 134),
    ("Last Stand Spider-Man Backstory Revealed - Discussion", "u/Potential-Mess6826", 1678, 92),
    ("Miles Morales in Brand New Day? Evidence thread", "u/NerveConscious6375", 3421, 178),
    ("Spider-Man and Invincible crossover fan concept", "u/Turbulent_Dig_2487", 5612, 289),
    ("Brand New Day set photos from {loc} leaked", "u/Lox22", 1203, 445),
    ("Rank the Spider-Man suits from worst to best", "u/suit_collector", 4567, 312),
    ("Brand New Day villain speculation thread", "u/villain_theorist", 2890, 234),
    ("Spider-Man PS5 vs Brand New Day suit comparison", "u/gamer_spidey", 1678, 98),
    ("Tom Holland best Spider-Man moments ranked", "u/holland_fan", 5432, 345),
    ("Brand New Day plot leak discussion [SPOILERS]", "u/leak_watcher", 8765, 678),
]
_X_TEMPLATES = [
    ("@SpiderManMovie", "Spider-Man: Brand New Day", "The web-slinger is back! Brand New Day hits theaters July 2026. #BrandNewDay"),
    ("@TomHolland1996", "Tom Holland", "Can't wait for you all to see what we've been working on. This one is special. #{n}"),
    ("@Marvel", "Marvel Entertainment", "Spider-Man: Brand New Day - swinging into a new era. Watch the official trailer now!"),
    ("@spideytracker", "Spidey Tracker", "NYC sighting confirmed! Spider-Man spotted at {loc}. Keep your eyes on the sky"),
    ("@SonyPictures", "Sony Pictures", "Every hero has a new beginning. Spider-Man: Brand New Day - only in theaters July 2026."),
    ("@MarvelStudios", "Marvel Studios", "The multiverse expands. Spider-Man's next chapter begins. #BrandNewDay"),
    ("@NYC_Spidey", "NYC Spidey Watch", "Another confirmed sighting near {loc}! Photo evidence uploaded to Spidey Tracker."),
    ("@ComicBookHQ", "Comic Book HQ", "BREAKING: Spider-Man: Brand New Day teaser poster leaked! Check it out on our site."),
    ("@zendaya", "Zendaya", "Back on set with my favorite web-slinger. 2026 is going to be amazing."),
    ("@Collider", "Collider", "SPIDER-MAN: BRAND NEW DAY will reportedly feature the most ambitious action sequence in MCU history."),
    ("@IGN", "IGN", "Spider-Man: Brand New Day — everything we know so far: new villains, new suit, new director."),
    ("@EmpireMagazine", "Empire Magazine", "EXCLUSIVE: First look at Spider-Man's new suit in Brand New Day."),
    ("@KevinFeige", "Kevin Feige", "Spider-Man: Brand New Day is something we've never attempted before in the MCU."),
    ("@PhaseZero", "Phase Zero", "Brand New Day set photos reveal a destroyed NYC skyline. Full breakdown on our podcast."),
]
_LOCATIONS = ["Washington Square Park", "Brooklyn Bridge", "Times Square", "Central Park",
              "Queensboro Bridge", "Tokyo Tower", "Empire State Building", "Grand Central",
              "Statue of Liberty", "Rockefeller Center", "London Eye", "Eiffel Tower"]
_THEORIES = ["the Sinister Six assemble", "Peter loses his powers", "multiverse collapse",
             "Venom returns", "Miles Morales appears", "MJ gets powers"]

def _generate_youtube_page(offset, limit):
    items = []
    for i in range(offset, offset + limit):
        tpl = _YT_TEMPLATES[i % len(_YT_TEMPLATES)]
        items.append({
            "id": "yt{:04d}".format(i),
            "title": tpl[0].format(n=i + 1),
            "channel": tpl[1],
            "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
            "url": "https://www.youtube.com/results?search_query=spider-man+brand+new+day+{}".format(i),
            "views": tpl[2],
            "date": "2026-{:02d}-{:02d}".format((i % 12) + 1, (i % 28) + 1),
        })
    return items

def _generate_reddit_page(offset, limit):
    items = []
    for i in range(offset, offset + limit):
        tpl = _REDDIT_TEMPLATES[i % len(_REDDIT_TEMPLATES)]
        loc = _LOCATIONS[i % len(_LOCATIONS)]
        theory = _THEORIES[i % len(_THEORIES)]
        items.append({
            "id": "r{:04d}".format(i),
            "title": tpl[0].format(loc=loc, theory=theory),
            "author": tpl[1],
            "subreddit": "spiderman",
            "url": "https://www.reddit.com/r/Spiderman/search/?q=spider-man+brand+new+day&sort=new",
            "score": tpl[2] + i * 10,
            "num_comments": tpl[3] + i,
            "thumbnail": None,
            "created_utc": 1754400000 - i * 3600,
            "is_spoiler": i % 7 == 0,
            "preview": "Discussion about Spider-Man: Brand New Day. Share your thoughts and theories!",
        })
    return items

def _generate_x_page(offset, limit):
    items = []
    for i in range(offset, offset + limit):
        tpl = _X_TEMPLATES[i % len(_X_TEMPLATES)]
        loc = _LOCATIONS[i % len(_LOCATIONS)]
        text = tpl[2].replace("{loc}", loc).replace("{n}", str(i + 1))
        items.append({
            "id": "t{:04d}".format(i),
            "author": tpl[0],
            "handle": tpl[1],
            "text": text,
            "likes": "{}K".format((i * 37 + 1200) // 1000),
            "retweets": "{}K".format((i * 15 + 300) // 1000),
            "date": "2026-{:02d}-{:02d}".format((i % 12) + 1, (i % 28) + 1),
            "url": "https://x.com/search?q=spider-man+brand+new+day",
        })
    return items

MOCK_YOUTUBE_VIDEOS = [
    {"id": "0ceb-6OoJw8", "title": "A Message From Ned Leeds - Spider-Man: Brand New Day", "channel": "Sony Pictures", "thumbnail": "https://img.youtube.com/vi/0ceb-6OoJw8/hqdefault.jpg", "url": "https://www.youtube.com/watch?v=0ceb-6OoJw8", "views": "1.2M", "date": "2026-06-15"},
    {"id": "P3uI5sLosKU", "title": "Spider-Man: Brand New Day - Official Trailer", "channel": "Sony Pictures", "thumbnail": "https://img.youtube.com/vi/P3uI5sLosKU/hqdefault.jpg", "url": "https://www.youtube.com/watch?v=P3uI5sLosKU", "views": "8.5M", "date": "2026-05-20"},
    {"id": "dQw4w9WgXcQ", "title": "Spider-Man: Brand New Day - Behind the Scenes", "channel": "Marvel Entertainment", "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "views": "3.1M", "date": "2026-04-10"},
    {"id": "jNQXAC9IVRw", "title": "Spider-Man Swings Into NYC - Fan Reactions", "channel": "SpiderFan Channel", "thumbnail": "https://img.youtube.com/vi/jNQXAC9IVRw/hqdefault.jpg", "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "views": "450K", "date": "2026-06-01"},
    {"id": "kJQP7kiw5Fk", "title": "Spider-Man: Brand New Day - All Easter Eggs", "channel": "Screen Rant", "thumbnail": "https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg", "url": "https://www.youtube.com/watch?v=kJQP7kiw5Fk", "views": "2.3M", "date": "2026-05-25"},
    {"id": "9bZkp7q19f0", "title": "Spider-Man PS5 Gameplay Walkthrough - Swinging Through NYC", "channel": "GameRanx", "thumbnail": "https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg", "url": "https://www.youtube.com/watch?v=9bZkp7q19f0", "views": "1.8M", "date": "2026-03-15"},
    {"id": "OPfOtQw0qY8", "title": "Every Spider-Man Movie Ranked Worst to Best", "channel": "IGN", "thumbnail": "https://img.youtube.com/vi/OPfOtQw0qY8/hqdefault.jpg", "url": "https://www.youtube.com/watch?v=OPfOtQw0qY8", "views": "4.2M", "date": "2026-02-20"},
    {"id": "RgKAFK5djSk", "title": "Spider-Man Villains Explained - Complete Lore Guide", "channel": "Comicstorian", "thumbnail": "https://img.youtube.com/vi/RgKAFK5djSk/hqdefault.jpg", "url": "https://www.youtube.com/watch?v=RgKAFK5djSk", "views": "980K", "date": "2026-01-10"},
    {"id": "3JZ_D3ELwOQ", "title": "Tom Holland Reacts to Spider-Man Fan Theories", "channel": "Vanity Fair", "thumbnail": "https://img.youtube.com/vi/3JZ_D3ELwOQ/hqdefault.jpg", "url": "https://www.youtube.com/watch?v=3JZ_D3ELwOQ", "views": "5.6M", "date": "2026-03-01"},
    {"id": "fJ9rUzIMcZQ", "title": "Spider-Man Suit Collection - Every Costume Explained", "channel": "Screen Crush", "thumbnail": "https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg", "url": "https://www.youtube.com/watch?v=fJ9rUzIMcZQ", "views": "1.5M", "date": "2026-04-05"},
]

MOCK_TWEETS = [
    {"id": "t1", "author": "@SpiderManMovie", "handle": "Spider-Man: Brand New Day", "text": "The web-slinger is back! Brand New Day hits theaters July 2026. Are you ready? #SpiderMan #BrandNewDay", "likes": "12.4K", "retweets": "3.2K", "date": "2026-06-20"},
    {"id": "t2", "author": "@TomHolland1996", "handle": "Tom Holland", "text": "Can't wait for you all to see what we've been working on. This one is special.", "likes": "245K", "retweets": "89K", "date": "2026-06-18"},
    {"id": "t3", "author": "@Marvel", "handle": "Marvel Entertainment", "text": "Spider-Man: Brand New Day - swinging into a new era. Watch the official trailer now!", "likes": "56K", "retweets": "18K", "date": "2026-06-15"},
    {"id": "t4", "author": "@spideytracker", "handle": "Spidey Tracker", "text": "NYC sighting confirmed! Spider-Man spotted at Washington Square Park at 3:42 PM. Keep your eyes on the sky", "likes": "8.7K", "retweets": "2.1K", "date": "2026-06-22"},
    {"id": "t5", "author": "@SonyPictures", "handle": "Sony Pictures", "text": "Every hero has a new beginning. Spider-Man: Brand New Day - only in theaters July 2026.", "likes": "32K", "retweets": "11K", "date": "2026-06-10"},
    {"id": "t6", "author": "@MarvelStudios", "handle": "Marvel Studios", "text": "The multiverse expands. Spider-Man's next chapter begins. #BrandNewDay", "likes": "78K", "retweets": "24K", "date": "2026-06-12"},
    {"id": "t7", "author": "@NYC_Spidey", "handle": "NYC Spidey Watch", "text": "Another confirmed sighting near the Brooklyn Bridge! Photo evidence uploaded to Spidey Tracker.", "likes": "5.3K", "retweets": "1.8K", "date": "2026-06-25"},
    {"id": "t8", "author": "@ComicBookHQ", "handle": "Comic Book HQ", "text": "BREAKING: Spider-Man: Brand New Day teaser poster leaked! Check it out on our site.", "likes": "15K", "retweets": "6.7K", "date": "2026-06-08"},
    {"id": "t9", "author": "@zendaya", "handle": "Zendaya", "text": "Back on set with my favorite web-slinger. 2026 is going to be amazing.", "likes": "512K", "retweets": "102K", "date": "2026-05-30"},
    {"id": "t10", "author": "@RedditSpider", "handle": "r/Spiderman", "text": "Hot on r/Spiderman: 'Spider-Man Brand New Day fanart by @jorge.tinoco' - the community is loving this one!", "likes": "3.2K", "retweets": "890", "date": "2026-06-28"},
    {"id": "t11", "author": "@PhaseZero", "handle": "Phase Zero Podcast", "text": "Spider-Man: Brand New Day set photos reveal a destroyed NYC skyline. What does this mean for Peter Parker's future? Full breakdown on our podcast.", "likes": "4.1K", "retweets": "1.2K", "date": "2026-07-15"},
    {"id": "t12", "author": "@EmpireMagazine", "handle": "Empire Magazine", "text": "EXCLUSIVE: First look at Spider-Man's new suit in Brand New Day. The web pattern has been completely redesigned. Pick up the new issue for the full reveal.", "likes": "67K", "retweets": "21K", "date": "2026-07-10"},
    {"id": "t13", "author": "@TomHolland1996", "handle": "Tom Holland", "text": "Wrap day on Spider-Man 4. I cannot thank this crew enough. This one is for you, the fans. Brand New Day is coming. 🕷️🕸️", "likes": "890K", "retweets": "156K", "date": "2026-07-20"},
    {"id": "t14", "author": "@Collider", "handle": "Collider", "text": "SPIDER-MAN: BRAND NEW DAY will reportedly feature the most ambitious action sequence in MCU history. Sources say the third act chase took 3 months to film.", "likes": "18K", "retweets": "7.3K", "date": "2026-07-05"},
    {"id": "t15", "author": "@IGN", "handle": "IGN", "text": "Spider-Man: Brand New Day — everything we know so far: new villains, new suit, new director. The full breakdown: [THREAD] 🧵", "likes": "34K", "retweets": "12K", "date": "2026-06-30"},
    {"id": "t16", "author": "@spideytracker", "handle": "Spidey Tracker", "text": "BREAKING: Confirmed sighting at Tokyo Tower! Spider-Man spotted during the global press tour. Photo evidence now live on the tracker. 🗼🕷️", "likes": "12K", "retweets": "4.5K", "date": "2026-07-22"},
    {"id": "t17", "author": "@KevinFeige", "handle": "Kevin Feige", "text": "I can confidently say Spider-Man: Brand New Day is something we've never attempted before in the MCU. Peter Parker's journey takes a turn no one expects.", "likes": "145K", "retweets": "38K", "date": "2026-07-18"},
    {"id": "t18", "author": "@NYC_Spidey", "handle": "NYC Spidey Watch", "text": "RUMOR: Spider-Man filming spotted near the Queensboro Bridge last night. Multiple extras in superhero costumes seen. Brand New Day wrapping up production!", "likes": "6.8K", "retweets": "2.9K", "date": "2026-07-19"},
    {"id": "t19", "author": "@ComicBookHQ", "handle": "Comic Book HQ", "text": "The new Spider-Man: Brand New Day poster just dropped and it is STUNNING. The color palette shifts to warm tones — a new era for Peter Parker.", "likes": "22K", "retweets": "9.1K", "date": "2026-07-08"},
    {"id": "t20", "author": "@SpiderManMovie", "handle": "Spider-Man: Brand New Day", "text": "He's not just swinging. He's falling. And that's when Spider-Man is most dangerous. Brand New Day — only in theaters. 🕸️", "likes": "89K", "retweets": "34K", "date": "2026-07-21"},
]

MOCK_REDDIT_POSTS = [
    {"id": "r1", "title": "Spotted Spider-Man swinging through Brooklyn Heights!", "author": "u/webslinger_fan", "subreddit": "spiderman", "url": "https://www.reddit.com/r/Spiderman/", "score": 2847, "num_comments": 156, "thumbnail": None, "created_utc": 1754400000, "is_spoiler": False},
    {"id": "r2", "title": "Spider-Man: Brand New Day trailer breakdown - all Easter eggs", "author": "u/marvel_detective", "subreddit": "spiderman", "url": "https://www.reddit.com/r/Spiderman/", "score": 5120, "num_comments": 423, "thumbnail": None, "created_utc": 1754380000, "is_spoiler": False},
    {"id": "r3", "title": "Peter Parker's apartment building in real life (20 Clinton St)", "author": "u/nyc_explorer", "subreddit": "spiderman", "url": "https://www.reddit.com/r/Spiderman/", "score": 1893, "num_comments": 87, "thumbnail": None, "created_utc": 1754350000, "is_spoiler": False},
    {"id": "r4", "title": "Cosplayed as Spider-Man at Times Square, got mobbed by tourists", "author": "u/friendly_neighborhood", "subreddit": "spiderman", "url": "https://www.reddit.com/r/Spiderman/", "score": 3456, "num_comments": 201, "thumbnail": None, "created_utc": 1754320000, "is_spoiler": False},
    {"id": "r5", "title": "Spider-Man Brand New Day drawing by me", "author": "u/Chrrisdraws", "subreddit": "spiderman", "url": "https://www.reddit.com/r/Spiderman/", "score": 8901, "num_comments": 567, "thumbnail": None, "created_utc": 1754300000, "is_spoiler": False},
    {"id": "r6", "title": "Captain America standing up for Spider-Man in Spidey 1-10 will never get old", "author": "u/JonathanRL", "subreddit": "spiderman", "url": "https://www.reddit.com/r/Spiderman/", "score": 2103, "num_comments": 134, "thumbnail": None, "created_utc": 1754280000, "is_spoiler": False},
    {"id": "r7", "title": "Last Stand Spider-Man Backstory Revealed", "author": "u/Potential-Mess6826", "subreddit": "spiderman", "url": "https://www.reddit.com/r/Spiderman/", "score": 1678, "num_comments": 92, "thumbnail": None, "created_utc": 1754260000, "is_spoiler": True},
    {"id": "r8", "title": "Made a drawing of Miles in my pretty derivative own design", "author": "u/NerveConscious6375", "subreddit": "spiderman", "url": "https://www.reddit.com/r/Spiderman/", "score": 3421, "num_comments": 178, "thumbnail": None, "created_utc": 1754240000, "is_spoiler": False},
    {"id": "r9", "title": "Spider-Man and Invincible - This Goes Hard", "author": "u/Turbulent_Dig_2487", "subreddit": "spiderman", "url": "https://www.reddit.com/r/Spiderman/", "score": 5612, "num_comments": 289, "thumbnail": None, "created_utc": 1754220000, "is_spoiler": False},
    {"id": "r10", "title": "We Have Heard You on Anti-Bot Provisions", "author": "u/Lox22", "subreddit": "spiderman", "url": "https://www.reddit.com/r/Spiderman/", "score": 1203, "num_comments": 445, "thumbnail": None, "created_utc": 1754200000, "is_spoiler": False},
]

def _fetch_youtube_rss(limit=10):
    """Fetch real Spider-Man related videos from Sony Pictures + Marvel YouTube RSS."""
    channels = [
        ('Sony Pictures', 'https://www.youtube.com/feeds/videos.xml?user=SonyPictures'),
        ('Marvel Entertainment', 'https://www.youtube.com/feeds/videos.xml?user=Marvel'),
    ]
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    ns = {'a': 'http://www.w3.org/2005/Atom',
          'yt': 'http://www.youtube.com/xml/schemas/2015',
          'media': 'http://search.yahoo.com/mrss/'}
    keywords = ['spider-man', 'spiderman', 'spidey', 'peter parker', 'tom holland',
                'brand new day', 'web-slinger', 'venom', 'marvel', 'mcu', 'avengers']
    all_videos = []
    for channel_name, url in channels:
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            resp = urllib.request.urlopen(req, timeout=10, context=ctx)
            root = ET.fromstring(resp.read().decode('utf-8'))
            for e in root.findall('a:entry', ns):
                title_el = e.find('a:title', ns)
                title = title_el.text if title_el is not None else ''
                vid_id_el = e.find('yt:videoId', ns)
                vid_id = vid_id_el.text if vid_id_el is not None else ''
                if not vid_id:
                    continue
                link_el = e.find('a:link', ns)
                link = link_el.get('href', '') if link_el is not None else ''
                pub_el = e.find('a:published', ns)
                pub = pub_el.text[:10] if pub_el is not None and pub_el.text else ''
                thumb = ''
                views = '0'
                mg = e.find('media:group', ns)
                if mg is not None:
                    th = mg.find('media:thumbnail', ns)
                    if th is not None:
                        thumb = th.get('url', '')
                    comm = mg.find('media:community', ns)
                    if comm is not None:
                        st = comm.find('media:statistics', ns)
                        if st is not None:
                            v = int(st.get('views', '0'))
                            if v >= 1000000:
                                views = f'{v/1000000:.1f}M'
                            elif v >= 1000:
                                views = f'{v/1000:.1f}K'
                            else:
                                views = str(v)
                all_videos.append({
                    'id': vid_id,
                    'title': title,
                    'channel': channel_name,
                    'thumbnail': thumb or f'https://img.youtube.com/vi/{vid_id}/hqdefault.jpg',
                    'url': link or f'https://www.youtube.com/watch?v={vid_id}',
                    'views': views,
                    'date': pub,
                })
        except Exception as ex:
            print(f'[YouTube RSS] {channel_name} fetch failed: {ex}')
    if all_videos:
        all_videos.sort(key=lambda x: x.get('date', ''), reverse=True)
        return all_videos[:limit]
    return None


def _fetch_reddit_rss(limit=10):
    """Fetch real r/Spiderman posts via RSS feed. Returns list of dicts or None."""
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(
            'https://www.reddit.com/r/spiderman/.rss?limit=' + str(limit),
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        resp = urllib.request.urlopen(req, timeout=10, context=ctx)
        root = ET.fromstring(resp.read().decode('utf-8'))
        ns_match = re.match(r'\{(.+?)\}', root.tag)
        ns = {'a': ns_match.group(1)} if ns_match else {}
        entries = root.findall('.//a:entry', ns) if ns else root.findall('.//entry')
        if not entries:
            entries = root.findall('.//item')
        posts = []
        for entry in entries[:limit]:
            t = entry.find('a:title', ns) if ns else entry.find('title')
            title = t.text if t is not None else 'Untitled'
            link = ''
            l = entry.find('a:link', ns) if ns else entry.find('link')
            if l is not None:
                link = l.get('href') or l.text or ''
            author = 'unknown'
            a = entry.find('a:author', ns) if ns else entry.find('author')
            if a is not None:
                n = a.find('a:name', ns) if ns else a.find('name')
                if n is not None:
                    author = n.text or 'unknown'
                elif a.text:
                    author = a.text
            summary = ''
            s = entry.find('a:content', ns) if ns else entry.find('content')
            if s is None:
                s = entry.find('a:summary', ns) if ns else entry.find('summary')
            if s is not None and s.text:
                summary = re.sub(r'<[^>]+>', '', s.text).strip()[:200]
            posts.append({
                'id': link[-12:] if link else str(len(posts)),
                'title': title,
                'author': author,
                'subreddit': 'spiderman',
                'url': link or 'https://www.reddit.com/r/Spiderman/',
                'score': 0,
                'num_comments': 0,
                'thumbnail': None,
                'created_utc': 0,
                'is_spoiler': False,
                'preview': summary,
            })
        return posts if posts else None
    except Exception as e:
        print(f'[Reddit RSS] Fetch failed: {e}')
        return None

def _get_cached(key, fetcher, force=False):
    """Get cached data or fetch fresh. TTL = _CACHE_TTL seconds."""
    now = time.time()
    entry = _social_cache.get(key)
    if entry and not force and (now - entry['ts']) < _CACHE_TTL:
        return entry['data']
    data = fetcher()
    if data is not None:
        _social_cache[key] = {'data': data, 'ts': now}
    elif entry:
        return entry['data']
    return data

@app.route('/api/social/youtube', methods=['GET'])
def social_youtube():
    force = request.args.get('refresh', '').lower() == 'true'
    offset = max(0, int(request.args.get('offset', 0)))
    limit = min(50, max(1, int(request.args.get('limit', 10))))
    if offset == 0:
        force = True
    def fetch():
        real = _fetch_youtube_rss(15)
        if real:
            return {"videos": real, "source": "youtube", "count": len(real), "live": True}
        return {"videos": MOCK_YOUTUBE_VIDEOS, "source": "youtube", "count": len(MOCK_YOUTUBE_VIDEOS), "live": False}
    result = _get_cached('youtube', fetch, force)
    if result is None:
        result = {"videos": MOCK_YOUTUBE_VIDEOS, "source": "youtube", "count": len(MOCK_YOUTUBE_VIDEOS), "live": False}
    if offset > 0:
        gen = _generate_youtube_page(offset, limit)
        return jsonify({"videos": gen, "source": "youtube", "count": len(gen), "live": False, "offset": offset, "has_more": True})
    return jsonify({**result, "offset": 0, "has_more": True})

@app.route('/api/social/reddit', methods=['GET'])
def social_reddit():
    force = request.args.get('refresh', '').lower() == 'true'
    offset = max(0, int(request.args.get('offset', 0)))
    limit = min(50, max(1, int(request.args.get('limit', 10))))
    if offset == 0:
        force = True
    def fetch():
        real_posts = _fetch_reddit_rss(15)
        if real_posts:
            return {"posts": real_posts, "source": "reddit", "count": len(real_posts), "live": True}
        return {"posts": MOCK_REDDIT_POSTS, "source": "reddit", "count": len(MOCK_REDDIT_POSTS), "live": False}
    result = _get_cached('reddit', fetch, force)
    if result is None:
        result = {"posts": MOCK_REDDIT_POSTS, "source": "reddit", "count": len(MOCK_REDDIT_POSTS), "live": False}
    if offset > 0:
        gen = _generate_reddit_page(offset, limit)
        return jsonify({"posts": gen, "source": "reddit", "count": len(gen), "live": False, "offset": offset, "has_more": True})
    return jsonify({**result, "offset": 0, "has_more": True})

@app.route('/api/social/x', methods=['GET'])
def social_x():
    force = request.args.get('refresh', '').lower() == 'true'
    offset = max(0, int(request.args.get('offset', 0)))
    limit = min(50, max(1, int(request.args.get('limit', 10))))
    if offset == 0:
        force = True
    def fetch():
        pool = MOCK_TWEETS.copy()
        random.shuffle(pool)
        return {"tweets": pool[:10], "source": "x", "count": 10, "total_pool": len(MOCK_TWEETS)}
    result = _get_cached('x', fetch, force)
    if offset > 0:
        gen = _generate_x_page(offset, limit)
        return jsonify({"tweets": gen, "source": "x", "count": len(gen), "live": False, "offset": offset, "has_more": True})
    return jsonify({**result, "offset": 0, "has_more": True})

@app.route('/api/social/all', methods=['GET'])
def social_all():
    force = request.args.get('refresh', '').lower() == 'true'
    def _yt_fetch():
        v = _fetch_youtube_rss(10)
        if v:
            return {"videos": v, "source": "youtube", "count": len(v), "live": True}
        return {"videos": MOCK_YOUTUBE_VIDEOS, "source": "youtube", "count": len(MOCK_YOUTUBE_VIDEOS), "live": False}
    yt = _get_cached('youtube', _yt_fetch, force)
    def _reddit_fetch():
        p = _fetch_reddit_rss(10)
        if p:
            return {"posts": p, "source": "reddit", "count": len(p), "live": True}
        return {"posts": MOCK_REDDIT_POSTS, "source": "reddit", "count": len(MOCK_REDDIT_POSTS), "live": False}
    rd = _get_cached('reddit', _reddit_fetch, force)
    def _x_fetch():
        pool = MOCK_TWEETS.copy()
        random.shuffle(pool)
        return {"tweets": pool[:10], "source": "x", "count": 10, "total_pool": len(MOCK_TWEETS)}
    tw = _get_cached('x', _x_fetch, force)
    return jsonify({
        "youtube": yt,
        "reddit": rd,
        "x": tw,
        "total": (yt or {}).get('count', 0) + (rd or {}).get('count', 0) + (tw or {}).get('count', 0),
    })

# Static file serving (unified deployment — Flask serves both frontend + API)
@app.route('/')
def serve_index():
    return send_from_directory(SRC_DIR, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    file_path = os.path.join(SRC_DIR, path)
    if os.path.isfile(file_path):
        return send_from_directory(SRC_DIR, path)
    return jsonify({'error': 'Not found'}), 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    print(f'Spider-Man Tracker starting on http://0.0.0.0:{port}')
    app.run(host='0.0.0.0', port=port, debug=debug)

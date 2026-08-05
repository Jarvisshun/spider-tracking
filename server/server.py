# UGC Backend Server — Spider-Man Sighting Upload API
import os, json, uuid, hashlib
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
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

    # Check file size
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > MAX_FILE_SIZE:
        return jsonify({'error': f'文件过大: {size/1024/1024:.1f}MB，最大 {MAX_FILE_SIZE/1024/1024:.0f}MB'}), 400

    description = request.form.get('description', '').strip()
    lat = request.form.get('lat', '')
    lng = request.form.get('lng', '')
    author = request.form.get('author', '匿名用户').strip() or '匿名用户'

    # Content moderation
    passed, reason = moderate_content(description, file.filename)
    if not passed:
        return jsonify({'error': reason, 'moderation_failed': True}), 400

    # Save file
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
# Social Media Feed API
# ============================================================
import urllib.request, ssl

# Mock YouTube data (real API would need GOOGLE_API_KEY)
MOCK_YOUTUBE_VIDEOS = [
    {"id": "0ceb-6OoJw8", "title": "A Message From Ned Leeds - Spider-Man: Brand New Day", "channel": "Sony Pictures", "thumbnail": "https://img.youtube.com/vi/0ceb-6OoJw8/hqdefault.jpg", "url": "https://www.youtube.com/watch?v=0ceb-6OoJw8", "views": "1.2M", "date": "2026-06-15"},
    {"id": "P3uI5sLosKU", "title": "Spider-Man: Brand New Day - Official Trailer", "channel": "Sony Pictures", "thumbnail": "https://img.youtube.com/vi/P3uI5sLosKU/hqdefault.jpg", "url": "https://www.youtube.com/watch?v=P3uI5sLosKU", "views": "8.5M", "date": "2026-05-20"},
    {"id": "dQw4w9WgXcQ", "title": "Spider-Man: Brand New Day - Behind the Scenes", "channel": "Marvel Entertainment", "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "views": "3.1M", "date": "2026-04-10"},
    {"id": "jNQXAC9IVRw", "title": "Spider-Man Swings Into NYC - Fan Reactions", "channel": "SpiderFan Channel", "thumbnail": "https://img.youtube.com/vi/jNQXAC9IVRw/hqdefault.jpg", "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "views": "450K", "date": "2026-06-01"},
    {"id": "kJQP7kiw5Fk", "title": "Spider-Man: Brand New Day - All Easter Eggs", "channel": "Screen Rant", "thumbnail": "https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg", "url": "https://www.youtube.com/watch?v=kJQP7kiw5Fk", "views": "2.3M", "date": "2026-05-25"},
]

# Mock X/Twitter feed
MOCK_TWEETS = [
    {"id": "t1", "author": "@SpiderManMovie", "handle": "Spider-Man: Brand New Day", "avatar": "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png", "text": "The web-slinger is back! 🕸️ Brand New Day hits theaters July 2026. Are you ready? #SpiderMan #BrandNewDay", "likes": "12.4K", "retweets": "3.2K", "date": "2026-06-20"},
    {"id": "t2", "author": "@TomHolland1996", "handle": "Tom Holland", "avatar": "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png", "text": "Can't wait for you all to see what we've been working on. This one is special. 🕷️❤️", "likes": "245K", "retweets": "89K", "date": "2026-06-18"},
    {"id": "t3", "author": "@Marvel", "handle": "Marvel Entertainment", "avatar": "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png", "text": "Spider-Man: Brand New Day — swinging into a new era. Watch the official trailer now! 🏙️", "likes": "56K", "retweets": "18K", "date": "2026-06-15"},
    {"id": "t4", "author": "@spideytracker", "handle": "Spidey Tracker", "avatar": "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png", "text": "NYC sighting confirmed! Spider-Man spotted at Washington Square Park at 3:42 PM. Keep your eyes on the sky 👀🕸️", "likes": "8.7K", "retweets": "2.1K", "date": "2026-06-22"},
    {"id": "t5", "author": "@SonyPictures", "handle": "Sony Pictures", "avatar": "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png", "text": "Every hero has a new beginning. Spider-Man: Brand New Day — only in theaters July 2026.", "likes": "32K", "retweets": "11K", "date": "2026-06-10"},
]

@app.route('/api/social/youtube', methods=['GET'])
def social_youtube():
    """Return Spider-Man related YouTube videos (mock data)."""
    return jsonify({"videos": MOCK_YOUTUBE_VIDEOS, "source": "youtube", "count": len(MOCK_YOUTUBE_VIDEOS)})

MOCK_REDDIT_POSTS = [
    {"id": "r1", "title": "Spotted Spider-Man swinging through Brooklyn Heights!", "author": "u/webslinger_fan", "subreddit": "spiderman", "url": "https://www.reddit.com/r/spiderman/", "score": 2847, "num_comments": 156, "thumbnail": None, "created_utc": 1754400000, "is_spoiler": False},
    {"id": "r2", "title": "Spider-Man: Brand New Day trailer breakdown — all Easter eggs", "author": "u/marvel_detective", "subreddit": "spiderman", "url": "https://www.reddit.com/r/spiderman/", "score": 5120, "num_comments": 423, "thumbnail": None, "created_utc": 1754380000, "is_spoiler": False},
    {"id": "r3", "title": "Peter Parker's apartment building in real life (20 Clinton St)", "author": "u/nyc_explorer", "subreddit": "spiderman", "url": "https://www.reddit.com/r/spiderman/", "score": 1893, "num_comments": 87, "thumbnail": None, "created_utc": 1754350000, "is_spoiler": False},
    {"id": "r4", "title": "Cosplayed as Spider-Man at Times Square, got mobbed by tourists", "author": "u/friendly_neighborhood", "subreddit": "spiderman", "url": "https://www.reddit.com/r/spiderman/", "score": 3456, "num_comments": 201, "thumbnail": None, "created_utc": 1754320000, "is_spoiler": False},
    {"id": "r5", "title": "Official Spidey Tracker website just launched — check it out!", "author": "u/sonypictures", "subreddit": "spiderman", "url": "https://www.reddit.com/r/spiderman/", "score": 8901, "num_comments": 567, "thumbnail": None, "created_utc": 1754300000, "is_spoiler": False},
]

@app.route('/api/social/reddit', methods=['GET'])
def social_reddit():
    """Fetch r/spiderman hot posts via Reddit public JSON API, fallback to mock."""
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(
            'https://www.reddit.com/r/spiderman/hot.json?limit=10',
            headers={'User-Agent': 'Mozilla/5.0 (compatible; SpideyTracker/1.0)'}
        )
        resp = urllib.request.urlopen(req, timeout=8, context=ctx)
        data = json.loads(resp.read().decode('utf-8'))
        posts = []
        for child in data.get('data', {}).get('children', []):
            d = child['data']
            posts.append({
                'id': d['id'],
                'title': d['title'],
                'author': d['author'],
                'subreddit': d['subreddit'],
                'url': f"https://www.reddit.com{d['permalink']}",
                'score': d['score'],
                'num_comments': d['num_comments'],
                'thumbnail': d.get('thumbnail', '') if d.get('thumbnail', '').startswith('http') else None,
                'created_utc': d['created_utc'],
                'is_spoiler': d.get('spoiler', False),
            })
        if posts:
            return jsonify({"posts": posts, "source": "reddit", "count": len(posts)})
    except Exception:
        pass
    return jsonify({"posts": MOCK_REDDIT_POSTS, "source": "reddit", "count": len(MOCK_REDDIT_POSTS)})

@app.route('/api/social/x', methods=['GET'])
def social_x():
    """Return Spider-Man related X/Twitter posts (mock data)."""
    return jsonify({"tweets": MOCK_TWEETS, "source": "x", "count": len(MOCK_TWEETS)})

@app.route('/api/social/all', methods=['GET'])
def social_all():
    """Aggregate all social media feeds."""
    yt = social_youtube().get_json()
    rd = social_reddit().get_json()
    tw = social_x().get_json()
    return jsonify({
        "youtube": yt,
        "reddit": rd,
        "x": tw,
        "total": yt.get('count', 0) + rd.get('count', 0) + tw.get('count', 0),
    })

if __name__ == '__main__':
    print('🕷️  Spidey Tracker UGC Backend starting on http://127.0.0.1:5000')
    app.run(host='127.0.0.1', port=5000, debug=True)
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

if __name__ == '__main__':
    print('🕷️  Spidey Tracker UGC Backend starting on http://127.0.0.1:5000')
    app.run(host='127.0.0.1', port=5000, debug=True)
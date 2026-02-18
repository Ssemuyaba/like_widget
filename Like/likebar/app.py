from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, join_room, emit
import hashlib, os, time

# ----------------- APP SETUP ----------------
app = Flask(__name__)
app.config.from_object("config.Config")  # make sure your Config has SQLALCHEMY_DATABASE_URI
CORS(app, resources={r"/api/*": {"origins": "*"}})
db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*")  # real-time updates
#-----Reflect-------

# Allow only your blog to access the API
CORS(app, origins=["https://www.reflectdc.org"])

# ----------------- MODELS -----------------
class Tenant(db.Model):
    __tablename__ = "tenants"
    id = db.Column(db.String, primary_key=True, default=lambda: os.urandom(16).hex())
    name = db.Column(db.String, nullable=False)
    api_key = db.Column(db.String, unique=True)
    allowed_domains = db.Column(db.String)
    created_at = db.Column(db.DateTime, default=db.func.now())
    active = db.Column(db.Boolean, default=True)
    pages = db.relationship("Page", backref="tenant", lazy=True)

class Page(db.Model):
    __tablename__ = "pages"
    id = db.Column(db.String, primary_key=True, default=lambda: os.urandom(16).hex())
    tenant_id = db.Column(db.String, db.ForeignKey("tenants.id"), nullable=True)
    page_key = db.Column(db.String, unique=True, nullable=False)
    likes_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=db.func.now())
    likes = db.relationship("Like", backref="page", lazy=True)
    comments = db.relationship("Comment", backref="page", lazy=True)

class Like(db.Model):
    __tablename__ = "likes"
    id = db.Column(db.Integer, primary_key=True)
    page_id = db.Column(db.String, db.ForeignKey("pages.id"))
    ip_hash = db.Column(db.String, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.now())
    __table_args__ = (db.UniqueConstraint("page_id", "ip_hash", name="uniq_like"),)

class Comment(db.Model):
    __tablename__ = "comments"
    id = db.Column(db.Integer, primary_key=True)
    page_id = db.Column(db.String, db.ForeignKey("pages.id"))
    name = db.Column(db.String(100))
    comment = db.Column(db.Text)
    ip_hash = db.Column(db.String)
    created_at = db.Column(db.DateTime, default=db.func.now())

with app.app_context():
    db.create_all()

# ----------------- HELPERS -----------------
RATE_LIMIT = {}

def get_client_ip():
    if request.headers.get("X-Forwarded-For"):
        return request.headers.get("X-Forwarded-For").split(",")[0]
    return request.remote_addr or "0.0.0.0"

def hash_ip(ip):
    salt = app.config["IP_SALT"]
    return hashlib.sha256(f"{ip}{salt}".encode()).hexdigest()

def is_limited(ip, limit=10, window=60):
    now = time.time()
    hits = RATE_LIMIT.get(ip, [])
    hits = [t for t in hits if now - t < window]
    if len(hits) >= limit:
        return True
    hits.append(now)
    RATE_LIMIT[ip] = hits
    return False

# ----------------- ROUTES -----------------
@app.route("/api/page/init", methods=["POST"])
def init_page():
    page_key = request.json.get("page_key")
    if not page_key:
        return jsonify({"error": "Missing page_key"}), 400
    page = Page.query.filter_by(page_key=page_key).first()
    if not page:
        page = Page(page_key=page_key)
        db.session.add(page)
        db.session.commit()
    return jsonify({"page_id": page.id, "likes": page.likes_count})

@app.route("/api/page/<path:page_key>")
def get_page(page_key):
    page = Page.query.filter_by(page_key=page_key).first()
    if not page:
        return jsonify({"likes": 0, "comments": []})
    comments = Comment.query.filter_by(page_id=page.id).order_by(Comment.created_at.desc()).limit(100)
    return jsonify({
        "likes": page.likes_count,
        "comments": [{"name": c.name, "comment": c.comment, "time": c.created_at.isoformat()} for c in comments]
    })
# ----------------- ROUTES -----------------
# ----------------- ROUTES -----------------
@app.route("/api/like", methods=["POST"])
def like():
    try:
        data = request.get_json(force=True)
    except Exception as e:
        return jsonify({"error": "Invalid JSON"}), 400

    page_key = data.get("page_key")
    if not page_key:
        return jsonify({"error": "Missing page_key"}), 400

    ip = get_client_ip()
    if is_limited(ip):
        return jsonify({"error": "Too many requests"}), 429

    ip_hash = hash_ip(ip)
    page = Page.query.filter_by(page_key=page_key).first()
    if not page:
        return jsonify({"error": "Page not initialized"}), 400

    if Like.query.filter_by(page_id=page.id, ip_hash=ip_hash).first():
        return jsonify({"likes": page.likes_count})

    like_obj = Like(page_id=page.id, ip_hash=ip_hash)
    page.likes_count += 1
    db.session.add(like_obj)
    db.session.commit()

    socketio.emit("like_update", {"likes": page.likes_count}, room=page.page_key)
    return jsonify({"likes": page.likes_count})


@app.route("/api/comment", methods=["POST"])
def comment():
    try:
        data = request.get_json(force=True)
        print("Incoming comment JSON:", data)
    except Exception as e:
        print("JSON parse error:", e)
        return jsonify({"error": "Invalid JSON"}), 400

    page_key = data.get("page_key")
    name = data.get("name", "").strip()  # take name if provided
    text = (data.get("comment") or "").strip()

    if not page_key or not text or len(text) > 500:
        print("Validation failed:", data)
        return jsonify({"error": "Invalid request"}), 400

    ip = get_client_ip()
    if is_limited(ip, limit=5):
        return jsonify({"error": "Too many comments"}), 429

    ip_hash = hash_ip(ip)
    page = Page.query.filter_by(page_key=page_key).first()
    if not page:
        return jsonify({"error": "Page not initialized"}), 400

    # --- AUTO-NAME LOGIC ---
    if not name:
        # Count how many comments already exist on this page
        count = Comment.query.filter_by(page_id=page.id).count()
        name = f"User{count + 1}"  # ascending number

    comment_obj = Comment(page_id=page.id, name=name, comment=text, ip_hash=ip_hash)
    db.session.add(comment_obj)
    db.session.commit()

    # Emit to frontend
    socketio.emit("comment_update", {"name": name, "comment": text}, room=page.page_key)
    return jsonify({"status": "ok", "name": name})

# ----------------- SOCKET -----------------
@socketio.on("join")
def handle_join(data):
    page_key = data.get("page_key")
    join_room(page_key)

@app.route("/health")
def health():
    return {"status": "ok"}

# ----------------- RUN -----------------
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)


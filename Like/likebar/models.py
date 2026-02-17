from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()

class Page(db.Model):
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    page_key = db.Column(db.String, unique=True, nullable=False, index=True)
    likes_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Like(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    page_id = db.Column(db.String, db.ForeignKey("page.id"))
    ip_hash = db.Column(db.String, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("page_id", "ip_hash", name="uniq_like"),
    )

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    page_id = db.Column(db.String, db.ForeignKey("page.id"), index=True)
    name = db.Column(db.String(100))
    comment = db.Column(db.Text)
    ip_hash = db.Column(db.String)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

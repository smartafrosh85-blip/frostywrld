import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, List

from flask import Flask, jsonify, request, send_from_directory, session
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BASE_DIR / "limanya.db"
DB_PATH = Path(os.environ.get("LIMANYA_DB_PATH", str(DEFAULT_DB_PATH)))
PORT = int(os.environ.get("LIMANYA_PORT", "8000"))

app = Flask(__name__, static_folder=".", static_url_path="")
app.config["SECRET_KEY"] = os.environ.get("LIMANYA_SECRET_KEY", "frostywrld-dev-secret-change-me")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["JSON_SORT_KEYS"] = False


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def default_seed_data() -> Dict[str, List[Dict[str, Any]]]:
    return {
        "users": [
            {"id": "u-admin", "name": "Ava Sterling", "email": "admin@frostywrld.edu", "password": "admin1234", "role": "admin"},
            {"id": "u-teacher", "name": "Jordan Blake", "email": "teacher@frostywrld.edu", "password": "teacher1234", "role": "teacher"},
            {"id": "u-student", "name": "Mila Stone", "email": "student@frostywrld.edu", "password": "student1234", "role": "student"},
            {"id": "u-parent", "name": "Noah Stone", "email": "parent@frostywrld.edu", "password": "parent1234", "role": "parent"},
        ],
        "students": [
            {
                "id": "s-101",
                "full_name": "Mila Stone",
                "admission_no": "LIS-2026-014",
                "class_name": "Grade 10 · Blue",
                "parent_name": "Noah Stone",
                "parent_email": "parent@frostywrld.edu",
                "linked_account_email": "student@frostywrld.edu",
                "has_photo": False,
                "photo_data": "",
            },
            {
                "id": "s-102",
                "full_name": "Aiden Brooks",
                "admission_no": "LIS-2026-027",
                "class_name": "Grade 9 · Silver",
                "parent_name": "Claire Brooks",
                "parent_email": "families@frostywrld.edu",
                "linked_account_email": "",
                "has_photo": False,
                "photo_data": "",
            },
            {
                "id": "s-103",
                "full_name": "Zoe Carter",
                "admission_no": "LIS-2026-031",
                "class_name": "Grade 11 · Aurora",
                "parent_name": "Marcus Carter",
                "parent_email": "families@frostywrld.edu",
                "linked_account_email": "",
                "has_photo": False,
                "photo_data": "",
            },
        ],
        "grades": [
            {"id": "g-1", "student_id": "s-101", "student_name": "Mila Stone", "subject": "Mathematics", "term": "Term 1 · 2026", "score": 96, "max_score": 100},
            {"id": "g-2", "student_id": "s-101", "student_name": "Mila Stone", "subject": "Science", "term": "Term 1 · 2026", "score": 93, "max_score": 100},
            {"id": "g-3", "student_id": "s-102", "student_name": "Aiden Brooks", "subject": "English", "term": "Term 1 · 2026", "score": 88, "max_score": 100},
            {"id": "g-4", "student_id": "s-103", "student_name": "Zoe Carter", "subject": "History", "term": "Term 1 · 2026", "score": 91, "max_score": 100},
        ],
        "attendance": [
            {"id": "a-1", "student_id": "s-101", "student_name": "Mila Stone", "attendance_date": "2026-10-18", "status": "present"},
            {"id": "a-2", "student_id": "s-102", "student_name": "Aiden Brooks", "attendance_date": "2026-10-18", "status": "late"},
            {"id": "a-3", "student_id": "s-103", "student_name": "Zoe Carter", "attendance_date": "2026-10-18", "status": "present"},
            {"id": "a-4", "student_id": "s-101", "student_name": "Mila Stone", "attendance_date": "2026-10-17", "status": "present"},
        ],
        "announcements": [
            {"id": "n-1", "title": "Campus open house", "audience": "all", "body": "Families are invited to the autumn open house on Friday at 4:00 PM.", "created_at": "2026-10-10T09:00:00", "author": "Ava Sterling"},
            {"id": "n-2", "title": "Science fair registration", "audience": "all", "body": "Students who want to present projects should sign up by Friday.", "created_at": "2026-10-12T13:15:00", "author": "Jordan Blake"},
        ],
    }


def init_db() -> None:
    conn = get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            admission_no TEXT NOT NULL,
            class_name TEXT NOT NULL,
            parent_name TEXT,
            parent_email TEXT,
            linked_account_email TEXT,
            has_photo INTEGER DEFAULT 0,
            photo_data TEXT DEFAULT ''
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS grades (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            student_name TEXT NOT NULL,
            subject TEXT NOT NULL,
            term TEXT NOT NULL,
            score REAL NOT NULL,
            max_score REAL NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS attendance (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            student_name TEXT NOT NULL,
            attendance_date TEXT NOT NULL,
            status TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS announcements (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            audience TEXT NOT NULL,
            body TEXT NOT NULL,
            created_at TEXT NOT NULL,
            author TEXT NOT NULL
        )
        """
    )
    conn.commit()

    if conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        seed = default_seed_data()
        for user in seed["users"]:
            conn.execute(
                "INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)",
                (user["id"], user["name"], user["email"], generate_password_hash(user["password"]), user["role"]),
            )

        for student in seed["students"]:
            conn.execute(
                "INSERT INTO students (id, full_name, admission_no, class_name, parent_name, parent_email, linked_account_email, has_photo, photo_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    student["id"],
                    student["full_name"],
                    student["admission_no"],
                    student["class_name"],
                    student.get("parent_name", ""),
                    student.get("parent_email", ""),
                    student.get("linked_account_email", ""),
                    1 if student.get("has_photo") else 0,
                    student.get("photo_data", ""),
                ),
            )

        for grade in seed["grades"]:
            conn.execute(
                "INSERT INTO grades (id, student_id, student_name, subject, term, score, max_score) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    grade["id"],
                    grade["student_id"],
                    grade["student_name"],
                    grade["subject"],
                    grade["term"],
                    float(grade["score"]),
                    float(grade["max_score"]),
                ),
            )

        for attendance in seed["attendance"]:
            conn.execute(
                "INSERT INTO attendance (id, student_id, student_name, attendance_date, status) VALUES (?, ?, ?, ?, ?)",
                (attendance["id"], attendance["student_id"], attendance["student_name"], attendance["attendance_date"], attendance["status"]),
            )

        for announcement in seed["announcements"]:
            conn.execute(
                "INSERT INTO announcements (id, title, audience, body, created_at, author) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    announcement["id"],
                    announcement["title"],
                    announcement["audience"],
                    announcement["body"],
                    announcement["created_at"],
                    announcement["author"],
                ),
            )

    conn.commit()
    conn.close()


def sanitize_user(data: Dict[str, Any]) -> Dict[str, Any]:
    clean = dict(data)
    clean.pop("password", None)
    return clean


def fetch_all_data() -> Dict[str, List[Dict[str, Any]]]:
    conn = get_db()
    data = {
        "users": [dict(row) for row in conn.execute("SELECT * FROM users ORDER BY name COLLATE NOCASE")],
        "students": [dict(row) for row in conn.execute("SELECT * FROM students ORDER BY full_name COLLATE NOCASE")],
        "grades": [dict(row) for row in conn.execute("SELECT * FROM grades ORDER BY subject COLLATE NOCASE, term")],
        "attendance": [dict(row) for row in conn.execute("SELECT * FROM attendance ORDER BY attendance_date DESC")],
        "announcements": [dict(row) for row in conn.execute("SELECT * FROM announcements ORDER BY created_at DESC")],
    }
    conn.close()
    return data


def get_user_by_email(email: str) -> Dict[str, Any] | None:
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id: str) -> Dict[str, Any] | None:
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def build_dashboard_for_user(user: Dict[str, Any]) -> Dict[str, Any]:
    data = fetch_all_data()
    user_role = user.get("role")

    if user_role in {"admin", "teacher"}:
        students = data["students"]
    elif user_role == "student":
        students = [s for s in data["students"] if str(s.get("linked_account_email", "")).lower() == str(user.get("email", "")).lower()]
    elif user_role == "parent":
        students = [
            s for s in data["students"]
            if str(s.get("parent_email", "")).lower() == str(user.get("email", "")).lower() or str(s.get("parent_name", "")).lower() == str(user.get("name", "")).lower()
        ]
    else:
        students = []

    student_ids = {student["id"] for student in students}
    grades = data["grades"] if user_role in {"admin", "teacher"} else [g for g in data["grades"] if g["student_id"] in student_ids]
    attendance = data["attendance"] if user_role in {"admin", "teacher"} else [a for a in data["attendance"] if a["student_id"] in student_ids]
    announcements = data["announcements"]

    return {
        "user": sanitize_user(user),
        "students": students,
        "grades": grades,
        "attendance": attendance,
        "announcements": announcements,
        "counts": {
            "students": len(data["students"]),
            "teachers": len([u for u in data["users"] if u["role"] == "teacher"]),
            "grades": len(data["grades"]),
            "attendance_records": len(data["attendance"]),
        },
    }


@app.after_request
def add_security_headers(response):
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.route("/api/setup-status")
def setup_status():
    conn = get_db()
    exists = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'").fetchone()[0]
    conn.close()
    return jsonify({"needsSetup": exists == 0})


@app.route("/api/session")
def get_session():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"loggedIn": False, "user": None})

    user = get_user_by_id(user_id)
    if not user:
        session.clear()
        return jsonify({"loggedIn": False, "user": None})

    return jsonify({"loggedIn": True, "user": sanitize_user(user)})


@app.route("/api/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip()
    password = str(payload.get("password", ""))

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = get_user_by_email(email)
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid email or password."}), 401

    session["user_id"] = user["id"]
    session["user_email"] = user["email"]
    return jsonify({"ok": True, "user": sanitize_user(user)})


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.route("/api/setup-admin", methods=["POST"])
def setup_admin():
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip()
    password = str(payload.get("password", ""))

    if not name or not email or len(password) < 12:
        return jsonify({"error": "Name, email, and a password of at least 12 characters are required."}), 400

    conn = get_db()
    has_admin = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'").fetchone()[0]
    if has_admin:
        conn.close()
        return jsonify({"error": "An administrator already exists."}), 409

    user_id = f"u-{abs(hash(email))}"
    conn.execute(
        "INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)",
        (user_id, name, email.lower(), generate_password_hash(password), "admin"),
    )
    conn.commit()
    conn.close()

    session["user_id"] = user_id
    session["user_email"] = email.lower()
    return jsonify({"ok": True, "user": {"id": user_id, "name": name, "email": email.lower(), "role": "admin"}})


@app.route("/api/dashboard")
def dashboard():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Authentication required."}), 401

    user = get_user_by_id(user_id)
    if not user:
        session.clear()
        return jsonify({"error": "Session expired."}), 401

    return jsonify(build_dashboard_for_user(user))


@app.route("/api/users", methods=["POST"])
def create_account():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Authentication required."}), 401

    current_user = get_user_by_id(user_id)
    if not current_user or current_user["role"] != "admin":
        return jsonify({"error": "Only administrators can create accounts."}), 403

    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    role = str(payload.get("role", "teacher")).strip().lower()

    if not name or not email or len(password) < 12:
        return jsonify({"error": "Name, email, and a minimum 12-character password are required."}), 400
    if role not in {"admin", "teacher", "student", "parent"}:
        return jsonify({"error": "Invalid role selected."}), 400

    conn = get_db()
    existing = conn.execute("SELECT 1 FROM users WHERE LOWER(email) = LOWER(?)", (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "An account with that email already exists."}), 409

    user = {
        "id": f"u-{abs(hash(email + str(os.urandom(4))))}",
        "name": name,
        "email": email,
        "password": generate_password_hash(password),
        "role": role,
    }
    conn.execute(
        "INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)",
        (user["id"], user["name"], user["email"], user["password"], user["role"]),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "user": sanitize_user(user)})


@app.route("/api/students", methods=["GET"])
def list_students():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Authentication required."}), 401

    user = get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "Session expired."}), 401

    dashboard_data = build_dashboard_for_user(user)
    return jsonify(dashboard_data["students"])


@app.route("/api/students", methods=["POST"])
def create_student():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Authentication required."}), 401

    current_user = get_user_by_id(user_id)
    if not current_user or current_user["role"] not in {"admin", "teacher"}:
        return jsonify({"error": "Only administrators and teachers can register students."}), 403

    payload = request.get_json(silent=True) or {}
    student = {
        "id": f"s-{abs(hash(str(payload.get('admission_no', '') + str(payload.get('full_name', '')) + str(os.urandom(4))))}",
        "full_name": str(payload.get("full_name", "")).strip(),
        "admission_no": str(payload.get("admission_no", "")).strip(),
        "class_name": str(payload.get("class_name", "")).strip(),
        "parent_name": str(payload.get("parent_name", "Guardian")).strip() or "Guardian",
        "parent_email": str(payload.get("parent_email", "")).strip(),
        "linked_account_email": str(payload.get("linked_account_email", "")).strip(),
        "has_photo": False,
        "photo_data": "",
    }

    if not student["full_name"] or not student["admission_no"] or not student["class_name"]:
        return jsonify({"error": "Student name, admission number, and class are required."}), 400

    conn = get_db()
    conn.execute(
        "INSERT INTO students (id, full_name, admission_no, class_name, parent_name, parent_email, linked_account_email, has_photo, photo_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            student["id"],
            student["full_name"],
            student["admission_no"],
            student["class_name"],
            student["parent_name"],
            student["parent_email"],
            student["linked_account_email"],
            0,
            "",
        ),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "student": student})


@app.route("/api/grades", methods=["GET"])
def list_grades():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Authentication required."}), 401

    user = get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "Session expired."}), 401

    return jsonify(build_dashboard_for_user(user)["grades"])


@app.route("/api/grades", methods=["POST"])
def create_grade():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Authentication required."}), 401

    current_user = get_user_by_id(user_id)
    if not current_user or current_user["role"] not in {"admin", "teacher"}:
        return jsonify({"error": "Only administrators and teachers can record grades."}), 403

    payload = request.get_json(silent=True) or {}
    student_id = str(payload.get("student_id", "")).strip()
    subject = str(payload.get("subject", "")).strip()
    term = str(payload.get("term", "")).strip()
    score = float(payload.get("score", 0))
    max_score = float(payload.get("max_score", 100) or 100)

    if not student_id or not subject or not term:
        return jsonify({"error": "Student, subject, and term are required."}), 400

    conn = get_db()
    student = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
    if not student:
        conn.close()
        return jsonify({"error": "Choose a valid student."}), 400

    grade = {
        "id": f"g-{abs(hash(student_id + subject + term + str(os.urandom(4))))}",
        "student_id": student_id,
        "student_name": student["full_name"],
        "subject": subject,
        "term": term,
        "score": score,
        "max_score": max_score,
    }
    conn.execute(
        "INSERT INTO grades (id, student_id, student_name, subject, term, score, max_score) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (grade["id"], grade["student_id"], grade["student_name"], grade["subject"], grade["term"], grade["score"], grade["max_score"]),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "grade": grade})


@app.route("/api/attendance", methods=["GET"])
def list_attendance():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Authentication required."}), 401

    user = get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "Session expired."}), 401

    return jsonify(build_dashboard_for_user(user)["attendance"])


@app.route("/api/attendance", methods=["POST"])
def create_attendance():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Authentication required."}), 401

    current_user = get_user_by_id(user_id)
    if not current_user or current_user["role"] not in {"admin", "teacher"}:
        return jsonify({"error": "Only administrators and teachers can record attendance."}), 403

    payload = request.get_json(silent=True) or {}
    student_id = str(payload.get("student_id", "")).strip()
    attendance_date = str(payload.get("attendance_date", "")).strip()
    status = str(payload.get("status", "present")).strip()

    if not student_id or not attendance_date:
        return jsonify({"error": "Student and date are required."}), 400

    conn = get_db()
    student = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
    if not student:
        conn.close()
        return jsonify({"error": "Choose a valid student."}), 400

    record = {
        "id": f"a-{abs(hash(student_id + attendance_date + status + str(os.urandom(4))))}",
        "student_id": student_id,
        "student_name": student["full_name"],
        "attendance_date": attendance_date,
        "status": status,
    }
    conn.execute(
        "INSERT INTO attendance (id, student_id, student_name, attendance_date, status) VALUES (?, ?, ?, ?, ?)",
        (record["id"], record["student_id"], record["student_name"], record["attendance_date"], record["status"]),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "attendance": record})


@app.route("/api/announcements", methods=["GET"])
def list_announcements():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Authentication required."}), 401

    user = get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "Session expired."}), 401

    return jsonify(build_dashboard_for_user(user)["announcements"])


@app.route("/api/announcements", methods=["POST"])
def create_announcement():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Authentication required."}), 401

    current_user = get_user_by_id(user_id)
    if not current_user or current_user["role"] != "admin":
        return jsonify({"error": "Only administrators can post announcements."}), 403

    payload = request.get_json(silent=True) or {}
    title = str(payload.get("title", "")).strip()
    audience = str(payload.get("audience", "all")).strip()
    body = str(payload.get("body", "")).strip()
    if not title or not body:
        return jsonify({"error": "Title and body are required."}), 400

    announcement = {
        "id": f"n-{abs(hash(title + body + str(os.urandom(4))))}",
        "title": title,
        "audience": audience,
        "body": body,
        "created_at": __import__("datetime").datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "author": current_user["name"],
    }

    conn = get_db()
    conn.execute(
        "INSERT INTO announcements (id, title, audience, body, created_at, author) VALUES (?, ?, ?, ?, ?, ?)",
        (announcement["id"], announcement["title"], announcement["audience"], announcement["body"], announcement["created_at"], announcement["author"]),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "announcement": announcement})


@app.route("/api/data")
def data_api():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Authentication required."}), 401

    user = get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "Session expired."}), 401

    return jsonify(build_dashboard_for_user(user))


@app.route("/")
def index_page():
    return send_from_directory(str(BASE_DIR), "index.html")


@app.route("/<path:path>")
def serve_static(path: str):
    file_path = (BASE_DIR / path).resolve()
    if file_path.is_file() and str(file_path).startswith(str(BASE_DIR)):
        return send_from_directory(str(BASE_DIR), path)
    return send_from_directory(str(BASE_DIR), "index.html")


init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=False)

# =============================================================================
# app.py — ResumeRadar Flask Application
# =============================================================================

import os
import json
import uuid
from datetime import datetime
from pathlib import Path

from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.utils import secure_filename

import analyzer

# ─── CONFIG ──────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyAsS1ZSznY6ov4LavuO4_S5obpAyHFQWUI")

UPLOAD_FOLDER = Path("uploads")
UPLOAD_FOLDER.mkdir(exist_ok=True)
ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}

JD_LIBRARY_PATH = Path("jd_library.json")

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = str(UPLOAD_FOLDER)
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5MB max upload

# Init Gemini client
analyzer.init_client(GEMINI_API_KEY)

# ─── HELPERS ─────────────────────────────────────────────────────────────────
def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def load_jd_library() -> dict:
    with open(JD_LIBRARY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_jd_library(data: dict):
    with open(JD_LIBRARY_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def extract_text_from_file(filepath: str) -> str:
    """Extract text from uploaded PDF, DOCX, or TXT file."""
    ext = filepath.rsplit(".", 1)[1].lower()

    if ext == "txt":
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    elif ext == "pdf":
        try:
            import pdfplumber
            text = ""
            with pdfplumber.open(filepath) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            return text.strip()
        except ImportError:
            return ""
        except Exception:
            return ""

    elif ext == "docx":
        try:
            from docx import Document
            doc = Document(filepath)
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except ImportError:
            return ""
        except Exception:
            return ""

    return ""


# ─── ROUTES ──────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/jd-library")
def get_jd_library():
    """Return full JD library."""
    data = load_jd_library()
    return jsonify(data)


@app.route("/api/analyze", methods=["POST"])
def analyze():
    """Main analysis endpoint."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request."}), 400

    resume = data.get("resume", "").strip()
    jd = data.get("jd", "").strip()

    if not resume:
        return jsonify({"error": "Resume text is empty."}), 400
    if not jd:
        return jsonify({"error": "Job description is empty."}), 400
    if len(resume) < 50:
        return jsonify({"error": "Resume is too short. Please paste the full text."}), 400

    result = analyzer.analyze_resume(resume, jd)
    return jsonify(result)


@app.route("/api/discover-roles", methods=["POST"])
def discover_roles():
    """Role discovery endpoint — called when score is low."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request."}), 400

    resume = data.get("resume", "").strip()
    score = int(data.get("score", 0))

    if not resume:
        return jsonify({"error": "Resume text is required."}), 400

    result = analyzer.discover_roles(resume, score)
    return jsonify(result)


@app.route("/api/upload-resume", methods=["POST"])
def upload_resume():
    """Handle resume file upload and return extracted text."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only PDF, DOCX, and TXT files are supported."}), 400

    filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(filepath)

    text = extract_text_from_file(filepath)

    # Clean up uploaded file
    try:
        os.remove(filepath)
    except Exception:
        pass

    if not text:
        return jsonify({
            "error": "Could not extract text from this file. Try pasting the text directly.",
            "text": ""
        }), 422

    return jsonify({"text": text})


@app.route("/api/contribute-jd", methods=["POST"])
def contribute_jd():
    """Accept a user-contributed JD and add it to the library."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request."}), 400

    title = data.get("title", "").strip()
    domain_id = data.get("domain_id", "").strip()
    jd_text = data.get("text", "").strip()
    company = data.get("company", "Community Contributed").strip()

    if not title:
        return jsonify({"error": "JD title is required."}), 400
    if not domain_id:
        return jsonify({"error": "Domain is required."}), 400
    if len(jd_text) < 100:
        return jsonify({"error": "JD text is too short (min 100 characters)."}), 400

    library = load_jd_library()

    # Find the domain
    domain = next((d for d in library["domains"] if d["id"] == domain_id), None)
    if not domain:
        return jsonify({"error": f"Domain '{domain_id}' not found."}), 404

    # Create new JD entry
    new_jd = {
        "id": f"{domain_id}-contrib-{uuid.uuid4().hex[:8]}",
        "title": title,
        "company": company,
        "upvotes": 0,
        "contributed": True,
        "contributed_at": datetime.utcnow().isoformat(),
        "text": jd_text
    }

    domain["jds"].append(new_jd)
    save_jd_library(library)

    return jsonify({"success": True, "id": new_jd["id"], "message": "JD contributed successfully!"})


@app.route("/api/upvote-jd", methods=["POST"])
def upvote_jd():
    """Upvote a JD in the library."""
    data = request.get_json()
    jd_id = data.get("jd_id", "").strip()

    if not jd_id:
        return jsonify({"error": "jd_id is required."}), 400

    library = load_jd_library()

    for domain in library["domains"]:
        for jd in domain["jds"]:
            if jd["id"] == jd_id:
                jd["upvotes"] = jd.get("upvotes", 0) + 1
                save_jd_library(library)
                return jsonify({"success": True, "upvotes": jd["upvotes"]})

    return jsonify({"error": "JD not found."}), 404


# ─── MAIN ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if GEMINI_API_KEY == "YOUR_API_KEY_HERE":
        print("\n⚠️  Set your Gemini API key:")
        print("   export GEMINI_API_KEY='your_key_here'")
        print("   Get a free key at: https://aistudio.google.com/\n")
    else:
        print("✅ Gemini API key loaded.")

    print("🚀 ResumeRadar running at http://localhost:5000\n")
    app.run(debug=True, host="0.0.0.0", port=5000)

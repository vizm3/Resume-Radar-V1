# 🧠 ResumeRadar — AI-Powered ATS Analyzer & Career Intelligence Tool

> Analyze your resume against any job description. Get an ATS score, keyword gap analysis, AI improvement suggestions, and discover alternative roles where your skills shine — all in a clean, fast web app.

---

## 🚨 The Problem

Every year, millions of students and fresh graduates get rejected **before a human ever reads their resume** — not because they're underqualified, but because their resume fails the ATS (Applicant Tracking System) filter.

Most resume checkers are:
- Behind a paywall
- Vague and generic ("Your resume needs improvement!")
- Not matched against a specific job description

**ResumeRadar** is a free, open-source, AI-powered resume analyzer with a **community JD library** — so you always have real job descriptions to test against.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎯 **ATS Score** | 0–100 compatibility score with verdict |
| 🔍 **Keyword Gap Analysis** | Matched vs. missing keywords from the JD |
| 💡 **AI Suggestions** | 5-7 specific, actionable improvements |
| 📚 **JD Library** | 50+ curated JDs across 8 domains — pick & analyze instantly |
| 📄 **PDF / DOCX Upload** | Upload your resume file, text extracted automatically |
| ⬆️ **Upvote JDs** | Community upvoting to surface the best JDs |
| ✍️ **Contribute JDs** | Submit your own JDs to the community library |
| 🧭 **Role Discovery Engine** | If score is low, AI suggests alternative roles where you're a strong fit |

---

## 🗂️ Project Structure

```
resume-radar/
│
├── app.py               # Flask app — all routes & API endpoints
├── analyzer.py          # Gemini AI logic — analysis & role discovery
├── jd_library.json      # Community JD library (50+ JDs, grows with contributions)
│
├── templates/
│   └── index.html       # Full frontend HTML
│
├── static/
│   ├── style.css        # Complete stylesheet
│   └── app.js           # All frontend JavaScript
│
├── uploads/             # Temp storage for uploaded files (auto-created)
│
├── requirements.txt
└── README.md
```

---

## 🚀 Installation

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/resume-radar
cd resume-radar

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set your Gemini API key (free at https://aistudio.google.com/)
export GEMINI_API_KEY="your_key_here"
# Windows: set GEMINI_API_KEY=your_key_here

# 4. Run
python app.py

# 5. Open browser
# Visit http://localhost:5000
```

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask |
| AI Engine | Google Gemini 1.5 Flash (`google-genai`) |
| PDF Parsing | pdfplumber |
| DOCX Parsing | python-docx |
| Frontend | Vanilla HTML + CSS + JS (no framework) |
| Storage | JSON flat file (jd_library.json) |
| Fonts | Syne + DM Mono (Google Fonts) |

---

## ⚙️ How It Works

```
User Input (Resume + JD)
        │
        ├─► Keyword Extraction      → Finds skills, tools, certs in JD
        │
        ├─► Gemini Analysis Prompt  → Score + gaps + suggestions + summary
        │
        └─► If score < 55:
              Role Discovery Prompt → Suggest 4-5 alternative roles from resume skills
```

**JD Library Flow:**
```
jd_library.json  ←→  Flask API  ←→  Sidebar UI
      ↑
User contributions (auto-approved, instantly available)
Community upvotes rank the best JDs
```

---

## 🌍 JD Library Domains

- 💻 Software Development (SDE, Full Stack, Android, Amazon SDE-1, Fintech)
- 📊 Data Science (Product Analytics, BI, NLP/LLMs, Research)
- 🤖 ML Engineering (RecSys, MLOps, Computer Vision, Generative AI)
- ☁️ DevOps / Cloud (AWS, SRE, Platform Engineering)
- 🎨 Frontend (React, Design Systems)
- 🧩 Product Management (APM, Growth PM)
- 🔐 Cybersecurity (AppSec, SOC Analyst)
- 📈 Quant / Research (Algo Trading)

---

## 🤝 Contributing

### Add JDs via the App
Click **"Contribute a JD"** in the sidebar — your JD is added instantly to the community library.

### Code Contributions
```bash
git fork https://github.com/yourusername/resume-radar
git checkout -b feature/your-feature
# make changes
git commit -m "feat: describe your change"
git push origin feature/your-feature
# open a Pull Request
```

**Good first contributions:**
- Add more JDs to `jd_library.json`
- Add a new domain category
- Improve the analysis prompt in `analyzer.py`
- Add export-to-PDF for the analysis report

---

## 🔮 Roadmap

- [ ] LinkedIn job URL auto-scraper (paste URL → auto-fill JD)
- [ ] Export analysis report as PDF
- [ ] Admin moderation panel for contributed JDs
- [ ] Resume rewrite assistant (side-by-side editor)
- [ ] Multi-JD batch analysis
- [ ] Chrome extension

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

> Built by a student, for students. If this helped you land an interview, drop a ⭐ on GitHub!

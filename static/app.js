// =============================================================================
// app.js — ResumeRadar Frontend Logic
// =============================================================================

// ─── STATE ────────────────────────────────────────────────────────────────────
const state = {
  activeJdId: null,
  activeJdTitle: null,
  activeJdUpvotes: 0,
  hasVoted: new Set(JSON.parse(localStorage.getItem('rr_voted') || '[]')),
  lastScore: 0,
  lastResume: '',
};

// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const resumeText      = $('resumeText');
const jdText          = $('jdText');
const analyzeBtn      = $('analyzeBtn');
const btnText         = $('btnText');
const spinner         = $('spinner');
const errorBanner     = $('errorBanner');
const results         = $('results');
const activeJdBanner  = $('activeJdBanner');
const activeJdTitle   = $('activeJdTitle');
const upvoteBtn       = $('upvoteBtn');
const upvoteCount     = $('upvoteCount');
const clearJdBtn      = $('clearJdBtn');
const domainList      = $('domainList');
const discoverCta     = $('discoverCta');
const discoverBtn     = $('discoverBtn');
const roleDiscovery   = $('roleDiscovery');
const roleCards       = $('roleCards');
const contributeModal = $('contributeModal');
const ctbDomain       = $('ctbDomain');

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
let sidebarOpen = true;

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  sidebarOpen = !sidebarOpen;
  sidebar.classList.toggle('collapsed', !sidebarOpen);
}

$('sidebarToggle').addEventListener('click', toggleSidebar);
$('sidebarToggleMobile').addEventListener('click', toggleSidebar);

// ─── JD LIBRARY ───────────────────────────────────────────────────────────────
async function loadJdLibrary() {
  try {
    const res  = await fetch('/api/jd-library');
    const data = await res.json();
    renderDomainList(data.domains);
    populateDomainSelect(data.domains);
  } catch {
    domainList.innerHTML = '<div class="loading-pulse">Failed to load JD library.</div>';
  }
}

function renderDomainList(domains) {
  domainList.innerHTML = '';
  domains.forEach(domain => {
    const group = document.createElement('div');
    group.className = 'domain-group';
    group.dataset.domainId = domain.id;

    group.innerHTML = `
      <div class="domain-heading">
        <span class="domain-icon">${domain.icon}</span>
        <span>${domain.label}</span>
        <span class="chevron">▶</span>
      </div>
      <div class="jd-list">
        ${domain.jds.map(jd => `
          <div class="jd-item" data-jd-id="${jd.id}" data-domain-id="${domain.id}">
            <div class="jd-item-content">
              <div class="jd-item-title">${jd.title}</div>
              <div class="jd-item-meta">
                <span class="jd-upvote-count">▲ ${jd.upvotes || 0}</span>
                ${jd.contributed ? '<span class="contributed-badge">Community</span>' : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Toggle open/close
    group.querySelector('.domain-heading').addEventListener('click', () => {
      group.classList.toggle('open');
    });

    // JD item click
    group.querySelectorAll('.jd-item').forEach(item => {
      item.addEventListener('click', () => {
        const jd = findJd(domains, item.dataset.jdId);
        if (jd) selectJd(jd, item);
      });
    });

    domainList.appendChild(group);
  });
}

function findJd(domains, jdId) {
  for (const domain of domains) {
    const found = domain.jds.find(j => j.id === jdId);
    if (found) return found;
  }
  return null;
}

function selectJd(jd, itemEl) {
  // Deactivate previous
  document.querySelectorAll('.jd-item.active').forEach(el => el.classList.remove('active'));
  itemEl.classList.add('active');

  // Fill JD textarea
  jdText.value = jd.text;
  $('jdSourceTag').style.display = 'inline';

  // Update state
  state.activeJdId     = jd.id;
  state.activeJdTitle  = jd.title;
  state.activeJdUpvotes = jd.upvotes || 0;

  // Show banner
  activeJdTitle.textContent = jd.title;
  upvoteCount.textContent = jd.upvotes || 0;
  activeJdBanner.style.display = 'flex';

  // Voted state
  if (state.hasVoted.has(jd.id)) {
    upvoteBtn.classList.add('voted');
  } else {
    upvoteBtn.classList.remove('voted');
  }

  // Close sidebar on mobile
  if (window.innerWidth < 900) {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.add('collapsed');
    sidebarOpen = false;
  }
}

// Upvote
upvoteBtn.addEventListener('click', async () => {
  if (!state.activeJdId || state.hasVoted.has(state.activeJdId)) return;

  try {
    const res  = await fetch('/api/upvote-jd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jd_id: state.activeJdId })
    });
    const data = await res.json();
    if (data.success) {
      upvoteCount.textContent = data.upvotes;
      upvoteBtn.classList.add('voted');
      state.hasVoted.add(state.activeJdId);
      localStorage.setItem('rr_voted', JSON.stringify([...state.hasVoted]));

      // Update sidebar count
      const itemEl = document.querySelector(`.jd-item[data-jd-id="${state.activeJdId}"] .jd-upvote-count`);
      if (itemEl) itemEl.textContent = `▲ ${data.upvotes}`;
    }
  } catch { /* silent */ }
});

// Clear JD
clearJdBtn.addEventListener('click', () => {
  jdText.value = '';
  $('jdSourceTag').style.display = 'none';
  activeJdBanner.style.display = 'none';
  document.querySelectorAll('.jd-item.active').forEach(el => el.classList.remove('active'));
  state.activeJdId = null;
  state.activeJdTitle = null;
});

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────────
$('resumeUpload').addEventListener('change', async function () {
  const file = this.files[0];
  if (!file) return;

  const progress    = $('uploadProgress');
  const progressBar = $('uploadProgressBar');
  progress.style.display = 'block';
  progressBar.style.animation = 'uploading 1.2s ease-in-out infinite';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res  = await fetch('/api/upload-resume', { method: 'POST', body: formData });
    const data = await res.json();

    if (data.error) {
      showError(data.error);
    } else if (data.text) {
      resumeText.value = data.text;
    }
  } catch {
    showError('Upload failed. Please try pasting the text instead.');
  } finally {
    progressBar.style.animation = 'none';
    progressBar.style.width = '100%';
    setTimeout(() => {
      progress.style.display = 'none';
      progressBar.style.width = '0%';
    }, 400);
    this.value = '';
  }
});

// ─── ANALYZE ──────────────────────────────────────────────────────────────────
analyzeBtn.addEventListener('click', runAnalysis);

async function runAnalysis() {
  const resume = resumeText.value.trim();
  const jd     = jdText.value.trim();

  hideError();
  results.style.display = 'none';
  roleDiscovery.style.display = 'none';

  if (!resume) { showError('Please paste your resume text or upload a file.'); return; }
  if (!jd)     { showError('Please paste a job description or pick one from the library.'); return; }
  if (resume.length < 50) { showError('Resume is too short. Please paste the full text.'); return; }

  setLoading(true);

  try {
    const res  = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume, jd })
    });
    const data = await res.json();

    if (data.error) { showError(data.error); return; }

    state.lastScore  = data.score;
    state.lastResume = resume;

    renderResults(data);
  } catch {
    showError('Network error. Is the Flask server running?');
  } finally {
    setLoading(false);
  }
}

// ─── RENDER RESULTS ───────────────────────────────────────────────────────────
function renderResults(data) {
  const score = Math.min(100, Math.max(0, data.score || 0));

  // Animate score ring
  const circumference = 326.7;
  const offset        = circumference - (score / 100) * circumference;
  const fill          = $('ringFill');

  $('scoreNum').textContent = score;
  setTimeout(() => { fill.style.strokeDashoffset = offset; }, 80);

  // Score color + verdict
  const verdict = $('scoreVerdict');
  if (score >= 70) {
    fill.style.stroke = 'var(--accent)';
    verdict.className = 'score-verdict verdict-high';
    verdict.textContent = 'Strong Match';
    $('scoreNum').style.color = 'var(--accent)';
    discoverCta.style.display = 'none';
  } else if (score >= 45) {
    fill.style.stroke = 'var(--accent2)';
    verdict.className = 'score-verdict verdict-mid';
    verdict.textContent = 'Partial Match';
    $('scoreNum').style.color = 'var(--accent2)';
    discoverCta.style.display = 'block';
  } else {
    fill.style.stroke = 'var(--warn)';
    verdict.className = 'score-verdict verdict-low';
    verdict.textContent = 'Weak Match';
    $('scoreNum').style.color = 'var(--warn)';
    discoverCta.style.display = 'block';
  }

  // Keywords
  renderTags($('matchedTags'), data.matched_keywords || [], 'tag-match');
  renderTags($('missingTags'), data.missing_keywords || [], 'tag-miss');

  // Suggestions
  const ul = $('suggestionList');
  ul.innerHTML = '';
  (data.suggestions || []).forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    ul.appendChild(li);
  });

  // Summary
  $('summaryText').textContent = data.summary || '';

  results.style.display = 'block';
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderTags(container, items, cls) {
  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = '<span style="color:var(--text3);font-size:0.72rem">None identified</span>';
    return;
  }
  items.forEach(item => {
    const span = document.createElement('span');
    span.className = `tag ${cls}`;
    span.textContent = item;
    container.appendChild(span);
  });
}

// ─── ROLE DISCOVERY ───────────────────────────────────────────────────────────
discoverBtn.addEventListener('click', runRoleDiscovery);

async function runRoleDiscovery() {
  discoverBtn.disabled = true;
  discoverBtn.textContent = 'Discovering...';

  try {
    const res  = await fetch('/api/discover-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume: state.lastResume, score: state.lastScore })
    });
    const data = await res.json();

    if (data.error || !data.roles) {
      discoverBtn.textContent = 'Failed — Try Again';
      discoverBtn.disabled = false;
      return;
    }

    renderRoleCards(data.roles);
    roleDiscovery.style.display = 'block';
    roleDiscovery.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch {
    discoverBtn.textContent = 'Failed — Try Again';
    discoverBtn.disabled = false;
  }
}

function renderRoleCards(roles) {
  roleCards.innerHTML = '';
  roles.forEach((role, i) => {
    const card = document.createElement('div');
    card.className = 'role-card';
    card.style.animationDelay = `${i * 0.08}s`;

    const skillTags = (role.key_skills_used || [])
      .map(s => `<span class="role-skill-tag">${s}</span>`)
      .join('');

    card.innerHTML = `
      <div class="role-card-top">
        <div class="role-title">${role.title}</div>
        <div class="role-match">${role.match_percent}% fit</div>
      </div>
      <div class="role-reason">${role.reason}</div>
      <div class="role-skills">${skillTags}</div>
      ${role.skill_to_add ? `
        <div class="role-add-skill">
          Add <strong>${role.skill_to_add}</strong> to boost your chances.
        </div>` : ''}
    `;
    roleCards.appendChild(card);
  });
}

// ─── CONTRIBUTE MODAL ─────────────────────────────────────────────────────────
$('openContributeBtn').addEventListener('click', openContributeModal);
$('closeContributeBtn').addEventListener('click', closeContributeModal);

contributeModal.addEventListener('click', e => {
  if (e.target === contributeModal) closeContributeModal();
});

function openContributeModal() {
  contributeModal.classList.add('open');
  $('contributeSuccess').style.display = 'none';
  $('contributeError').style.display = 'none';
  $('ctbTitle').value = '';
  $('ctbCompany').value = '';
  $('ctbText').value = '';
  $('ctbDomain').value = '';
}

function closeContributeModal() {
  contributeModal.classList.remove('open');
}

$('useCurrentJdBtn').addEventListener('click', () => {
  $('ctbText').value = jdText.value.trim();
});

function populateDomainSelect(domains) {
  ctbDomain.innerHTML = '<option value="">Select domain...</option>';
  domains.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `${d.icon} ${d.label}`;
    ctbDomain.appendChild(opt);
  });
}

$('submitContributeBtn').addEventListener('click', async () => {
  const title    = $('ctbTitle').value.trim();
  const company  = $('ctbCompany').value.trim();
  const domainId = $('ctbDomain').value;
  const text     = $('ctbText').value.trim();
  const errEl    = $('contributeError');

  errEl.style.display = 'none';

  if (!title)    { errEl.textContent = 'Please enter a JD title.'; errEl.style.display = 'block'; return; }
  if (!domainId) { errEl.textContent = 'Please select a domain.'; errEl.style.display = 'block'; return; }
  if (text.length < 100) { errEl.textContent = 'JD text is too short (min 100 characters).'; errEl.style.display = 'block'; return; }

  const btn    = $('submitContributeBtn');
  const btnTxt = $('ctbBtnText');
  const spn    = $('ctbSpinner');
  btn.disabled = true;
  btnTxt.style.display = 'none';
  spn.style.display    = 'block';

  try {
    const res  = await fetch('/api/contribute-jd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, company, domain_id: domainId, text })
    });
    const data = await res.json();

    if (data.success) {
      $('contributeSuccess').style.display = 'block';
      // Refresh library
      setTimeout(() => {
        loadJdLibrary();
        setTimeout(closeContributeModal, 1200);
      }, 1200);
    } else {
      errEl.textContent = data.error || 'Submission failed.';
      errEl.style.display = 'block';
    }
  } catch {
    errEl.textContent = 'Network error. Please try again.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btnTxt.style.display = 'inline';
    spn.style.display    = 'none';
  }
});

// ─── UTILS ────────────────────────────────────────────────────────────────────
function setLoading(on) {
  analyzeBtn.disabled        = on;
  btnText.style.display      = on ? 'none'    : 'flex';
  spinner.style.display      = on ? 'block'   : 'none';
}

function showError(msg) {
  errorBanner.textContent    = msg;
  errorBanner.style.display  = 'block';
}

function hideError() {
  errorBanner.style.display  = 'none';
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
loadJdLibrary();

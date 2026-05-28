/* STRANGER dashboard JS - local build */

const STORAGE_KEY = 'ppd-data-v3';

const CAT_COLORS = {
  food: '#f59e0b',
  transport: '#10b981',
  bills: '#ef4444',
  health: '#22c55e',
  entertainment: '#6366f1',
  other: '#94a3b8'
};

const avatarColors = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#ec4899,#db2777)',
  'linear-gradient(135deg,#3b82f6,#2563eb)',
  'linear-gradient(135deg,#14b8a6,#0d9488)'
];

const state = {
  expenses: [],
  creds: [],
  notes: [],
  profile: {
    username: 'stranger',
    name: '',
    bio: '',
    website: '',
    avatar: null,
    cover: null,
    followers: 0,
    following: 0
  },
  posts: []
};

let catChartInst = null;
let currentPostId = null;
let pendingPostImg = null;

function getDefaultData() {
  return {
    expenses: [],
    creds: [],
    notes: [],
    profile: {
      username: 'stranger',
      name: '',
      bio: '',
      website: '',
      avatar: null,
      cover: null,
      followers: 0,
      following: 0
    },
    posts: []
  };
}

function hydrateState(saved) {
  const fallback = getDefaultData();
  const parsed = saved ? JSON.parse(saved) : null;
  const data = parsed && typeof parsed === 'object' ? parsed : fallback;

  state.expenses = Array.isArray(data.expenses) ? data.expenses : [];
  state.creds = Array.isArray(data.creds) ? data.creds : [];
  state.notes = Array.isArray(data.notes) ? data.notes : [];
  state.posts = Array.isArray(data.posts) ? data.posts : [];
  state.profile = { ...fallback.profile, ...(data.profile || {}) };
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    showToast('Storage limit reached — try smaller images', 'ti-alert-circle');
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    hydrateState(saved);
  } catch (error) {
    hydrateState(null);
  }
}

function fmt(n) {
  const value = Number(n || 0);
  return '₹' + value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(n) {
  const value = Number(n || 0);
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
  return String(value);
}

function catBadge(c) {
  const label = c.charAt(0).toUpperCase() + c.slice(1);
  return `<span class="badge b-${c}">${label}</span>`;
}

function showToast(msg, icon = 'ti-check') {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<i class="ti ${icon}" style="font-size:16px"></i><span>${msg}</span>`;
  document.body.appendChild(t);

  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity .3s';
    setTimeout(() => t.remove(), 300);
  }, 2500);
}

function startClock() {
  const tick = () => {
    const now = new Date();
    document.getElementById('live-time').textContent = now.toLocaleTimeString('en-IN');
    document.getElementById('live-date').textContent = now.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  tick();
  setInterval(tick, 1000);
}

/* Tabs */
const ALL_TABS = ['profile', 'overview', 'expenses', 'vault', 'notes'];

function switchTab(tabName) {
  document.querySelectorAll('.nav-tab').forEach((btn, index) => {
    btn.classList.toggle('active', ALL_TABS[index] === tabName);
  });

  document.querySelectorAll('.panel').forEach((panel) => panel.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active');

  if (tabName === 'overview') renderOverview();
  if (tabName === 'profile') renderProfile();
}

function switchIgTab(tabName) {
  ['posts', 'reels', 'tagged'].forEach((x) => {
    document.getElementById(`ig-${x}-panel`).style.display = x === tabName ? 'block' : 'none';
  });

  document.querySelectorAll('.ig-tab').forEach((btn, index) => {
    btn.classList.toggle('active', ['posts', 'reels', 'tagged'][index] === tabName);
  });
}

/* Profile */
function renderProfile() {
  const p = state.profile;
  const posts = state.posts;

  document.getElementById('ig-username').textContent = '@' + (p.username || 'stranger');
  document.getElementById('ig-name').textContent = p.name || 'Your Name';

  const bio = document.getElementById('ig-bio');
  bio.textContent = p.bio || 'No bio yet. Click Edit to add one!';
  bio.style.fontStyle = p.bio ? 'normal' : 'italic';
  bio.style.color = p.bio ? '#cbd5e1' : '#64748b';

  const websiteWrap = document.getElementById('ig-website-wrap');
  if (p.website) {
    websiteWrap.style.display = 'flex';
    document.getElementById('ig-website').textContent = p.website;
  } else {
    websiteWrap.style.display = 'none';
  }

  document.getElementById('ig-posts-count').textContent = posts.length;
  document.getElementById('ig-followers').textContent = fmtNum(p.followers || 0);
  document.getElementById('ig-following').textContent = fmtNum(p.following || 0);
  document.getElementById('inp-followers').value = p.followers || 0;
  document.getElementById('inp-following').value = p.following || 0;

  const avatarHtml = p.avatar
    ? `<img src="${p.avatar}" alt="avatar"/>`
    : `<i class="ti ti-user" style="font-size:32px;color:#475569" aria-hidden="true"></i>`;
  document.getElementById('ig-avatar-inner').innerHTML = avatarHtml;
  document.getElementById('brand-avatar-inner').innerHTML = p.avatar
    ? `<img src="${p.avatar}" alt=""/>`
    : `<i class="ti ti-user" aria-hidden="true"></i>`;

  document.getElementById('brand-display-name').textContent = p.name || 'My Profile';
  document.getElementById('brand-display-handle').textContent = '@' + (p.username || 'stranger');

  const coverImg = document.getElementById('cover-img');
  const coverPlaceholder = document.getElementById('cover-placeholder');

  if (p.cover) {
    coverImg.src = p.cover;
    coverImg.style.display = 'block';
    coverPlaceholder.style.display = 'none';
  } else {
    coverImg.style.display = 'none';
    coverPlaceholder.style.display = 'flex';
  }

  renderGrid();
}

function renderGrid() {
  const grid = document.getElementById('ig-posts-grid');

  if (!state.posts.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:2.5rem;color:#475569">
        <i class="ti ti-camera" style="font-size:36px;display:block;margin-bottom:8px" aria-hidden="true"></i>
        <p style="font-size:13px">No posts yet. Share your first!</p>
      </div>`;
    return;
  }

  grid.innerHTML = state.posts.map((post) => `
    <div class="ig-grid-item" onclick="openPost(${post.id})">
      <img src="${post.img}" alt="${post.caption || ''}"/>
      <div class="ig-grid-overlay">
        <span><i class="ti ti-heart" aria-hidden="true"></i>${fmtNum(post.likes || 0)}</span>
        <span><i class="ti ti-message-circle" aria-hidden="true"></i>${post.comments || 0}</span>
      </div>
    </div>
  `).join('');
}

function openPost(id) {
  const post = state.posts.find((x) => x.id === id);
  if (!post) return;

  currentPostId = id;
  document.getElementById('pm-img').src = post.img;
  document.getElementById('pm-caption').textContent = post.caption || '';
  document.getElementById('pm-date').textContent = post.date || '';
  document.getElementById('pm-likes').textContent = post.likes || 0;
  document.getElementById('pm-comments').textContent = post.comments || 0;
  document.getElementById('pm-username').textContent = '@' + (state.profile.username || 'stranger');

  const avatarWrap = document.getElementById('pm-avatar-wrap');
  avatarWrap.innerHTML = state.profile.avatar
    ? `<img src="${state.profile.avatar}" alt="" style="width:100%;height:100%;object-fit:cover"/>`
    : `<i class="ti ti-user" style="color:#94a3b8" aria-hidden="true"></i>`;

  const likeBtn = document.getElementById('pm-like-btn');
  likeBtn.classList.toggle('liked', !!post.liked);
  document.getElementById('pm-heart-icon').className = 'ti ' + (post.liked ? 'ti-heart-filled' : 'ti-heart');
  document.getElementById('post-modal').classList.add('open');
}

function closePostModal(event) {
  if (event.target === document.getElementById('post-modal')) {
    document.getElementById('post-modal').classList.remove('open');
  }
}

function toggleLike() {
  const post = state.posts.find((x) => x.id === currentPostId);
  if (!post) return;

  post.liked = !post.liked;
  post.likes = (post.likes || 0) + (post.liked ? 1 : -1);

  const likeBtn = document.getElementById('pm-like-btn');
  likeBtn.classList.toggle('liked', post.liked);
  document.getElementById('pm-heart-icon').className = 'ti ' + (post.liked ? 'ti-heart-filled' : 'ti-heart');
  document.getElementById('pm-likes').textContent = post.likes;

  persistState();
  renderGrid();
}

function deletePost() {
  if (!confirm('Delete this post?')) return;

  state.posts = state.posts.filter((p) => p.id !== currentPostId);
  persistState();
  renderProfile();
  renderGrid();
  document.getElementById('post-modal').classList.remove('open');
  showToast('Post deleted', 'ti-trash');
}

function sharePost() {
  showToast('Link copied! (demo)', 'ti-share');
}

function openAddPost() {
  pendingPostImg = null;
  document.getElementById('post-preview-img').style.display = 'none';
  document.getElementById('upload-zone').style.display = 'block';
  document.getElementById('post-caption-input').value = '';
  document.getElementById('post-file-input').value = '';
  document.getElementById('add-post-modal').classList.add('open');
}

function closeAddPostModal(event) {
  if (event.target === document.getElementById('add-post-modal')) {
    document.getElementById('add-post-modal').classList.remove('open');
  }
}

function handlePostImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    pendingPostImg = ev.target.result;
    const preview = document.getElementById('post-preview-img');
    preview.src = pendingPostImg;
    preview.style.display = 'block';
    document.getElementById('upload-zone').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function submitPost() {
  if (!pendingPostImg) {
    showToast('Please select a photo first', 'ti-alert-circle');
    return;
  }

  const caption = document.getElementById('post-caption-input').value.trim();
  state.posts.unshift({
    id: Date.now(),
    img: pendingPostImg,
    caption,
    likes: 0,
    comments: 0,
    liked: false,
    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  });

  persistState();
  renderProfile();
  document.getElementById('add-post-modal').classList.remove('open');
  showToast('Post shared!');
  switchTab('profile');
}

function openEditProfile() {
  const p = state.profile;
  document.getElementById('ep-name').value = p.name || '';
  document.getElementById('ep-username').value = p.username || 'stranger';
  document.getElementById('ep-bio').value = p.bio || '';
  document.getElementById('ep-website').value = p.website || '';
  document.getElementById('edit-profile-modal').classList.add('open');
}

function closeEditModal(event) {
  if (event.target === document.getElementById('edit-profile-modal')) {
    document.getElementById('edit-profile-modal').classList.remove('open');
  }
}

function saveProfile() {
  state.profile.name = document.getElementById('ep-name').value.trim();
  state.profile.username = document.getElementById('ep-username').value.trim().replace('@', '') || 'stranger';
  state.profile.bio = document.getElementById('ep-bio').value.trim();
  state.profile.website = document.getElementById('ep-website').value.trim();

  persistState();
  renderProfile();
  document.getElementById('edit-profile-modal').classList.remove('open');
  showToast('Profile updated!');
}

function saveFollowStats() {
  state.profile.followers = parseInt(document.getElementById('inp-followers').value, 10) || 0;
  state.profile.following = parseInt(document.getElementById('inp-following').value, 10) || 0;
  persistState();
  renderProfile();
  showToast('Stats updated!');
}

function triggerCoverUpload() {
  document.getElementById('cover-file').click();
}

function handleCoverUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    state.profile.cover = ev.target.result;
    persistState();
    renderProfile();
    showToast('Cover photo updated!');
  };
  reader.readAsDataURL(file);
}

function handleAvatarUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    state.profile.avatar = ev.target.result;
    persistState();
    renderProfile();
    document.getElementById('ig-avatar-ring').className = 'ig-avatar-ring';
    showToast('Profile photo updated!');
  };
  reader.readAsDataURL(file);
}

function addHighlight() {
  showToast('Highlights coming soon!', 'ti-star');
}

/* Hero stats */
function updateHeroStats() {
  const total = state.expenses.reduce((sum, expense) => sum + Number(expense.amt || 0), 0);
  document.getElementById('hs-exp').textContent = fmt(total);
  document.getElementById('hs-txn').textContent = state.expenses.length;
  document.getElementById('hs-cred').textContent = state.creds.length;
  document.getElementById('hs-notes').textContent = state.notes.length;
}

/* Expenses */
function addExpense() {
  const desc = document.getElementById('exp-desc').value.trim();
  const amt = parseFloat(document.getElementById('exp-amt').value);
  const cat = document.getElementById('exp-cat').value;
  const date = document.getElementById('exp-date').value;

  if (!desc || Number.isNaN(amt) || amt <= 0) {
    showToast('Enter a valid description and amount', 'ti-alert-circle');
    return;
  }

  state.expenses.unshift({
    id: Date.now(),
    desc,
    amt,
    cat,
    date
  });

  persistState();
  renderExpenses();
  updateHeroStats();

  document.getElementById('exp-desc').value = '';
  document.getElementById('exp-amt').value = '';
  showToast('Expense added');
}

function delExpense(id) {
  state.expenses = state.expenses.filter((expense) => expense.id !== id);
  persistState();
  renderExpenses();
  updateHeroStats();
}

function renderExpenses() {
  const list = document.getElementById('exp-list');
  const total = state.expenses.reduce((sum, expense) => sum + Number(expense.amt || 0), 0);
  document.getElementById('exp-total').textContent = fmt(total);

  if (!state.expenses.length) {
    list.innerHTML = '<div class="empty-state"><i class="ti ti-receipt"></i><p>No expenses yet</p></div>';
    return;
  }

  const iconMap = {
    food: 'pizza',
    transport: 'car',
    bills: 'file-invoice',
    health: 'heart-rate-monitor',
    entertainment: 'device-gamepad',
    other: 'tag'
  };

  list.innerHTML = state.expenses.map((expense) => `
    <div class="item">
      <div class="avatar" style="background:${CAT_COLORS[expense.cat]}22;border:1px solid ${CAT_COLORS[expense.cat]}44">
        <i class="ti ti-${iconMap[expense.cat] || 'tag'}" style="color:${CAT_COLORS[expense.cat]};font-size:18px" aria-hidden="true"></i>
      </div>
      <div class="item-main">
        <div class="item-title">${expense.desc} ${catBadge(expense.cat)}</div>
        <div class="item-sub">${expense.date || ''}</div>
      </div>
      <div style="font-size:15px;font-weight:700;color:#a5b4fc;margin-right:8px">${fmt(expense.amt)}</div>
      <button class="btn btn-sm btn-danger" onclick="delExpense(${expense.id})"><i class="ti ti-trash" aria-hidden="true"></i></button>
    </div>
  `).join('');
}

/* Vault */
function addCred() {
  const platform = document.getElementById('v-platform').value.trim();
  const user = document.getElementById('v-user').value.trim();
  const pass = document.getElementById('v-pass').value.trim();
  const url = document.getElementById('v-url').value.trim();

  if (!platform || !user || !pass) {
    showToast('Platform, username & password required', 'ti-alert-circle');
    return;
  }

  state.creds.unshift({
    id: Date.now(),
    p: platform,
    u: user,
    pw: pass,
    url,
    show: false,
    color: Math.floor(Math.random() * avatarColors.length)
  });

  persistState();
  renderVault();
  updateHeroStats();

  ['v-platform', 'v-user', 'v-pass', 'v-url'].forEach((id) => {
    document.getElementById(id).value = '';
  });

  showToast('Credential saved');
}

function delCred(id) {
  state.creds = state.creds.filter((cred) => cred.id !== id);
  persistState();
  renderVault();
  updateHeroStats();
}

function togglePass(id) {
  const cred = state.creds.find((c) => c.id === id);
  if (!cred) return;
  cred.show = !cred.show;
  renderVault();
}

function copyText(txt) {
  navigator.clipboard.writeText(txt)
    .then(() => showToast('Copied!', 'ti-copy'))
    .catch(() => showToast('Copy failed', 'ti-alert-circle'));
}

function renderVault() {
  const list = document.getElementById('vault-list');

  if (!state.creds.length) {
    list.innerHTML = '<div class="empty-state"><i class="ti ti-lock"></i><p>No credentials saved yet</p></div>';
    return;
  }

  list.innerHTML = state.creds.map((cred) => `
    <div class="item">
      <div class="avatar" style="background:${avatarColors[cred.color || 0]};border:none">
        <span style="color:#fff;font-size:13px;font-weight:700">${(cred.p || '').slice(0,2).toUpperCase()}</span>
      </div>
      <div class="item-main">
        <div class="item-title" style="display:flex;align-items:center;gap:8px">
          <span>${cred.p}</span>
          ${cred.url ? `<a href="${cred.url}" target="_blank" rel="noreferrer" style="color:#6366f1;font-size:12px"><i class="ti ti-external-link" aria-hidden="true"></i></a>` : ''}
        </div>
        <div class="item-sub">${cred.u}</div>
        <div class="pass-wrap">
          <span class="pass-text">${cred.show ? cred.pw : '••••••••••'}</span>
          <button class="btn btn-sm" onclick="togglePass(${cred.id})"><i class="ti ti-${cred.show ? 'eye-off' : 'eye'}" aria-hidden="true"></i></button>
          <button class="btn btn-sm" onclick="copyText('${String(cred.pw).replace(/'/g, "\\'")}')"><i class="ti ti-copy" aria-hidden="true"></i></button>
        </div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="delCred(${cred.id})"><i class="ti ti-trash" aria-hidden="true"></i></button>
    </div>
  `).join('');
}

/* Notes */
function addNote() {
  const title = document.getElementById('n-title').value.trim();
  const project = document.getElementById('n-project').value.trim();
  const type = document.getElementById('n-type').value;
  const body = document.getElementById('n-body').value.trim();

  if (!title || !body) {
    showToast('Title and content required', 'ti-alert-circle');
    return;
  }

  state.notes.unshift({
    id: Date.now(),
    title,
    project,
    type,
    body,
    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  });

  persistState();
  renderNotes();
  updateHeroStats();

  ['n-title', 'n-project', 'n-body'].forEach((id) => {
    document.getElementById(id).value = '';
  });

  showToast('Note saved');
}

function delNote(id) {
  state.notes = state.notes.filter((note) => note.id !== id);
  persistState();
  renderNotes();
  updateHeroStats();
}

function renderNotes() {
  const q = (document.getElementById('n-search').value || '').toLowerCase();
  const list = document.getElementById('notes-list');
  const filtered = state.notes.filter((note) => {
    const project = (note.project || '').toLowerCase();
    return !q || note.title.toLowerCase().includes(q) || project.includes(q);
  });

  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state"><i class="ti ti-notes"></i><p>No notes yet</p></div>';
    return;
  }

  const icons = { note: 'ti-file-text', idea: 'ti-bulb', task: 'ti-checkbox' };
  const cols = { note: '#3b82f6', idea: '#f59e0b', task: '#10b981' };

  list.innerHTML = filtered.map((note) => `
    <div class="item">
      <div class="avatar" style="background:${cols[note.type]}22;border:1px solid ${cols[note.type]}44">
        <i class="ti ${icons[note.type]}" style="color:${cols[note.type]};font-size:18px" aria-hidden="true"></i>
      </div>
      <div class="item-main">
        <div class="item-title" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span>${note.title}</span>
          <span class="badge b-${note.type}">${note.type}</span>
          ${note.project ? `<span class="badge" style="background:rgba(255,255,255,.07);color:#94a3b8">${note.project}</span>` : ''}
        </div>
        <div style="font-size:13px;color:#94a3b8;margin-top:5px;line-height:1.5">${note.body}</div>
        <div class="item-sub" style="margin-top:4px">${note.date}</div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="delNote(${note.id})"><i class="ti ti-trash" aria-hidden="true"></i></button>
    </div>
  `).join('');
}

/* Overview */
function renderOverview() {
  updateHeroStats();

  const cats = ['food', 'transport', 'bills', 'health', 'entertainment', 'other'];
  const catTotals = cats.map((cat) => state.expenses.filter((e) => e.cat === cat).reduce((sum, expense) => sum + Number(expense.amt || 0), 0));
  const total = catTotals.reduce((a, b) => a + b, 0) || 1;
  const colors = cats.map((cat) => CAT_COLORS[cat]);

  if (catChartInst) catChartInst.destroy();

  const hasData = catTotals.some((v) => v > 0);
  catChartInst = new Chart(document.getElementById('catChart').getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: cats.map((cat) => cat.charAt(0).toUpperCase() + cat.slice(1)),
      datasets: [{
        data: hasData ? catTotals : [1],
        backgroundColor: hasData ? colors.map((c) => c + 'cc') : ['#334155'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => hasData ? ` ${ctx.label}: ${fmt(ctx.raw)}` : ''
          }
        }
      }
    }
  });

  document.getElementById('cat-bars').innerHTML = cats.map((cat, index) => `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span style="display:flex;align-items:center;gap:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:${colors[index]};display:inline-block"></span>
          ${cat.charAt(0).toUpperCase() + cat.slice(1)}
        </span>
        <span style="color:#94a3b8">${fmt(catTotals[index])}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.round((catTotals[index] / total) * 100)}%;background:${colors[index]}"></div></div>
    </div>
  `).join('');

  const recent = [
    ...state.expenses.slice(0, 3).map((expense) => ({
      icon: 'ti-receipt',
      col: CAT_COLORS[expense.cat],
      label: expense.desc,
      sub: fmt(expense.amt),
      date: expense.date
    })),
    ...state.notes.slice(0, 2).map((note) => ({
      icon: 'ti-notes',
      col: '#f59e0b',
      label: note.title,
      sub: note.type,
      date: note.date
    }))
  ];

  const activity = document.getElementById('recent-activity');
  if (!recent.length) {
    activity.innerHTML = '<div class="empty-state" style="padding:1.5rem"><i class="ti ti-activity"></i><p>No activity yet</p></div>';
    return;
  }

  activity.innerHTML = recent.map((entry) => `
    <div class="item" style="padding:8px 0">
      <div style="width:32px;height:32px;border-radius:10px;background:${entry.col}22;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="ti ${entry.icon}" style="color:${entry.col};font-size:15px" aria-hidden="true"></i>
      </div>
      <div class="item-main">
        <div style="font-size:13px;font-weight:500;color:#e2e8f0">${entry.label}</div>
        <div style="font-size:11px;color:#64748b">${entry.date}</div>
      </div>
      <span style="font-size:12px;color:#94a3b8">${entry.sub}</span>
    </div>
  `).join('');
}

function renderAll() {
  renderExpenses();
  renderVault();
  renderNotes();
  renderOverview();
  renderProfile();
}

function initialize() {
  loadState();
  document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
  renderAll();
  startClock();
}

window.addEventListener('DOMContentLoaded', initialize);

/* Expose functions for inline handlers */
window.switchTab = switchTab;
window.switchIgTab = switchIgTab;
window.openPost = openPost;
window.closePostModal = closePostModal;
window.toggleLike = toggleLike;
window.deletePost = deletePost;
window.sharePost = sharePost;
window.openAddPost = openAddPost;
window.closeAddPostModal = closeAddPostModal;
window.handlePostImage = handlePostImage;
window.submitPost = submitPost;
window.openEditProfile = openEditProfile;
window.closeEditModal = closeEditModal;
window.saveProfile = saveProfile;
window.saveFollowStats = saveFollowStats;
window.triggerCoverUpload = triggerCoverUpload;
window.handleCoverUpload = handleCoverUpload;
window.handleAvatarUpload = handleAvatarUpload;
window.addHighlight = addHighlight;
window.addExpense = addExpense;
window.delExpense = delExpense;
window.addCred = addCred;
window.delCred = delCred;
window.togglePass = togglePass;
window.copyText = copyText;
window.addNote = addNote;
window.delNote = delNote;
window.renderNotes = renderNotes;
window.renderOverview = renderOverview;
window.openFollowersModal = function openFollowersModal(type) {
  showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} list is a demo`, 'ti-users');
};

const authView = document.querySelector('#auth-view');
const authContent = document.querySelector('#auth-content');
const appView = document.querySelector('#app-view');
const pageContent = document.querySelector('#page-content');
const modal = document.querySelector('#modal');
const toast = document.querySelector('#toast');

const STORAGE_KEY = 'frostywrld-static-data';
const SESSION_KEY = 'frostywrld-session';

let currentUser = null;
let dashboard = null;
let toastTimer;
let activePage = 'overview';

const roleLabels = {
  admin: 'Headmaster · Administrator',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent / Guardian',
};

const navItems = [
  { id: 'overview', label: 'Overview', icon: '⌂', roles: ['admin', 'teacher', 'student', 'parent'] },
  { id: 'students', label: 'Students', icon: '♙', roles: ['admin', 'teacher'] },
  { id: 'grades', label: 'Grades & results', icon: '▤', roles: ['admin', 'teacher', 'student', 'parent'] },
  { id: 'attendance', label: 'Attendance', icon: '◷', roles: ['admin', 'teacher', 'student', 'parent'] },
  { id: 'announcements', label: 'Announcements', icon: '◇', roles: ['admin', 'teacher', 'student', 'parent'] },
  { id: 'accounts', label: 'User accounts', icon: '♧', roles: ['admin'] },
];

const seedData = {
  users: [
    { id: 'u-admin', name: 'Ava Sterling', email: 'admin@frostywrld.edu', password: 'admin1234', role: 'admin' },
    { id: 'u-teacher', name: 'Jordan Blake', email: 'teacher@frostywrld.edu', password: 'teacher1234', role: 'teacher' },
    { id: 'u-student', name: 'Mila Stone', email: 'student@frostywrld.edu', password: 'student1234', role: 'student' },
    { id: 'u-parent', name: 'Noah Stone', email: 'parent@frostywrld.edu', password: 'parent1234', role: 'parent' },
  ],
  students: [
    { id: 's-101', full_name: 'Mila Stone', admission_no: 'LIS-2026-014', class_name: 'Grade 10 · Blue', has_photo: false, parent_name: 'Noah Stone', parent_email: 'parent@frostywrld.edu', linked_account_email: 'student@frostywrld.edu' },
    { id: 's-102', full_name: 'Aiden Brooks', admission_no: 'LIS-2026-027', class_name: 'Grade 9 · Silver', has_photo: false, parent_name: 'Claire Brooks', parent_email: 'families@frostywrld.edu', linked_account_email: '' },
    { id: 's-103', full_name: 'Zoe Carter', admission_no: 'LIS-2026-031', class_name: 'Grade 11 · Aurora', has_photo: false, parent_name: 'Marcus Carter', parent_email: 'families@frostywrld.edu', linked_account_email: '' },
  ],
  grades: [
    { id: 'g-1', student_id: 's-101', student_name: 'Mila Stone', subject: 'Mathematics', term: 'Term 1 · 2026', score: 96, max_score: 100 },
    { id: 'g-2', student_id: 's-101', student_name: 'Mila Stone', subject: 'Science', term: 'Term 1 · 2026', score: 93, max_score: 100 },
    { id: 'g-3', student_id: 's-102', student_name: 'Aiden Brooks', subject: 'English', term: 'Term 1 · 2026', score: 88, max_score: 100 },
    { id: 'g-4', student_id: 's-103', student_name: 'Zoe Carter', subject: 'History', term: 'Term 1 · 2026', score: 91, max_score: 100 },
  ],
  attendance: [
    { id: 'a-1', student_id: 's-101', student_name: 'Mila Stone', attendance_date: '2026-10-18', status: 'present' },
    { id: 'a-2', student_id: 's-102', student_name: 'Aiden Brooks', attendance_date: '2026-10-18', status: 'late' },
    { id: 'a-3', student_id: 's-103', student_name: 'Zoe Carter', attendance_date: '2026-10-18', status: 'present' },
    { id: 'a-4', student_id: 's-101', student_name: 'Mila Stone', attendance_date: '2026-10-17', status: 'present' },
  ],
  announcements: [
    { id: 'n-1', title: 'Campus open house', audience: 'all', body: 'Families are invited to the autumn open house on Friday at 4:00 PM.', created_at: '2026-10-10T09:00:00', author: 'Ava Sterling' },
    { id: 'n-2', title: 'Science fair registration', audience: 'all', body: 'Students who want to present projects should sign up by Friday.', created_at: '2026-10-12T13:15:00', author: 'Jordan Blake' },
  ],
};

function readData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
  return seedData;
}

function writeData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function formatDate(value, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? escapeHtml(value) : date.toLocaleDateString(undefined, options);
}

function initials(name) {
  return String(name || '?').split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3300);
}

function showAuth(setup = false) {
  appView.hidden = true;
  authView.hidden = false;
  if (setup) renderSetup(); else renderLogin();
}

function renderLogin() {
  authContent.innerHTML = `
    <p class="eyebrow auth-eyebrow">WELCOME TO YOUR SCHOOL PORTAL</p>
    <h1 class="auth-heading">Good to have you here.</h1>
    <p class="auth-subtitle">Sign in to pick up where your learning journey left off.</p>
    <form id="login-form">
      <div class="field"><label for="login-email">EMAIL ADDRESS</label><input id="login-email" name="email" type="email" autocomplete="username" placeholder="you@frostywrld.edu" required maxlength="160"></div>
      <div class="field"><label for="login-password">PASSWORD</label><input id="login-password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required minlength="8"></div>
      <p class="auth-error" id="auth-error" role="alert"></p>
      <button class="button-primary auth-submit" type="submit">Sign in to your portal <span aria-hidden="true">→</span></button>
    </form>`;

  document.querySelector('#login-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button');
    const error = document.querySelector('#auth-error');
    const email = form.email.value.trim();
    const password = form.password.value;

    const data = readData();
    const match = data.users.find((user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password);

    if (!match) {
      error.textContent = 'We could not find a matching portal account.';
      button.disabled = false;
      return;
    }

    currentUser = { ...match };
    localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    enterApp();
  });
}

function renderSetup() {
  authContent.innerHTML = `
    <p class="eyebrow auth-eyebrow">WELCOME TO FROSTYWRLD</p>
    <h1 class="auth-heading">Set up your school.</h1>
    <p class="auth-subtitle">Create the first account. This one-time account has headmaster administrator access.</p>
    <form id="setup-form">
      <div class="field"><label for="setup-name">HEADMASTER'S FULL NAME</label><input id="setup-name" name="name" autocomplete="name" placeholder="Your full name" required maxlength="160"></div>
      <div class="field"><label for="setup-email">EMAIL ADDRESS</label><input id="setup-email" name="email" type="email" autocomplete="email" placeholder="headmaster@frostywrld.edu" required maxlength="160"></div>
      <div class="field"><label for="setup-password">PASSWORD <span class="label-note">· at least 12 characters</span></label><input id="setup-password" name="password" type="password" autocomplete="new-password" placeholder="Create a secure password" required minlength="12"></div>
      <p class="auth-error" id="auth-error" role="alert"></p>
      <button class="button-primary auth-submit" type="submit">Create administrator account <span aria-hidden="true">→</span></button>
    </form>`;

  document.querySelector('#setup-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button');
    const error = document.querySelector('#auth-error');
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;

    const data = readData();
    if (data.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
      error.textContent = 'An account with that email already exists.';
      return;
    }

    const newUser = { id: `u-${Date.now()}`, name, email, password, role: 'admin' };
    data.users.unshift(newUser);
    writeData(data);
    currentUser = { ...newUser };
    localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    enterApp();
  });
}

function buildDashboard(user) {
  const store = readData();
  const students = user.role === 'admin' || user.role === 'teacher'
    ? store.students
    : store.students.filter((student) => {
        if (user.role === 'student') return student.linked_account_email === user.email;
        if (user.role === 'parent') return student.parent_email === user.email || student.parent_name === user.name;
        return false;
      });

  const grades = store.grades.filter((grade) => !['student', 'parent'].includes(user.role) || students.some((student) => student.id === grade.student_id));
  const attendance = store.attendance.filter((entry) => !['student', 'parent'].includes(user.role) || students.some((student) => student.id === entry.student_id));

  return {
    user,
    students,
    grades,
    attendance,
    announcements: store.announcements,
    counts: {
      students: store.students.length,
      teachers: store.users.filter((entry) => entry.role === 'teacher').length,
      grades: store.grades.length,
      attendance_records: store.attendance.length,
    },
  };
}

function bootstrap() {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  const data = readData();
  if (session && data.users.some((user) => user.email.toLowerCase() === session.email.toLowerCase() && user.password === session.password)) {
    currentUser = { ...data.users.find((user) => user.email.toLowerCase() === session.email.toLowerCase()) };
    enterApp();
    return;
  }

  if (!data.users.some((user) => user.role === 'admin')) {
    showAuth(true);
  } else {
    showAuth(false);
  }
}

function enterApp() {
  authView.hidden = true;
  appView.hidden = false;
  document.querySelector('#year-now').textContent = new Date().getFullYear();
  const name = escapeHtml(currentUser.name);
  document.querySelector('#user-chip').innerHTML = `<span class="avatar">${escapeHtml(initials(currentUser.name))}</span><span class="user-chip-copy"><strong>${name}</strong><small>${escapeHtml(roleLabels[currentUser.role])}</small></span>`;
  renderNav();
  loadDashboard();
}

function renderNav() {
  const items = navItems.filter((item) => item.roles.includes(currentUser.role));
  document.querySelector('#main-nav').innerHTML = items
    .map((item) => `<button class="nav-item${activePage === item.id ? ' active' : ''}" data-page="${item.id}"><span class="nav-icon">${item.icon}</span>${item.label}</button>`)
    .join('');

  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      activePage = button.dataset.page;
      document.querySelector('#sidebar').classList.remove('open');
      renderNav();
      renderPage();
    });
  });
}

async function loadDashboard() {
  dashboard = buildDashboard(currentUser);
  renderPage();
}

function heading(title, subtitle, action = '') {
  return `<div class="welcome-row"><div><p class="welcome-kicker">${escapeHtml(roleLabels[currentUser.role])}</p><h1 class="page-title">${escapeHtml(title)}</h1><p class="page-subtitle">${escapeHtml(subtitle)}</p></div>${action}</div>`;
}

function stats() {
  const counts = dashboard.counts;
  const list = currentUser.role === 'admin'
    ? [
        ['Enrolled students', counts.students, '♙', 'Across all year groups'],
        ['Teaching staff', counts.teachers, '♧', 'Active staff accounts'],
        ['Grade records', counts.grades, '▤', 'In your view'],
        ['Attendance records', counts.attendance_records, '◷', 'In your view'],
      ]
    : currentUser.role === 'teacher'
      ? [
          ['My students', dashboard.students.length, '♙', 'Students in the school directory'],
          ['Grade records', counts.grades, '▤', 'Recently recorded results'],
          ['Attendance', counts.attendance_records, '◷', 'This academic term'],
          ['Announcements', dashboard.announcements.length, '◇', 'Shared updates'],
        ]
      : [
          ['My learner(s)', dashboard.students.length, '♙', 'Linked student record'],
          ['Grade records', dashboard.grades.length, '▤', 'Recent results'],
          ['Attendance', dashboard.attendance.length, '◷', 'School register'],
          ['Announcements', dashboard.announcements.length, '◇', 'Important updates'],
        ];

  return `<div class="stat-grid">${list.map(([label, value, icon, note]) => `<article class="stat-card"><div class="stat-top"><span>${escapeHtml(label)}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${escapeHtml(value)}</div><div class="stat-note">${escapeHtml(note)}</div></article>`).join('')}</div>`;
}

function panelHeader(title, subtitle, button = '') {
  return `<div class="panel-header"><div><h2 class="panel-title">${escapeHtml(title)}</h2><p class="panel-caption">${escapeHtml(subtitle)}</p></div>${button}</div>`;
}

function gradeRows(grades, showStudent = true) {
  if (!grades.length) return `<tr><td class="table-empty" colspan="${showStudent ? 5 : 4}">No grade records yet.</td></tr>`;
  return grades.map((grade) => `<tr>${showStudent ? `<td><strong>${escapeHtml(grade.student_name)}</strong></td>` : ''}<td>${escapeHtml(grade.subject)}</td><td>${escapeHtml(grade.term)}</td><td>${escapeHtml(grade.score)}/${escapeHtml(grade.max_score)}</td><td><span class="badge badge-role">${escapeHtml(grade.score >= 80 ? 'Strong' : grade.score >= 60 ? 'On track' : 'Needs focus')}</span></td></tr>`).join('');
}

function attendanceRows(rows, showStudent = true) {
  if (!rows.length) return `<tr><td class="table-empty" colspan="${showStudent ? 4 : 3}">No attendance records yet.</td></tr>`;
  return rows.map((record) => `<tr>${showStudent ? `<td><strong>${escapeHtml(record.student_name)}</strong></td>` : ''}<td>${formatDate(record.attendance_date)}</td><td><span class="badge badge-${record.status}">${escapeHtml(record.status)}</span></td></tr>`).join('');
}

function studentRows(students) {
  if (!students.length) return `<tr><td class="table-empty" colspan="4">No students registered yet. Add the first student to get started.</td></tr>`;
  return students.map((student) => `<tr><td><span class="student-name-cell">${studentPhoto(student)}<strong>${escapeHtml(student.full_name)}</strong></span></td><td>${escapeHtml(student.admission_no)}</td><td>${escapeHtml(student.class_name)}</td><td><span class="badge badge-role">${escapeHtml(student.parent_name || 'Guardian')}</span></td></tr>`).join('');
}

function studentPhoto(student, className = 'student-photo') {
  if (student.has_photo && student.photo_data) {
    return `<img class="${className}" src="${student.photo_data}" alt="${escapeHtml(student.full_name)} passport photo" loading="lazy">`;
  }
  return `<span class="${className} student-photo-placeholder" aria-label="No photo">${escapeHtml(initials(student.full_name))}</span>`;
}

function learnerProfile() {
  if (['admin', 'teacher'].includes(currentUser.role) || !dashboard.students.length) return '';
  const learner = dashboard.students[0];
  return `<section class="panel learner-profile"><div class="learner-profile-photo">${studentPhoto(learner, 'student-profile-photo')}</div><div><p class="panel-caption">YOUR STUDENT PROFILE</p><h2 class="page-title" style="font-size: 20px;">${escapeHtml(learner.full_name)}</h2><p class="learner-profile-class">${escapeHtml(learner.class_name)}</p></div></section>`;
}

function announcementCards(items) {
  if (!items.length) return `<div class="table-empty">No announcements have been shared yet.</div>`;
  return items.map((item) => `<article class="announcement-item"><div class="announcement-top"><strong>${escapeHtml(item.title)}</strong><span class="announcement-date">${formatDate(item.created_at)}</span></div><p>${escapeHtml(item.body)}</p><div class="announcement-author">Posted by ${escapeHtml(item.author)}</div></article>`).join('');
}

function actionButtons() {
  if (currentUser.role === 'admin') return `<h2 class="section-heading">Quick actions</h2><div class="action-row"><button class="action-button" data-modal="student"><span class="action-icon">＋</span>Register student</button><button class="action-button" data-modal="grade"><span class="action-icon">＋</span>Record grade</button><button class="action-button" data-modal="attendance"><span class="action-icon">＋</span>Record attendance</button><button class="action-button" data-modal="announcement"><span class="action-icon">＋</span>Post announcement</button></div>`;
  if (currentUser.role === 'teacher') return `<h2 class="section-heading">Teaching tools</h2><div class="action-row"><button class="action-button" data-modal="grade"><span class="action-icon">＋</span>Record grade</button><button class="action-button" data-modal="attendance"><span class="action-icon">＋</span>Record attendance</button></div>`;
  return '';
}

function overviewPage() {
  const greeting = `Welcome back, ${escapeHtml(currentUser.name.split(/\s+/)[0])}.`;
  const grades = dashboard.grades.slice(0, 5);
  const attendance = dashboard.attendance.slice(0, 5);
  return `${heading(greeting, currentUser.role === 'admin' ? "Here is your school's academic snapshot." : 'Here is your learning and school community snapshot.')}${stats()}${learnerProfile()}<div class="dashboard-grid"><section class="panel"><div class="panel-header"><div><h2 class="panel-title">Recent grades</h2><p class="panel-caption">Latest assessment updates</p></div></div><div class="table-wrap"><table><thead><tr><th>Student</th><th>Subject</th><th>Term</th><th>Score</th><th>Status</th></tr></thead><tbody>${gradeRows(grades, true)}</tbody></table></div></section><section class="panel"><div class="panel-header"><div><h2 class="panel-title">Attendance </h2><p class="panel-caption">Most recent register</p></div></div><div class="table-wrap"><table><thead><tr><th>Student</th><th>Date</th><th>Status</th></tr></thead><tbody>${attendanceRows(attendance, true)}</tbody></table></div></section></div>${actionButtons()}`;
}

function studentsPage() {
  return `${heading('Student directory', 'Registration records and family contacts.', `<button class="button-primary" data-modal="student">＋ Register student</button>`)}<section class="panel">${panelHeader('School roster', 'Current active students')}<div class="table-wrap"><table><thead><tr><th>Student</th><th>Admission no.</th><th>Class</th><th>Parent</th></tr></thead><tbody>${studentRows(dashboard.students)}</tbody></table></div></section>`;
}

function gradesPage() {
  const canManage = ['admin', 'teacher'].includes(currentUser.role);
  return `${heading('Grades & results', 'Review academic progress and assessment results.', canManage ? `<button class="button-primary" data-modal="grade">＋ Record a grade</button>` : '')}<section class="panel">${panelHeader('Recent grade entries', 'Latest academic performance overview')}<div class="table-wrap"><table><thead><tr><th>Student</th><th>Subject</th><th>Term</th><th>Score</th><th>Status</th></tr></thead><tbody>${gradeRows(dashboard.grades, true)}</tbody></table></div></section>`;
}

function attendancePage() {
  const canManage = ['admin', 'teacher'].includes(currentUser.role);
  return `${heading('Attendance', 'A clear view of the school register.', canManage ? `<button class="button-primary" data-modal="attendance">＋ Record attendance</button>` : '')}<section class="panel">${panelHeader('School attendance', 'Latest recorded attendance updates')}<div class="table-wrap"><table><thead><tr><th>Student</th><th>Date</th><th>Status</th></tr></thead><tbody>${attendanceRows(dashboard.attendance, true)}</tbody></table></div></section>`;
}

function announcementsPage() {
  return `${heading('Announcements', 'Important updates for your school community.', currentUser.role === 'admin' ? `<button class="button-primary" data-modal="announcement">＋ Post announcement</button>` : '')}<section class="panel">${panelHeader('Latest updates', 'Shared news and reminders')}<div class="announcement-list">${announcementCards(dashboard.announcements)}</div></section>`;
}

function accountsPage() {
  const users = readData().users;
  return `${heading('User accounts', 'Manage staff, student and parent access.', `<button class="button-primary" data-modal="account">＋ Create account</button>`)}<section class="panel">${panelHeader('Portal users', 'Everyone with access to the platform')}<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>${users.map((user) => `<tr><td><strong>${escapeHtml(user.name)}</strong></td><td>${escapeHtml(user.email)}</td><td><span class="badge badge-role">${escapeHtml(user.role)}</span></td></tr>`).join('')}</tbody></table></div></section>`;
}

async function renderPage() {
  if (!dashboard || !currentUser) return;
  const names = { overview: 'Overview', students: 'Students', grades: 'Grades & results', attendance: 'Attendance', announcements: 'Announcements', accounts: 'User accounts' };
  document.querySelector('#crumb-current').textContent = names[activePage] || 'Overview';
  pageContent.innerHTML = '<div class="page-alert">Loading your authorized view…</div>';

  try {
    const renderers = {
      overview: overviewPage,
      students: studentsPage,
      grades: gradesPage,
      attendance: attendancePage,
      announcements: announcementsPage,
      accounts: accountsPage,
    };

    pageContent.innerHTML = (renderers[activePage] || overviewPage)();
    pageContent.querySelectorAll('[data-modal]').forEach((button) => button.addEventListener('click', () => openForm(button.dataset.modal)));
  } catch (err) {
    pageContent.innerHTML = `<div class="page-alert">${escapeHtml(err.message)}</div>`;
  }
}

function field(name, label, type = 'text', options = {}) {
  const { required = true, placeholder = '', value = '', min = '', max = '', step = '', choices = null, extra = '' } = options;
  const requiredAttr = required ? 'required' : '';
  if (choices) {
    return `<div class="field ${extra}"><label for="f-${name}">${label.toUpperCase()}</label><select id="f-${name}" name="${name}" ${requiredAttr}>${choices.map(([val, text]) => `<option value="${escapeHtml(val)}">${escapeHtml(text)}</option>`).join('')}</select></div>`;
  }
  if (type === 'textarea') {
    return `<div class="field ${extra}"><label for="f-${name}">${label.toUpperCase()}</label><textarea id="f-${name}" name="${name}" placeholder="${escapeHtml(placeholder)}" ${requiredAttr}>${escapeHtml(value)}</textarea></div>`;
  }
  return `<div class="field ${extra}"><label for="f-${name}">${label.toUpperCase()}</label><input id="f-${name}" name="${name}" type="${type}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}" ${requiredAttr} ${min ? `min="${escapeHtml(min)}"` : ''} ${max ? `max="${escapeHtml(max)}"` : ''} ${step ? `step="${escapeHtml(step)}"` : ''}></div>`;
}

function openForm(kind) {
  const data = readData();
  let students = data.students;

  const studentChoices = students.map((student) => [student.id, `${student.full_name} · ${student.admission_no}`]);
  const studentField = field('student_id', 'Student', 'select', { choices: studentChoices });

  const forms = {
    student: {
      title: 'Register a student',
      fields: field('admission_no', 'Admission number', 'text', { placeholder: 'e.g. LIS-2026-014' }) + field('full_name', 'Student\'s full name') + field('class_name', 'Class / year group', 'text', { placeholder: 'Grade 10 · Blue' }) + field('parent_name', 'Parent / guardian name') + field('parent_email', 'Parent email', 'email', { placeholder: 'guardian@example.com', required: false }) + field('linked_account_email', 'Student portal email', 'email', { placeholder: 'student@frostywrld.edu', required: false }),
    },
    account: {
      title: 'Create a portal account',
      fields: field('name', 'Full name') + field('email', 'Email address', 'email') + field('password', 'Temporary password (12+ characters)', 'password', { min: 12 }) + field('role', 'Portal role', 'select', { choices: [['admin', 'Administrator'], ['teacher', 'Teacher'], ['student', 'Student'], ['parent', 'Parent / Guardian']] }),
    },
    grade: {
      title: 'Record a grade',
      fields: `<div class="span-two">${studentField}</div>` + field('subject', 'Subject') + field('term', 'Term', 'text', { placeholder: 'e.g. Term 1 · 2026' }) + field('score', 'Score', 'number', { min: 0, max: 100, step: 1 }) + field('max_score', 'Max score', 'number', { value: 100, min: 0, max: 100, step: 1 }),
    },
    attendance: {
      title: 'Record attendance',
      fields: `<div class="span-two">${studentField}</div>` + field('attendance_date', 'Date', 'date', { value: new Date().toISOString().slice(0, 10) }) + field('status', 'Status', 'select', { choices: [['present', 'Present'], ['late', 'Late'], ['absent', 'Absent']] }),
    },
    announcement: {
      title: 'Post an announcement',
      fields: field('title', 'Title') + field('audience', 'Visible to', 'select', { choices: [['all', 'Everyone'], ['staff', 'Staff only'], ['families', 'Students & parents']] }) + field('body', 'Message', 'textarea', { placeholder: 'Share school news, reminders, or event details.' }),
    },
  };

  const config = forms[kind];
  if (!config) return;

  modal.innerHTML = `<div class="modal-header"><h2>${escapeHtml(config.title)}</h2><button class="modal-close" type="button" aria-label="Close">×</button></div><form class="modal-form" id="record-form"><div class="form-grid">${config.fields}</div><p class="auth-error" id="form-error" role="alert"></p><div class="form-actions"><button type="button" class="button-secondary modal-cancel">Cancel</button><button type="submit" class="button-primary">Save</button></div></form>`;
  modal.showModal();

  modal.querySelector('.modal-close').addEventListener('click', () => modal.close());
  modal.querySelector('.modal-cancel').addEventListener('click', () => modal.close());

  modal.querySelector('#record-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = Object.fromEntries(new FormData(form));
    const error = document.querySelector('#form-error');
    const store = readData();

    if (kind === 'student') {
      const student = {
        id: `s-${Date.now()}`,
        full_name: formData.full_name,
        admission_no: formData.admission_no,
        class_name: formData.class_name,
        parent_name: formData.parent_name || 'Guardian',
        parent_email: formData.parent_email || '',
        linked_account_email: formData.linked_account_email || '',
        has_photo: false,
      };
      store.students.unshift(student);
      writeData(store);
      modal.close();
      showToast('Student registered successfully.');
      loadDashboard();
      return;
    }

    if (kind === 'account') {
      if (store.users.some((user) => user.email.toLowerCase() === formData.email.toLowerCase())) {
        error.textContent = 'An account with that email already exists.';
        return;
      }
      store.users.push({
        id: `u-${Date.now()}`,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      writeData(store);
      modal.close();
      showToast('User account created.');
      loadDashboard();
      return;
    }

    if (kind === 'grade') {
      const student = store.students.find((entry) => String(entry.id) === String(formData.student_id));
      if (!student) {
        error.textContent = 'Choose a valid student.';
        return;
      }
      store.grades.unshift({
        id: `g-${Date.now()}`,
        student_id: student.id,
        student_name: student.full_name,
        subject: formData.subject,
        term: formData.term,
        score: Number(formData.score),
        max_score: Number(formData.max_score || 100),
      });
      writeData(store);
      modal.close();
      showToast('Grade saved.');
      loadDashboard();
      return;
    }

    if (kind === 'attendance') {
      const student = store.students.find((entry) => String(entry.id) === String(formData.student_id));
      if (!student) {
        error.textContent = 'Choose a valid student.';
        return;
      }
      store.attendance.unshift({
        id: `a-${Date.now()}`,
        student_id: student.id,
        student_name: student.full_name,
        attendance_date: formData.attendance_date,
        status: formData.status,
      });
      writeData(store);
      modal.close();
      showToast('Attendance recorded.');
      loadDashboard();
      return;
    }

    if (kind === 'announcement') {
      store.announcements.unshift({
        id: `n-${Date.now()}`,
        title: formData.title,
        audience: formData.audience,
        body: formData.body,
        created_at: new Date().toISOString(),
        author: currentUser.name,
      });
      writeData(store);
      modal.close();
      showToast('Announcement posted.');
      loadDashboard();
    }
  });
}

document.querySelector('#logout-button').addEventListener('click', () => {
  localStorage.removeItem(SESSION_KEY);
  currentUser = null;
  dashboard = null;
  activePage = 'overview';
  showAuth(false);
});

document.querySelector('#menu-toggle').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
document.querySelector('#modal').addEventListener('click', (event) => {
  if (event.target === modal) modal.close();
});

modal.addEventListener('close', () => {
  const preview = modal.querySelector('#photo-preview');
  if (preview?.src.startsWith('blob:')) URL.revokeObjectURL(preview.src);
});

bootstrap();

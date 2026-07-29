/**
 * TaskFlow — Login Page | login.js
 * ==================================
 * Handles:
 *  - Sign In / Sign Up with localStorage persistence
 *  - Password hashing (FNV-1a, no crypto API needed)
 *  - Password strength meter
 *  - Form validation (inline errors)
 *  - Show/hide password toggle
 *  - Remember Me (persists username in localStorage)
 *  - Demo account auto-login
 *  - Dark / Light theme toggle (persisted)
 *  - Auth-guard: redirects to index.html after successful login
 */

'use strict';

/* ================================================================
   CONSTANTS
   ================================================================ */
const AUTH_USERS_KEY  = 'taskflow_users_v1';
const AUTH_SESSION_KEY= 'taskflow_session_v1';
const THEME_KEY       = 'taskflow_theme_v1';
const REMEMBER_KEY    = 'taskflow_remember_v1';

const DEMO_USER = { username: 'demo', name: 'Demo User', passwordHash: hashPassword('demo1234') };

/* ================================================================
   SIMPLE HASH (FNV-1a 32-bit) — for demo/localStorage auth only
   ================================================================ */
function hashPassword(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16);
}

/* ================================================================
   USER STORE
   ================================================================ */
function getUsers() {
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    const stored = raw ? JSON.parse(raw) : [];
    // Always include the demo account
    if (!stored.find(u => u.username === 'demo')) stored.push(DEMO_USER);
    return stored;
  } catch { return [DEMO_USER]; }
}

function saveUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function findUser(username) {
  return getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
}

/* ================================================================
   SESSION
   ================================================================ */
function createSession(user) {
  const session = { username: user.username, name: user.name, loginAt: Date.now() };
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  // Also mirror to localStorage if "Remember me"
  if (document.getElementById('remember-me')?.checked) {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(AUTH_SESSION_KEY);
  }
}

/** Redirect to the app — the app's script.js will read the session. */
function redirectToApp() {
  window.location.href = 'index.html';
}

/* ================================================================
   DOM REFS
   ================================================================ */
const tabSignin   = document.getElementById('tab-signin');
const tabSignup   = document.getElementById('tab-signup');
const tabIndicator= document.getElementById('tab-indicator');
const panelSignin = document.getElementById('panel-signin');
const panelSignup = document.getElementById('panel-signup');

const signinForm    = document.getElementById('signin-form');
const signinUsername= document.getElementById('signin-username');
const signinPassword= document.getElementById('signin-password');
const signinBtn     = document.getElementById('signin-btn');
const rememberMe    = document.getElementById('remember-me');
const demoLoginBtn  = document.getElementById('demo-login-btn');
const forgotPwBtn   = document.getElementById('forgot-pw-btn');

const signupForm    = document.getElementById('signup-form');
const signupName    = document.getElementById('signup-name');
const signupUsername= document.getElementById('signup-username');
const signupPassword= document.getElementById('signup-password');
const signupConfirm = document.getElementById('signup-confirm');
const signupBtn     = document.getElementById('signup-btn');
const acceptTerms   = document.getElementById('accept-terms');

const pwStrengthFill = document.getElementById('pw-strength-fill');
const pwStrengthLabel= document.getElementById('pw-strength-label');

const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIconDark  = document.getElementById('theme-icon-dark');
const themeIconLight = document.getElementById('theme-icon-light');

const toastContainer = document.getElementById('toast-container');

/* ================================================================
   TOAST
   ================================================================ */
function showToast(message, type = 'info', duration = 3500) {
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${escHtml(message)}</span>`;
  toastContainer.appendChild(toast);
  const t = setTimeout(() => dismiss(toast), duration);
  toast.addEventListener('click', () => { clearTimeout(t); dismiss(toast); });
}
function dismiss(el) {
  el.classList.add('hide');
  el.addEventListener('animationend', () => el.remove(), { once: true });
}
function escHtml(s) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(s));
  return d.innerHTML;
}

/* ================================================================
   THEME
   ================================================================ */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  themeIconDark.style.display  = theme === 'dark'  ? 'block' : 'none';
  themeIconLight.style.display = theme === 'light' ? 'block' : 'none';
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* ================================================================
   TABS
   ================================================================ */
function switchTab(target) {
  const isSignup = target === 'signup';

  tabSignin.classList.toggle('active', !isSignup);
  tabSignup.classList.toggle('active', isSignup);
  tabSignin.setAttribute('aria-selected', String(!isSignup));
  tabSignup.setAttribute('aria-selected', String(isSignup));

  tabIndicator.classList.toggle('signup', isSignup);

  panelSignin.classList.toggle('hidden', isSignup);
  panelSignup.classList.toggle('hidden', !isSignup);

  // Clear errors on switch
  clearAllErrors();

  // Focus first input of the newly shown panel
  setTimeout(() => {
    const firstInput = (isSignup ? panelSignup : panelSignin).querySelector('input');
    if (firstInput) firstInput.focus();
  }, 200);
}

/* ================================================================
   FIELD VALIDATION HELPERS
   ================================================================ */
function setError(inputEl, message) {
  const wrap = inputEl.closest('.field-wrap');
  const errEl = document.getElementById(`${inputEl.id}-error`) ||
                document.getElementById(`${inputEl.id.replace('signup-','signup-')}-error`);
  wrap?.classList.remove('valid');
  wrap?.classList.add('invalid');
  if (errEl) errEl.textContent = message;
}
function setValid(inputEl) {
  const wrap = inputEl.closest('.field-wrap');
  const errId = `${inputEl.id}-error`;
  const errEl = document.getElementById(errId);
  wrap?.classList.remove('invalid');
  wrap?.classList.add('valid');
  if (errEl) errEl.textContent = '';
}
function clearField(inputEl) {
  const wrap = inputEl.closest('.field-wrap');
  const errEl = document.getElementById(`${inputEl.id}-error`);
  wrap?.classList.remove('valid','invalid');
  if (errEl) errEl.textContent = '';
}
function clearAllErrors() {
  document.querySelectorAll('.field-wrap').forEach(w => w.classList.remove('valid','invalid'));
  document.querySelectorAll('.field-error').forEach(e => { e.textContent = ''; });
}

/* ================================================================
   PASSWORD STRENGTH
   ================================================================ */
const STRENGTH_LEVELS = [
  { label: 'Too short',  color: '#ef4444', pct:  0 },
  { label: 'Weak',       color: '#ef4444', pct: 25 },
  { label: 'Fair',       color: '#f59e0b', pct: 50 },
  { label: 'Good',       color: '#10b981', pct: 75 },
  { label: 'Strong',     color: '#10b981', pct:100 },
];

function getStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4); // 0–4
}

function updateStrengthMeter(pw) {
  const level = STRENGTH_LEVELS[getStrength(pw)];
  pwStrengthFill.style.width      = pw ? `${level.pct}%` : '0%';
  pwStrengthFill.style.background = level.color;
  pwStrengthLabel.textContent     = pw ? level.label : '';
  pwStrengthLabel.style.color     = level.color;
}

/* ================================================================
   TOGGLE PASSWORD VISIBILITY
   ================================================================ */
function attachTogglePw() {
  document.querySelectorAll('.toggle-pw-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.querySelector('.eye-open').style.display  = isHidden ? 'none' : '';
      btn.querySelector('.eye-closed').style.display= isHidden ? ''     : 'none';
      btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    });
  });
}

/* ================================================================
   SIGN IN
   ================================================================ */
function validateSignIn() {
  let valid = true;

  const username = signinUsername.value.trim();
  const password = signinPassword.value;

  if (!username) {
    setError(signinUsername, 'Username is required.');
    valid = false;
  } else {
    setValid(signinUsername);
  }

  if (!password) {
    setError(signinPassword, 'Password is required.');
    valid = false;
  } else {
    setValid(signinPassword);
  }

  return valid;
}

function handleSignIn(e) {
  e.preventDefault();
  if (!validateSignIn()) return;

  const username = signinUsername.value.trim();
  const password = signinPassword.value;

  // Simulate async (UX: brief spinner)
  setLoading(signinBtn, true);

  setTimeout(() => {
    setLoading(signinBtn, false);

    const user = findUser(username);
    if (!user) {
      setError(signinUsername, 'No account found with this username.');
      signinUsername.classList.add('shake');
      signinUsername.addEventListener('animationend', () => signinUsername.classList.remove('shake'), { once: true });
      showToast('Username not found.', 'error');
      return;
    }

    if (user.passwordHash !== hashPassword(password)) {
      setError(signinPassword, 'Incorrect password. Try again.');
      signinPassword.classList.add('shake');
      signinPassword.addEventListener('animationend', () => signinPassword.classList.remove('shake'), { once: true });
      signinPassword.value = '';
      signinPassword.focus();
      showToast('Incorrect password.', 'error');
      return;
    }

    // Save "remember me" preference
    if (rememberMe.checked) {
      localStorage.setItem(REMEMBER_KEY, username);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    createSession(user);
    showToast(`Welcome back, ${user.name}! 🎉`, 'success', 1500);
    setTimeout(redirectToApp, 1200);
  }, 700);
}

/* ================================================================
   SIGN UP
   ================================================================ */
function validateSignUp() {
  let valid = true;

  const name     = signupName.value.trim();
  const username = signupUsername.value.trim();
  const password = signupPassword.value;
  const confirm  = signupConfirm.value;

  // Name
  if (!name) {
    setError(signupName, 'Full name is required.'); valid = false;
  } else if (name.length < 2) {
    setError(signupName, 'Name must be at least 2 characters.'); valid = false;
  } else {
    setValid(signupName);
  }

  // Username
  if (!username) {
    setError(signupUsername, 'Username is required.'); valid = false;
  } else if (username.length < 3) {
    setError(signupUsername, 'Username must be at least 3 characters.'); valid = false;
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    setError(signupUsername, 'Only letters, numbers, and underscores allowed.'); valid = false;
  } else if (findUser(username)) {
    setError(signupUsername, 'This username is already taken.'); valid = false;
  } else {
    setValid(signupUsername);
  }

  // Password
  if (!password) {
    setError(signupPassword, 'Password is required.'); valid = false;
  } else if (password.length < 6) {
    setError(signupPassword, 'Password must be at least 6 characters.'); valid = false;
  } else {
    setValid(signupPassword);
  }

  // Confirm
  if (!confirm) {
    setError(signupConfirm, 'Please confirm your password.'); valid = false;
  } else if (confirm !== password) {
    setError(signupConfirm, 'Passwords do not match.'); valid = false;
  } else {
    setValid(signupConfirm);
  }

  // Terms
  if (!acceptTerms.checked) {
    showToast('Please accept the Terms of Service to continue.', 'warning');
    valid = false;
  }

  return valid;
}

function handleSignUp(e) {
  e.preventDefault();
  if (!validateSignUp()) return;

  setLoading(signupBtn, true);

  setTimeout(() => {
    setLoading(signupBtn, false);

    const newUser = {
      username:     signupUsername.value.trim(),
      name:         signupName.value.trim(),
      passwordHash: hashPassword(signupPassword.value),
    };

    const users = getUsers();
    users.push(newUser);
    saveUsers(users);

    createSession(newUser);
    showToast(`Account created! Welcome, ${newUser.name} 🚀`, 'success', 1500);
    setTimeout(redirectToApp, 1200);
  }, 800);
}

/* ================================================================
   LOADING STATE
   ================================================================ */
function setLoading(btn, isLoading) {
  const textEl    = btn.querySelector('.btn-auth-text');
  const spinnerEl = btn.querySelector('.btn-auth-spinner');
  const arrowEl   = btn.querySelector('.btn-auth-arrow');

  btn.disabled = isLoading;
  if (spinnerEl) spinnerEl.hidden = !isLoading;
  if (arrowEl)   arrowEl.style.display = isLoading ? 'none' : '';
  if (textEl) textEl.textContent = isLoading
    ? (btn.id === 'signin-btn' ? 'Signing in…' : 'Creating account…')
    : (btn.id === 'signin-btn' ? 'Sign In'      : 'Create Account');
}

/* ================================================================
   DEMO LOGIN
   ================================================================ */
function handleDemoLogin() {
  signinUsername.value = 'demo';
  signinPassword.value = 'demo1234';
  setValid(signinUsername);
  setValid(signinPassword);
  showToast('Demo credentials filled — click Sign In!', 'info');
  signinPassword.focus();
}

/* ================================================================
   FORGOT PASSWORD
   ================================================================ */
function handleForgotPassword() {
  const username = signinUsername.value.trim();
  if (!username) {
    showToast('Enter your username above first.', 'warning');
    signinUsername.focus();
    return;
  }
  const user = findUser(username);
  if (!user) {
    showToast('No account found with this username.', 'error');
    return;
  }
  showToast('Password reset is not available in this demo.', 'info', 4000);
}

/* ================================================================
   LIVE VALIDATION (on blur / input)
   ================================================================ */
function attachLiveValidation() {
  // Sign-in fields: validate on blur
  [signinUsername, signinPassword].forEach(input => {
    input.addEventListener('blur', () => {
      if (input.value.trim()) setValid(input);
      else clearField(input);
    });
    input.addEventListener('input', () => clearField(input));
  });

  // Sign-up fields: validate on blur
  signupName.addEventListener('blur', () => {
    if (!signupName.value.trim()) setError(signupName, 'Full name is required.');
    else if (signupName.value.trim().length < 2) setError(signupName, 'Name must be at least 2 characters.');
    else setValid(signupName);
  });

  signupUsername.addEventListener('blur', () => {
    const v = signupUsername.value.trim();
    if (!v) setError(signupUsername, 'Username is required.');
    else if (v.length < 3) setError(signupUsername, 'At least 3 characters required.');
    else if (!/^[a-zA-Z0-9_]+$/.test(v)) setError(signupUsername, 'Letters, numbers, underscores only.');
    else if (findUser(v)) setError(signupUsername, 'This username is already taken.');
    else setValid(signupUsername);
  });

  signupPassword.addEventListener('input', () => {
    updateStrengthMeter(signupPassword.value);
    clearField(signupPassword);
  });
  signupPassword.addEventListener('blur', () => {
    const v = signupPassword.value;
    if (!v) setError(signupPassword, 'Password is required.');
    else if (v.length < 6) setError(signupPassword, 'At least 6 characters required.');
    else setValid(signupPassword);
  });

  signupConfirm.addEventListener('blur', () => {
    const v = signupConfirm.value;
    if (!v) setError(signupConfirm, 'Please confirm your password.');
    else if (v !== signupPassword.value) setError(signupConfirm, 'Passwords do not match.');
    else setValid(signupConfirm);
  });
  signupConfirm.addEventListener('input', () => clearField(signupConfirm));
}

/* ================================================================
   KEYBOARD SHORTCUTS
   ================================================================ */
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'd') { e.preventDefault(); toggleTheme(); }
});

/* ================================================================
   INIT
   ================================================================ */
function init() {
  // Theme
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(savedTheme);

  // Pre-fill "remember me" username
  const rememberedUser = localStorage.getItem(REMEMBER_KEY);
  if (rememberedUser) {
    signinUsername.value = rememberedUser;
    rememberMe.checked = true;
  }

  // Ensure demo user exists
  const users = getUsers();
  saveUsers(users);

  // Tab switching
  tabSignin.addEventListener('click', () => switchTab('signin'));
  tabSignup.addEventListener('click', () => switchTab('signup'));

  // Forms
  signinForm.addEventListener('submit', handleSignIn);
  signupForm.addEventListener('submit', handleSignUp);

  // Extras
  demoLoginBtn.addEventListener('click', handleDemoLogin);
  forgotPwBtn.addEventListener('click', handleForgotPassword);
  themeToggleBtn.addEventListener('click', toggleTheme);

  // Password toggles
  attachTogglePw();

  // Live validation
  attachLiveValidation();

  // Enter key in sign-in password → submit
  signinPassword.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); signinForm.requestSubmit(); }
  });

  // Tab indicator init
  tabIndicator.classList.remove('signup');

  // If already logged in, redirect straight to app
  const session = sessionStorage.getItem(AUTH_SESSION_KEY) || localStorage.getItem(AUTH_SESSION_KEY);
  if (session) {
    try {
      const parsed = JSON.parse(session);
      if (parsed?.username) {
        redirectToApp();
        return;
      }
    } catch { /* ignore corrupt session */ }
  }

  // Focus first input
  signinUsername.focus();
}

document.addEventListener('DOMContentLoaded', init);

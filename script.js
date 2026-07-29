/**
 * TaskFlow — Modern To-Do App | script.js
 * =========================================
 * A feature-rich to-do list application with:
 *  - Full CRUD task management
 *  - Priority, category, due-date metadata
 *  - Live search & multi-filter
 *  - Sorting (newest/oldest/A-Z/Z-A/priority/due-date)
 *  - Drag-and-drop reordering
 *  - Dark / Light mode toggle
 *  - Local Storage persistence
 *  - Toast notifications
 *  - Edit/Delete confirmation modals
 *  - Progress bar & statistics
 *  - Keyboard shortcuts
 *  - Accessibility attributes
 */

'use strict';

/* ================================================================
   1. STATE & CONSTANTS
   ================================================================ */

/** @type {Task[]} In-memory task list */
let tasks = [];

/** Currently active filters / sort */
let state = {
  filter:   'all',    // 'all' | 'active' | 'completed'
  category: 'all',    // 'all' | 'Work' | 'Personal' | 'Study' | 'Shopping'
  search:   '',
  sort:     'newest', // 'newest' | 'oldest' | 'alpha-asc' | 'alpha-desc' | 'priority' | 'due-date'
  theme:    'dark',
};

/** ID being edited or pending deletion */
let editingId   = null;
let deletingId  = null;

const STORAGE_KEY   = 'taskflow_tasks_v2';
const THEME_KEY     = 'taskflow_theme_v1';
const AUTH_SESSION_KEY = 'taskflow_session_v1';

/** Priority order for sorting */
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

/** Category emoji map */
const CAT_EMOJI = {
  Work:     '💼',
  Personal: '🏠',
  Study:    '📚',
  Shopping: '🛒',
};

/* ================================================================
   2. DOM REFERENCES
   ================================================================ */

// Header / layout
const sidebar           = document.getElementById('sidebar');
const sidebarOverlay    = document.getElementById('sidebar-overlay');
const sidebarToggleBtn  = document.getElementById('sidebar-toggle-btn');
const sidebarCloseBtn   = document.getElementById('sidebar-close-btn');
const themeToggleBtn    = document.getElementById('theme-toggle-btn');
const themeIconDark     = document.getElementById('theme-icon-dark');
const themeIconLight    = document.getElementById('theme-icon-light');
const clearCompletedBtn = document.getElementById('clear-completed-btn');

// User menu
const userAvatarBtn      = document.getElementById('user-avatar-btn');
const userAvatarInitials = document.getElementById('user-avatar-initials');
const userDisplayName    = document.getElementById('user-display-name');
const userDropdown       = document.getElementById('user-dropdown');
const userDropdownName   = document.getElementById('user-dropdown-name');
const logoutBtn          = document.getElementById('logout-btn');

// Add-task form
const taskInput         = document.getElementById('task-input');
const addTaskBtn        = document.getElementById('add-task-btn');
const charCount         = document.getElementById('char-count');
const prioritySelect    = document.getElementById('priority-select');
const categorySelect    = document.getElementById('category-select');
const dueDateInput      = document.getElementById('due-date-input');

// Stats
const statsTotal        = document.getElementById('stats-total');
const statsActive       = document.getElementById('stats-active');
const statsCompleted    = document.getElementById('stats-completed');
const progressPct       = document.getElementById('progress-pct');
const progressBarFill   = document.getElementById('progress-bar-fill');
const progressBarWrap   = document.getElementById('progress-bar-wrap');
const footerTaskCount   = document.getElementById('footer-task-count');

// Controls
const searchInput       = document.getElementById('search-input');
const searchClearBtn    = document.getElementById('search-clear-btn');
const filterTabs        = document.querySelectorAll('.filter-tab');
const sortSelect        = document.getElementById('sort-select');

// Task lists
const activeTaskList    = document.getElementById('active-task-list');
const completedTaskList = document.getElementById('completed-task-list');
const activeTaskGroup   = document.getElementById('active-task-group');
const completedTaskGroup= document.getElementById('completed-task-group');
const activeGroupBadge  = document.getElementById('active-group-badge');
const completedGroupBadge = document.getElementById('completed-group-badge');

// Empty state
const emptyState        = document.getElementById('empty-state');
const emptyTitle        = document.getElementById('empty-title');
const emptyDesc         = document.getElementById('empty-desc');

// Category sidebar buttons
const categoryBtns      = document.querySelectorAll('.category-btn');

// Category counts
const catCountAll      = document.getElementById('cat-count-all');
const catCountWork     = document.getElementById('cat-count-work');
const catCountPersonal = document.getElementById('cat-count-personal');
const catCountStudy    = document.getElementById('cat-count-study');
const catCountShopping = document.getElementById('cat-count-shopping');

// Toast
const toastContainer    = document.getElementById('toast-container');

// Edit Modal
const editModalBackdrop = document.getElementById('edit-modal-backdrop');
const editTaskInput     = document.getElementById('edit-task-input');
const editPrioritySelect= document.getElementById('edit-priority-select');
const editCategorySelect= document.getElementById('edit-category-select');
const editDueDateInput  = document.getElementById('edit-due-date-input');
const editModalCloseBtn = document.getElementById('edit-modal-close-btn');
const editCancelBtn     = document.getElementById('edit-cancel-btn');
const editSaveBtn       = document.getElementById('edit-save-btn');

// Confirm Modal
const confirmModalBackdrop  = document.getElementById('confirm-modal-backdrop');
const confirmMessage        = document.getElementById('confirm-message');
const confirmCancelBtn      = document.getElementById('confirm-cancel-btn');
const confirmDeleteBtn      = document.getElementById('confirm-delete-btn');

/* ================================================================
   3. UTILITIES
   ================================================================ */

/**
 * Generate a unique ID for a task.
 * @returns {string}
 */
function generateId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Format a date string (YYYY-MM-DD) to a human-readable label.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date  = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff  = Math.round((date - today) / 86400000);

  if (diff < 0)  return `Overdue (${date.toLocaleDateString()})`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `Due ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

/**
 * Return the CSS class suffix for a date string based on urgency.
 * @param {string} dateStr
 * @returns {'overdue'|'due-soon'|''}
 */
function dateUrgency(dateStr) {
  if (!dateStr) return '';
  const date  = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff  = Math.round((date - today) / 86400000);
  if (diff < 0)  return 'overdue';
  if (diff <= 2) return 'due-soon';
  return '';
}

/**
 * Escape HTML to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* ================================================================
   4. LOCAL STORAGE
   ================================================================ */

/**
 * Persist the current tasks array to localStorage.
 */
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('TaskFlow: failed to save tasks', e);
  }
}

/**
 * Load tasks from localStorage into the tasks array.
 */
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : [];
    // Migrate: ensure all tasks have required fields
    tasks = tasks.map(t => ({
      id:        t.id        || generateId(),
      text:      t.text      || '',
      completed: t.completed || false,
      priority:  t.priority  || 'medium',
      category:  t.category  || 'Personal',
      dueDate:   t.dueDate   || '',
      createdAt: t.createdAt || Date.now(),
      order:     t.order     !== undefined ? t.order : 0,
    }));
  } catch (e) {
    console.error('TaskFlow: failed to load tasks', e);
    tasks = [];
  }
}

/* ================================================================
   5. THEME
   ================================================================ */

/**
 * Apply the given theme ('dark' | 'light') to the document.
 * @param {'dark'|'light'} theme
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  state.theme = theme;
  localStorage.setItem(THEME_KEY, theme);

  if (theme === 'dark') {
    themeIconDark.style.display  = 'block';
    themeIconLight.style.display = 'none';
    themeToggleBtn.setAttribute('aria-label', 'Switch to light mode');
  } else {
    themeIconDark.style.display  = 'none';
    themeIconLight.style.display = 'block';
    themeToggleBtn.setAttribute('aria-label', 'Switch to dark mode');
  }
}

/**
 * Toggle between dark and light themes.
 */
function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

/* ================================================================
   6. SIDEBAR
   ================================================================ */

/** Open the sidebar. */
function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('visible');
  sidebarOverlay.removeAttribute('aria-hidden');
  sidebar.setAttribute('aria-hidden', 'false');
  sidebarCloseBtn.focus();
}

/** Close the sidebar. */
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
  sidebarOverlay.setAttribute('aria-hidden', 'true');
  sidebar.setAttribute('aria-hidden', 'true');
  sidebarToggleBtn.focus();
}

/* ================================================================
   7. TOAST NOTIFICATIONS
   ================================================================ */

/**
 * Show a toast notification.
 * @param {string} message  - Message text
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration - Auto-dismiss ms (default 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  const icons = {
    success: '✅',
    error:   '❌',
    warning: '⚠️',
    info:    'ℹ️',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
  `;

  toastContainer.appendChild(toast);

  // Auto-dismiss
  const timer = setTimeout(() => dismissToast(toast), duration);

  // Click to dismiss early
  toast.addEventListener('click', () => {
    clearTimeout(timer);
    dismissToast(toast);
  });
}

/**
 * Animate and remove a toast element.
 * @param {HTMLElement} toast
 */
function dismissToast(toast) {
  toast.classList.add('hide');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
}

/* ================================================================
   8. STATISTICS & PROGRESS
   ================================================================ */

/**
 * Recount all stats and update the UI.
 */
function updateStats() {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const active    = total - completed;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Animate numbers
  animateNumber(statsTotal,     parseInt(statsTotal.textContent     || '0'), total);
  animateNumber(statsActive,    parseInt(statsActive.textContent    || '0'), active);
  animateNumber(statsCompleted, parseInt(statsCompleted.textContent || '0'), completed);

  progressPct.textContent = `${pct}%`;
  progressBarFill.style.width = `${pct}%`;
  progressBarWrap.setAttribute('aria-valuenow', pct);

  footerTaskCount.textContent = `${total} task${total !== 1 ? 's' : ''}`;

  // Category counts in sidebar
  const catCounts = { Work: 0, Personal: 0, Study: 0, Shopping: 0 };
  tasks.forEach(t => { if (catCounts[t.category] !== undefined) catCounts[t.category]++; });

  catCountAll.textContent      = total;
  catCountWork.textContent     = catCounts.Work;
  catCountPersonal.textContent = catCounts.Personal;
  catCountStudy.textContent    = catCounts.Study;
  catCountShopping.textContent = catCounts.Shopping;

  // Group badges
  activeGroupBadge.textContent    = active;
  completedGroupBadge.textContent = completed;
}

/**
 * Animate a stat number from `from` to `to`.
 * @param {HTMLElement} el
 * @param {number} from
 * @param {number} to
 */
function animateNumber(el, from, to) {
  if (from === to) return;
  el.classList.remove('bump');
  // Trigger reflow to restart animation
  void el.offsetWidth;
  el.textContent = to;
  el.classList.add('bump');
}

/* ================================================================
   9. FILTERING, SEARCHING & SORTING
   ================================================================ */

/**
 * Return the currently visible (filtered + searched + sorted) tasks.
 * @returns {Task[]}
 */
function getFilteredTasks() {
  let result = [...tasks];

  // Category filter (from sidebar)
  if (state.category !== 'all') {
    result = result.filter(t => t.category === state.category);
  }

  // Status filter
  if (state.filter === 'active') {
    result = result.filter(t => !t.completed);
  } else if (state.filter === 'completed') {
    result = result.filter(t => t.completed);
  }

  // Search
  if (state.search) {
    const q = state.search.toLowerCase();
    result = result.filter(t =>
      t.text.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.priority.toLowerCase().includes(q)
    );
  }

  // Sort
  result = sortTasks(result);

  return result;
}

/**
 * Sort an array of tasks by the current sort state.
 * @param {Task[]} arr
 * @returns {Task[]}
 */
function sortTasks(arr) {
  return [...arr].sort((a, b) => {
    switch (state.sort) {
      case 'newest':
        return b.createdAt - a.createdAt;
      case 'oldest':
        return a.createdAt - b.createdAt;
      case 'alpha-asc':
        return a.text.localeCompare(b.text);
      case 'alpha-desc':
        return b.text.localeCompare(a.text);
      case 'priority':
        return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
      case 'due-date': {
        // Tasks with no due date go last
        const da = a.dueDate ? new Date(a.dueDate) : Infinity;
        const db = b.dueDate ? new Date(b.dueDate) : Infinity;
        return da - db;
      }
      default:
        return a.order - b.order;
    }
  });
}

/* ================================================================
   10. TASK DOM CREATION
   ================================================================ */

/**
 * Create a task list-item DOM element.
 * @param {Task} task
 * @returns {HTMLLIElement}
 */
function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = [
    'task-item',
    task.completed ? 'completed' : '',
    `priority-${task.priority}`,
  ].filter(Boolean).join(' ');
  li.setAttribute('data-id', task.id);
  li.setAttribute('draggable', 'true');
  li.setAttribute('role', 'listitem');
  li.setAttribute('aria-label', `Task: ${task.text}, priority ${task.priority}, ${task.completed ? 'completed' : 'active'}`);

  // Urgency class for due date
  const urgency = dateUrgency(task.dueDate);

  li.innerHTML = `
    <!-- Drag handle -->
    <span class="drag-handle" aria-hidden="true" title="Drag to reorder">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/>
        <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
        <circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>
      </svg>
    </span>

    <!-- Checkbox -->
    <div class="task-checkbox-wrapper">
      <button
        class="task-checkbox ${task.completed ? 'checked' : ''}"
        data-id="${task.id}"
        aria-label="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}"
        aria-pressed="${task.completed}"
        title="${task.completed ? 'Undo' : 'Complete'}"
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="task-content">
      <span class="task-text">${escapeHtml(task.text)}</span>
      <div class="task-meta">
        <span class="priority-badge ${task.priority}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
        <span class="category-badge">${CAT_EMOJI[task.category] || ''} ${escapeHtml(task.category)}</span>
        ${task.dueDate ? `<span class="due-date-badge ${urgency}">📅 ${escapeHtml(formatDate(task.dueDate))}</span>` : ''}
      </div>
    </div>

    <!-- Actions -->
    <div class="task-actions" role="group" aria-label="Task actions">
      <button class="task-action-btn edit" data-id="${task.id}" aria-label="Edit task" title="Edit">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button class="task-action-btn delete" data-id="${task.id}" aria-label="Delete task" title="Delete">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    </div>
  `;

  // Attach drag events directly
  attachDragEvents(li, task.id);

  return li;
}

/* ================================================================
   11. RENDER
   ================================================================ */

/**
 * Re-render the task lists based on the current state.
 */
function renderTasks() {
  const filtered = getFilteredTasks();

  // Split into active / completed
  const activeTasks    = filtered.filter(t => !t.completed);
  const completedTasks = filtered.filter(t => t.completed);

  // Clear existing lists
  activeTaskList.innerHTML    = '';
  completedTaskList.innerHTML = '';

  // Render active tasks
  activeTasks.forEach(task => {
    activeTaskList.appendChild(createTaskElement(task));
  });

  // Render completed tasks
  completedTasks.forEach(task => {
    completedTaskList.appendChild(createTaskElement(task));
  });

  // Show / hide groups
  const showActive    = activeTasks.length > 0    && state.filter !== 'completed';
  const showCompleted = completedTasks.length > 0  && state.filter !== 'active';

  activeTaskGroup.style.display    = showActive    ? '' : 'none';
  completedTaskGroup.style.display = showCompleted ? '' : 'none';

  // Empty state
  const isEmpty = filtered.length === 0;
  emptyState.hidden = !isEmpty;

  if (isEmpty) {
    if (state.search) {
      emptyTitle.textContent = 'No results found';
      emptyDesc.textContent  = `No tasks match "${state.search}". Try a different search term.`;
    } else if (state.filter === 'completed') {
      emptyTitle.textContent = 'No completed tasks';
      emptyDesc.textContent  = `Complete some tasks to see them here. You've got this! 💪`;
    } else if (state.filter === 'active') {
      emptyTitle.textContent = 'All done! 🎉';
      emptyDesc.textContent  = 'No active tasks. Great job! Add new tasks to keep going.';
    } else {
      emptyTitle.textContent = 'No tasks yet!';
      emptyDesc.textContent  = 'Add your first task above to get started. 🚀';
    }
  }

  updateStats();
}

/* ================================================================
   12. ADD TASK
   ================================================================ */

/**
 * Add a new task from the input form.
 */
function addTask() {
  const text = taskInput.value.trim();

  // Prevent empty submission
  if (!text) {
    taskInput.classList.add('shake');
    taskInput.addEventListener('animationend', () => taskInput.classList.remove('shake'), { once: true });
    showToast('Task description cannot be empty.', 'warning');
    taskInput.focus();
    return;
  }

  // Prevent duplicates (case-insensitive)
  const duplicate = tasks.find(t => t.text.toLowerCase() === text.toLowerCase());
  if (duplicate) {
    showToast('A task with this name already exists.', 'warning');
    taskInput.focus();
    return;
  }

  /** @type {Task} */
  const task = {
    id:        generateId(),
    text,
    completed: false,
    priority:  prioritySelect.value,
    category:  categorySelect.value,
    dueDate:   dueDateInput.value,
    createdAt: Date.now(),
    order:     tasks.length,
  };

  tasks.unshift(task); // Add at the beginning (newest first by default)
  saveTasks();
  renderTasks();

  // Reset form
  taskInput.value   = '';
  dueDateInput.value = '';
  updateCharCount();
  taskInput.focus();

  showToast('Task added successfully!', 'success');
}

/* ================================================================
   13. DELETE TASK
   ================================================================ */

/**
 * Show a confirmation modal before deleting a task.
 * @param {string} id
 */
function confirmDeleteTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  deletingId = id;
  confirmMessage.textContent = `Delete "${task.text}"? This action cannot be undone.`;
  openModal(confirmModalBackdrop);
}

/**
 * Actually delete the task after confirmation.
 */
function deleteTask() {
  if (!deletingId) return;

  const id      = deletingId;
  const taskEl  = document.querySelector(`[data-id="${id}"]`);
  const taskIdx = tasks.findIndex(t => t.id === id);
  const taskName = tasks[taskIdx]?.text || 'Task';

  // Animate out
  if (taskEl && taskEl.classList.contains('task-item')) {
    taskEl.classList.add('removing');
    taskEl.addEventListener('animationend', () => {
      tasks.splice(taskIdx, 1);
      saveTasks();
      renderTasks();
    }, { once: true });
  } else {
    tasks.splice(taskIdx, 1);
    saveTasks();
    renderTasks();
  }

  closeModal(confirmModalBackdrop);
  deletingId = null;
  showToast(`"${taskName}" deleted.`, 'error');
}

/* ================================================================
   14. TOGGLE COMPLETE
   ================================================================ */

/**
 * Toggle the completed state of a task.
 * @param {string} id
 */
function toggleComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  saveTasks();
  renderTasks();

  showToast(
    task.completed ? `"${task.text}" completed! 🎉` : `"${task.text}" marked active.`,
    task.completed ? 'success' : 'info'
  );
}

/* ================================================================
   15. EDIT TASK
   ================================================================ */

/**
 * Open the edit modal pre-filled with a task's current data.
 * @param {string} id
 */
function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editingId = id;
  editTaskInput.value      = task.text;
  editPrioritySelect.value = task.priority;
  editCategorySelect.value = task.category;
  editDueDateInput.value   = task.dueDate;

  openModal(editModalBackdrop);
  editTaskInput.focus();
  editTaskInput.select();
}

/**
 * Save edits from the edit modal back to the task.
 */
function saveEditTask() {
  if (!editingId) return;

  const text = editTaskInput.value.trim();
  if (!text) {
    showToast('Task description cannot be empty.', 'warning');
    editTaskInput.focus();
    return;
  }

  // Duplicate check (excluding the current task)
  const dup = tasks.find(t => t.id !== editingId && t.text.toLowerCase() === text.toLowerCase());
  if (dup) {
    showToast('Another task with this name already exists.', 'warning');
    return;
  }

  const task      = tasks.find(t => t.id === editingId);
  task.text       = text;
  task.priority   = editPrioritySelect.value;
  task.category   = editCategorySelect.value;
  task.dueDate    = editDueDateInput.value;

  saveTasks();
  renderTasks();
  closeModal(editModalBackdrop);
  editingId = null;
  showToast('Task updated.', 'info');
}

/* ================================================================
   16. CLEAR COMPLETED
   ================================================================ */

/**
 * Remove all completed tasks.
 */
function clearCompleted() {
  const count = tasks.filter(t => t.completed).length;
  if (count === 0) {
    showToast('No completed tasks to clear.', 'warning');
    return;
  }
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  renderTasks();
  showToast(`${count} completed task${count > 1 ? 's' : ''} cleared.`, 'success');
}

/* ================================================================
   17. MODALS
   ================================================================ */

/**
 * Open a modal backdrop.
 * @param {HTMLElement} backdrop
 */
function openModal(backdrop) {
  backdrop.classList.add('open');
  backdrop.removeAttribute('aria-hidden');
  document.body.style.overflow = 'hidden';
}

/**
 * Close a modal backdrop.
 * @param {HTMLElement} backdrop
 */
function closeModal(backdrop) {
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ================================================================
   18. CHAR COUNT
   ================================================================ */

/**
 * Update the character counter for the add-task input.
 */
function updateCharCount() {
  const len = taskInput.value.length;
  charCount.textContent = `${len}/200`;
  charCount.classList.toggle('near-limit', len >= 160 && len < 200);
  charCount.classList.toggle('at-limit', len >= 200);
}

/* ================================================================
   19. DRAG AND DROP
   ================================================================ */

let dragSourceId = null;

/**
 * Attach drag-and-drop event listeners to a task element.
 * @param {HTMLLIElement} li
 * @param {string} id
 */
function attachDragEvents(li, id) {
  li.addEventListener('dragstart', e => {
    dragSourceId = id;
    li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  });

  li.addEventListener('dragend', () => {
    dragSourceId = null;
    li.classList.remove('dragging');
    // Remove all drag-over classes
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  });

  li.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragSourceId) li.classList.add('drag-over');
  });

  li.addEventListener('dragleave', () => {
    li.classList.remove('drag-over');
  });

  li.addEventListener('drop', e => {
    e.preventDefault();
    li.classList.remove('drag-over');
    if (!dragSourceId || dragSourceId === id) return;

    // Swap positions in array
    const srcIdx  = tasks.findIndex(t => t.id === dragSourceId);
    const destIdx = tasks.findIndex(t => t.id === id);
    if (srcIdx === -1 || destIdx === -1) return;

    const [moved] = tasks.splice(srcIdx, 1);
    tasks.splice(destIdx, 0, moved);

    // Update order values
    tasks.forEach((t, i) => { t.order = i; });

    saveTasks();
    renderTasks();
  });
}

/* ================================================================
   20. EVENT DELEGATION — TASK LISTS
   ================================================================ */

/**
 * Handle clicks on task list items via event delegation.
 * @param {MouseEvent} e
 */
function handleTaskListClick(e) {
  const checkBtn  = e.target.closest('.task-checkbox');
  const editBtn   = e.target.closest('.task-action-btn.edit');
  const deleteBtn = e.target.closest('.task-action-btn.delete');

  if (checkBtn) {
    const id = checkBtn.getAttribute('data-id');
    toggleComplete(id);
    return;
  }
  if (editBtn) {
    const id = editBtn.getAttribute('data-id');
    openEditModal(id);
    return;
  }
  if (deleteBtn) {
    const id = deleteBtn.getAttribute('data-id');
    confirmDeleteTask(id);
    return;
  }
}

/* ================================================================
   21. SEARCH & FILTER HELPERS
   ================================================================ */

/**
 * Update the active filter tab visually.
 * @param {string} filter
 */
function setFilterTab(filter) {
  state.filter = filter;
  filterTabs.forEach(tab => {
    const isActive = tab.getAttribute('data-filter') === filter;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive);
  });
  renderTasks();
}

/**
 * Update the active category in the sidebar visually.
 * @param {string} category
 */
function setCategoryFilter(category) {
  state.category = category;
  categoryBtns.forEach(btn => {
    const isActive = btn.getAttribute('data-category') === category;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive);
  });
  renderTasks();
}

/* ================================================================
   22. KEYBOARD SHORTCUTS
   ================================================================ */

/**
 * Global keyboard shortcut handler.
 * @param {KeyboardEvent} e
 */
function handleKeyboardShortcuts(e) {
  const focused = document.activeElement;
  const inInput = focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA' || focused.tagName === 'SELECT');

  // Ctrl+/ → Focus search
  if (e.ctrlKey && e.key === '/') {
    e.preventDefault();
    searchInput.focus();
    return;
  }

  // Ctrl+D → Toggle theme
  if (e.ctrlKey && e.key === 'd') {
    e.preventDefault();
    toggleTheme();
    return;
  }

  // Esc → Close modals / sidebar
  if (e.key === 'Escape') {
    if (editModalBackdrop.classList.contains('open')) {
      closeModal(editModalBackdrop);
      editingId = null;
    } else if (confirmModalBackdrop.classList.contains('open')) {
      closeModal(confirmModalBackdrop);
      deletingId = null;
    } else if (sidebar.classList.contains('open')) {
      closeSidebar();
    }
    return;
  }

  // Enter → Add task (if focused in task input)
  if (e.key === 'Enter' && focused === taskInput) {
    e.preventDefault();
    addTask();
    return;
  }

  // Enter → Save edit (if focused in edit modal input)
  if (e.key === 'Enter' && focused === editTaskInput) {
    e.preventDefault();
    saveEditTask();
    return;
  }

  // Alt+S → Toggle sidebar
  if (e.altKey && e.key === 's') {
    e.preventDefault();
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  }
}

/* ================================================================
   23. INIT — WIRE UP ALL EVENT LISTENERS
   ================================================================ */

function init() {
  /* ── Load persisted data ── */
  loadTasks();
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(savedTheme);

  /* ── Initial render ── */
  renderTasks();

  /* ── Header ── */
  sidebarToggleBtn.addEventListener('click', openSidebar);
  sidebarCloseBtn.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);
  themeToggleBtn.addEventListener('click', toggleTheme);
  clearCompletedBtn.addEventListener('click', clearCompleted);

  /* ── Sidebar category buttons ── */
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setCategoryFilter(btn.getAttribute('data-category'));
      // Auto-close sidebar on mobile
      if (window.innerWidth < 768) closeSidebar();
    });
  });

  /* ── Add Task ── */
  addTaskBtn.addEventListener('click', addTask);
  taskInput.addEventListener('input', updateCharCount);
  // Enter key handled in global keyboard shortcut handler

  /* ── Task List — Event Delegation ── */
  activeTaskList.addEventListener('click', handleTaskListClick);
  completedTaskList.addEventListener('click', handleTaskListClick);

  /* ── Search ── */
  searchInput.addEventListener('input', e => {
    state.search = e.target.value.trim();
    searchClearBtn.style.display = state.search ? 'flex' : 'none';
    renderTasks();
  });
  searchClearBtn.addEventListener('click', () => {
    searchInput.value  = '';
    state.search       = '';
    searchClearBtn.style.display = 'none';
    renderTasks();
    searchInput.focus();
  });

  /* ── Filter Tabs ── */
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => setFilterTab(tab.getAttribute('data-filter')));
  });

  /* ── Sort ── */
  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    renderTasks();
  });

  /* ── Edit Modal ── */
  editModalCloseBtn.addEventListener('click', () => {
    closeModal(editModalBackdrop);
    editingId = null;
  });
  editCancelBtn.addEventListener('click', () => {
    closeModal(editModalBackdrop);
    editingId = null;
  });
  editSaveBtn.addEventListener('click', saveEditTask);

  // Close modal on backdrop click
  editModalBackdrop.addEventListener('click', e => {
    if (e.target === editModalBackdrop) {
      closeModal(editModalBackdrop);
      editingId = null;
    }
  });

  /* ── Confirm Delete Modal ── */
  confirmCancelBtn.addEventListener('click', () => {
    closeModal(confirmModalBackdrop);
    deletingId = null;
  });
  confirmDeleteBtn.addEventListener('click', deleteTask);

  confirmModalBackdrop.addEventListener('click', e => {
    if (e.target === confirmModalBackdrop) {
      closeModal(confirmModalBackdrop);
      deletingId = null;
    }
  });

  /* ── Keyboard Shortcuts ── */
  document.addEventListener('keydown', handleKeyboardShortcuts);

  /* ── Accessibility: Trap focus in modals ── */
  [editModalBackdrop, confirmModalBackdrop].forEach(modal => {
    modal.addEventListener('keydown', e => {
      if (e.key !== 'Tab' || !modal.classList.contains('open')) return;
      const focusable = modal.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  });

  /* ── Char count init ── */
  updateCharCount();

  /* ── Set default min date for due date inputs ── */
  const today = new Date().toISOString().split('T')[0];
  dueDateInput.setAttribute('min', today);
  editDueDateInput.setAttribute('min', today);

  /* ── Auth UI ── */
  initAuthUI();
}

/* ── Kick off ── */
document.addEventListener('DOMContentLoaded', init);

/* ================================================================
   AUTH UI — session banner, avatar, logout
   ================================================================ */

/**
 * Read the current session and populate the user avatar / name.
 * Wire up the dropdown and logout button.
 */
function initAuthUI() {
  // Read session from sessionStorage first, then localStorage (Remember Me)
  let session = null;
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY) || localStorage.getItem(AUTH_SESSION_KEY);
    if (raw) session = JSON.parse(raw);
  } catch { /* ignore */ }

  if (!session) return; // Auth guard in HTML already handles redirect

  const name     = session.name || session.username || 'User';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // Populate avatar
  userAvatarInitials.textContent = initials;
  userDisplayName.textContent    = name.split(' ')[0]; // first name only
  userDropdownName.textContent   = name;

  // Toggle dropdown
  userAvatarBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = userDropdown.classList.contains('open');
    userDropdown.classList.toggle('open', !isOpen);
    userAvatarBtn.setAttribute('aria-expanded', String(!isOpen));
    userDropdown.setAttribute('aria-hidden', String(isOpen));
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', e => {
    if (!userAvatarBtn.contains(e.target) && !userDropdown.contains(e.target)) {
      userDropdown.classList.remove('open');
      userAvatarBtn.setAttribute('aria-expanded', 'false');
      userDropdown.setAttribute('aria-hidden', 'true');
    }
  });

  // Logout
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
    showToast(`Signed out. See you soon, ${name.split(' ')[0]}!`, 'info', 1800);
    setTimeout(() => { window.location.replace('login.html'); }, 1500);
  });

  // Keyboard: close dropdown on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && userDropdown.classList.contains('open')) {
      userDropdown.classList.remove('open');
      userAvatarBtn.setAttribute('aria-expanded', 'false');
      userAvatarBtn.focus();
    }
  });
}

# 🗂️ TaskFlow — Modern To-Do List App

A feature-rich, beautifully designed **To-Do List application** built entirely with **HTML, CSS, and Vanilla JavaScript** — zero dependencies, zero frameworks.

---

## ✨ Features

### 🎨 UI & Design
- **Glassmorphism dark/light theme** with gradient backgrounds
- **Fully responsive** — desktop, tablet, and mobile
- **Smooth animations** — slide-in/fade-in tasks, toast pop-ins, progress bars
- **Premium typography** using Inter & Outfit from Google Fonts
- Rounded cards with backdrop-filter blur effects

### ✅ Task Management
- Add tasks via button click or **Enter** key
- Edit tasks in-place with an edit modal
- Delete tasks with a confirmation modal
- Toggle complete/incomplete with animated checkbox
- Prevent duplicate tasks (case-insensitive)
- Prevent empty task submission (with shake animation)

### 🏷️ Task Metadata
- **Priority levels** — High / Medium / Low (color-coded badges + left border accent)
- **Categories** — Work / Personal / Study / Shopping
- **Due dates** — with overdue/due-soon color-coded alerts

### 🔍 Search, Filter & Sort
- **Live search** across task text, category, and priority
- **Status filters** — All / Active / Completed
- **Category sidebar** — filter by category
- **Sort options** — Newest, Oldest, A-Z, Z-A, Priority, Due Date

### 📊 Statistics
- Total / Active / Completed task counts (animated numbers)
- **Progress bar** showing percentage of completed tasks
- Category-level counts in the sidebar

### 💾 Persistence
- All tasks saved to **localStorage** and auto-reloaded on refresh
- Theme preference also persisted

### 🤖 User Experience
- **Toast notifications** for every action
- **Empty state** illustration with contextual messages
- **Delete confirmation** modal
- **Clear completed** button for bulk-delete
- **Drag and drop** to reorder tasks
- **Animated entrance** for every new task

### ⌨️ Keyboard Shortcuts
| Shortcut | Action |
|---|---|
| Enter | Add task (when input is focused) |
| Ctrl + / | Focus the search bar |
| Ctrl + D | Toggle dark / light mode |
| Esc | Close modals / sidebar |
| Alt + S | Toggle sidebar |

---

## 📁 Folder Structure

```
todo-app/
│
├── index.html          ← Semantic HTML5 structure
├── style.css           ← All styles (CSS variables, layout, animations)
├── script.js           ← All logic (pure Vanilla JS)
│
├── assets/
│   ├── empty-state.png ← Empty state illustration
│   └── icons/          ← Reserved for custom SVG icons
│
└── README.md           ← This file
```

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Semantic structure with ARIA roles |
| CSS3 | Variables, Flexbox, Grid, backdrop-filter, animations |
| Vanilla JavaScript | DOM manipulation, Local Storage, Drag & Drop API |
| Google Fonts | Inter + Outfit typefaces |

---

## 🏗️ JavaScript DOM API Usage

```javascript
// Selection
document.querySelector()
document.querySelectorAll()
document.getElementById()

// Creation & Insertion
document.createElement()
appendChild()
removeChild()
innerHTML / textContent

// Class Manipulation
classList.add() / classList.remove() / classList.toggle()

// Attributes
setAttribute() / getAttribute()

// Events
addEventListener()          // on every interactive element
Event Delegation            // handleTaskListClick()
Keyboard Events             // handleKeyboardShortcuts()

// Storage
localStorage.setItem() / localStorage.getItem()

// Drag & Drop API
dragstart / dragend / dragover / dragleave / drop
```

---

## 🚀 How to Run Locally

No build step required — open directly in any browser.

**Option 1 — Open directly:**
```
Double-click index.html to open in your browser
```

**Option 2 — Local dev server:**
```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .

# Using VS Code
Install "Live Server" → Right-click index.html → Open with Live Server
```

---

## 📋 Modular Functions Reference

| Function | Description |
|---|---|
| addTask() | Validate and add a new task |
| deleteTask() | Remove a task after confirmation |
| confirmDeleteTask(id) | Show delete confirmation modal |
| openEditModal(id) | Open edit modal pre-filled with task data |
| saveEditTask() | Persist edits from the edit modal |
| toggleComplete(id) | Toggle a task's completed status |
| renderTasks() | Re-render both task lists from state |
| saveTasks() | Persist tasks array to localStorage |
| loadTasks() | Load and migrate tasks from localStorage |
| getFilteredTasks() | Apply all active filters and sort |
| sortTasks(arr) | Sort array by current sort state |
| updateStats() | Recompute and animate all stat counters |
| showToast(msg, type) | Display a dismissible toast notification |
| applyTheme(theme) | Apply dark/light theme |
| attachDragEvents(li, id) | Wire up drag-and-drop on a task element |



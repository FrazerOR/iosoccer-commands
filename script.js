// === CONFIG ===
const SHEETS = [
  {
    key: 'iosoccer',
    name: 'IOSoccer Commands',
    url: 'sheets/IOSoccer Commands.html',
    cheatToggle: true
  },
  {
    key: 'hidden',
    name: "Hidden CVAR's",
    url: "sheets/Hidden CVAR's.html",
    cheatToggle: false
  },
  {
    key: 'sourcemod',
    name: 'SourceMod Commands',
    url: 'sheets/SourceMod Commands.html',
    cheatToggle: false
  }
];

const FAV_KEY = 'iosoccer_favourites';
const THEME_KEY = 'iosoccer_theme';

// === STATE ===
let sheetData = {}; // { key: [ {command, description, ...}, ... ] }
let currentTab = 'iosoccer';
let searchTerm = '';
let showCheats = true;
let favourites = [];
let theme = 'light';

// === UTILS ===
function saveFavourites() {
  localStorage.setItem(FAV_KEY, JSON.stringify(favourites));
}
function loadFavourites() {
  try {
    favourites = JSON.parse(localStorage.getItem(FAV_KEY)) || [];
  } catch {
    favourites = [];
  }
}
function saveTheme() {
  localStorage.setItem(THEME_KEY, theme);
}
function loadTheme() {
  theme = localStorage.getItem(THEME_KEY) || 'light';
  document.body.className = theme;
  document.getElementById('theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}

// === FETCH & PARSE SHEETS ===
async function fetchAndParseSheets() {
  for (const sheet of SHEETS) {
    const res = await fetch(sheet.url);
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) continue;
    const rows = Array.from(table.querySelectorAll('tr'));
    // Assume first row is header
    const data = [];
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      if (cells.length < 2) continue;
      data.push({
        command: cells[0].textContent.trim(),
        description: cells[1].textContent.trim(),
        raw: rows[i].innerHTML // for future use if needed
      });
    }
    sheetData[sheet.key] = data;
  }
}

// === RENDERING ===
function render() {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === currentTab);
  });

  // Show/hide cheat toggle
  document.getElementById('cheat-toggle-label').style.display =
    currentTab === 'iosoccer' ? '' : 'none';

  // Main content
  let data = [];
  if (currentTab === 'favourites') {
    data = [];
    for (const key of Object.keys(sheetData)) {
      data = data.concat(
        sheetData[key].filter(cmd => favourites.includes(favKey(key, cmd.command)))
          .map(cmd => ({ ...cmd, sheet: key }))
      );
    }
  } else {
    data = sheetData[currentTab] || [];
    if (currentTab === 'iosoccer' && !showCheats) {
      data = data.filter(cmd => !cmd.description.includes('[CHEATS REQUIRED]'));
    }
  }

  // Search
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    data = data.filter(cmd =>
      cmd.command.toLowerCase().includes(term) ||
      cmd.description.toLowerCase().includes(term)
    );
  }

  // Render table
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <th>⭐</th>
    <th>Command</th>
    <th>Description</th>
    ${currentTab === 'favourites' ? '<th>Sheet</th>' : ''}
  `;
  thead.appendChild(tr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const cmd of data) {
    const key = currentTab === 'favourites' ? cmd.sheet : currentTab;
    const fav = favourites.includes(favKey(key, cmd.command));
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="star-cell" style="text-align:center;cursor:pointer;" data-cmd="${cmd.command}" data-sheet="${key}">
        <span class="star" title="Toggle favourite">${fav ? '⭐' : '☆'}</span>
      </td>
      <td>${escapeHTML(cmd.command)}</td>
      <td>${escapeHTML(cmd.description)}</td>
      ${currentTab === 'favourites' ? `<td>${sheetName(key)}</td>` : ''}
    `;
    tbody.appendChild(row);
  }
  table.appendChild(tbody);

  const content = document.getElementById('tab-content');
  content.innerHTML = '';
  content.appendChild(table);

  // Add star click listeners
  document.querySelectorAll('.star-cell').forEach(cell => {
    cell.onclick = function () {
      const cmd = this.dataset.cmd;
      const sheet = this.dataset.sheet;
      const key = favKey(sheet, cmd);
      if (favourites.includes(key)) {
        favourites = favourites.filter(f => f !== key);
      } else {
        favourites.push(key);
      }
      saveFavourites();
      render();
    };
  });
}

function favKey(sheet, cmd) {
  return `${sheet}::${cmd}`;
}
function sheetName(key) {
  const sheet = SHEETS.find(s => s.key === key);
  return sheet ? sheet.name : key;
}
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}

// === EVENT HANDLERS ===
function setupEventHandlers() {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      currentTab = btn.dataset.tab;
      render();
    };
  });

  // Search
  document.getElementById('search').oninput = function () {
    searchTerm = this.value;
    render();
  };

  // Cheat toggle
  document.getElementById('cheat-toggle').onchange = function () {
    showCheats = this.checked;
    render();
  };

  // Theme toggle
  document.getElementById('theme-toggle').onclick = function () {
    theme = theme === 'light' ? 'dark' : 'light';
    document.body.className = theme;
    this.textContent = theme === 'dark' ? '☀️' : '🌙';
    saveTheme();
  };
}

// === INIT ===
async function init() {
  loadFavourites();
  loadTheme();
  setupEventHandlers();
  await fetchAndParseSheets();
  render();
}

init();

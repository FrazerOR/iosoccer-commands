const CSV_FILES = {
  iosoccer: "IOSoccer Commands.csv",
  sourcemod: "SourceMod Commands.csv",
  hidden: "Hidden CVAR's.csv"
};

const TABLE_CONFIG = {
  iosoccer: {
    columns: ["cmd", "default value/ args", "description"],
    headers: ["Command", "Args", "Description"]
  },
  sourcemod: {
    columns: ["cmd", "default value / args", "description"],
    headers: ["Command", "Args", "Description"]
  },
  hidden: {
    columns: ["cmd", "default value", "description"],
    headers: ["Command", "Args", "Description"]
  }
};

let tablesData = { iosoccer: [], sourcemod: [], hidden: [] };
let favourites = [];
let showCheats = true;
let currentTab = "iosoccer";
let searchQuery = "";

const tabInfo = document.getElementById('tab-info');

const infoTexts = {
  iosoccer:
    'A full dump of the IOSoccer Commands and ConVars. Args just shows the default value, use the description for "help" with commands. Find a spreadsheet version <a href="https://docs.google.com/spreadsheets/d/1l8wSx-Njumaaf2cANuWZriGbsqdBqXzK/edit?usp=sharing&ouid=102286865328456157772&rtpof=true&sd=true" target="_blank" rel="noopener noreferrer">here</a>',
  sourcemod:
    'All Commands and ConVars included by default with <a href="https://www.sourcemod.net/downloads.php" target="_blank" rel="noopener noreferrer">SourceMod</a>. Official Servers disable some of these.',
  hidden:
    `A full dump of the hidden IOSoccer Commands and ConVars. These would normally be disabled but you can use <a href="https://drive.google.com/file/d/1ZnYsAns0tXt0IGGBbW1mVnl7TPSTz_3g/view" target="_blank" rel="noopener noreferrer">this plugin</a> with <a href="https://www.sourcemod.net/downloads.php" target="_blank" rel="noopener noreferrer">SourceMod</a> to enable them.`,
  favourites: ""
};

function updateTabInfo(tab) {
  if (tab === 'favourites') {
    tabInfo.style.display = 'none';
    tabInfo.innerHTML = '';
  } else {
    tabInfo.style.display = 'block';
    tabInfo.innerHTML = infoTexts[tab] || '';
  }
}

function setVh() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('resize', setVh);
window.addEventListener('load', setVh);
setVh();

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = [];
    let inQuotes = false;
    let value = "";

    for (const char of line) {
      if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === ',' && !inQuotes) {
        values.push(value);
        value = "";
      } else {
        value += char;
      }
    }
    values.push(value);

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (values[idx] || "").trim();
    });

    return obj;
  });
}

function saveToLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadFromLS(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function renderTable(tab, data) {
  const { columns, headers } = TABLE_CONFIG[tab];

  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper";

  const table = document.createElement("table");
  table.className = "command-table";

  const thead = document.createElement("thead");
  const trHead = document.createElement("tr");
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  data.forEach(row => {
    const tr = document.createElement("tr");

    columns.forEach((col, idx) => {
      const td = document.createElement("td");

      if (idx === 0) {
        const starBtn = document.createElement("button");
        starBtn.className = "star-btn" + (isFavourited(tab, row) ? " fav" : "");
        starBtn.innerHTML = isFavourited(tab, row) ? "★" : "☆";
        starBtn.title = isFavourited(tab, row) ? "Unstar" : "Star";
        starBtn.onclick = e => {
          e.stopPropagation();
          toggleFavourite(tab, row);
          renderAll();
        };

        td.appendChild(starBtn);
        td.appendChild(document.createTextNode(" " + (row[col] || "")));
      } else {
        td.textContent = row[col] || "";
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrapper.appendChild(table);

  return wrapper;
}

function renderAll() {
  const iosoccerSection = document.getElementById("tab-iosoccer");
  let iosoccerData = tablesData.iosoccer;

  if (!showCheats) {
    iosoccerData = iosoccerData.filter(row => !/\[CHEATS REQUIRED\]|sv_cheats/i.test(row.description));
  }

  iosoccerData = filterData(iosoccerData, searchQuery);
  iosoccerSection.innerHTML = "";
  iosoccerSection.appendChild(renderTable("iosoccer", iosoccerData));

  const sourcemodSection = document.getElementById("tab-sourcemod");
  const sourcemodData = filterData(tablesData.sourcemod, searchQuery);
  sourcemodSection.innerHTML = "";
  sourcemodSection.appendChild(renderTable("sourcemod", sourcemodData));

  const hiddenSection = document.getElementById("tab-hidden");
  const hiddenData = filterData(tablesData.hidden, searchQuery);
  hiddenSection.innerHTML = "";
  hiddenSection.appendChild(renderTable("hidden", hiddenData));

  const favSection = document.getElementById("tab-favourites");
  favSection.innerHTML = "";
  const favs = getAllFavourites();

favSection.innerHTML = "";
favSection.appendChild(renderFavouritesTable(favs));
}

function renderFavouritesTable(favs) {
  const columns = ["tab", "cmd", "args", "description"];
  const headers = ["Tab", "Command", "Args", "Description"];

  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper";

  const table = document.createElement("table");
  table.className = "command-table";

  const thead = document.createElement("thead");
  const trHead = document.createElement("tr");
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  if (favs.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = headers.length;
    td.style.textAlign = "center";
    td.style.opacity = "0.7";
    td.textContent = "No starred commands yet.";
    tr.appendChild(td);
    tbody.appendChild(tr);
  } 
  else {
    favs.forEach(fav => {
      const tr = document.createElement("tr");

      const tdTab = document.createElement("td");
      tdTab.textContent = tabLabel(fav.tab);
      tr.appendChild(tdTab);

      const tdCmd = document.createElement("td");
      const starBtn = document.createElement("button");
      starBtn.className = "star-btn fav";
      starBtn.innerHTML = "★";
      starBtn.title = "Unstar";
      starBtn.onclick = e => {
        e.stopPropagation();
        toggleFavourite(fav.tab, fav.row);
        renderAll();
      };
      tdCmd.appendChild(starBtn);
      tdCmd.appendChild(document.createTextNode(" " + (fav.row.cmd || "")));
      tr.appendChild(tdCmd);

      const argsKey =
        fav.tab === "iosoccer" ? "default value/ args" :
        fav.tab === "sourcemod" ? "default value / args" :
        fav.tab === "hidden" ? "default value" : "";

      const tdArgs = document.createElement("td");
      tdArgs.textContent = fav.row[argsKey] || "";
      tr.appendChild(tdArgs);

      const tdDesc = document.createElement("td");
      tdDesc.textContent = fav.row.description || "";
      tr.appendChild(tdDesc);

      tbody.appendChild(tr);
    });
  }

  table.appendChild(tbody);
  wrapper.appendChild(table);

  return wrapper;
}

function getAllFavourites() {
  return favourites.map(fav => ({
    tab: fav.tab,
    row: fav.row
  }));
}

function isFavourited(tab, row) {
  return favourites.some(fav =>
    fav.tab === tab &&
    fav.row.cmd === row.cmd &&
    fav.row.description === row.description
  );
}

function toggleFavourite(tab, row) {
  const idx = favourites.findIndex(fav =>
    fav.tab === tab &&
    fav.row.cmd === row.cmd &&
    fav.row.description === row.description
  );

  if (idx >= 0) {
    favourites.splice(idx, 1);
  } else {
    favourites.push({ tab, row });
  }

  saveToLS("favourites", favourites);
}

function filterData(data, query) {
  if (!query) return data;

  const q = query.toLowerCase();

  return data.filter(row =>
    (row.cmd && row.cmd.toLowerCase().includes(q)) ||
    (row.description && row.description.toLowerCase().includes(q)) ||
    (row["default value/ args"] && row["default value/ args"].toLowerCase().includes(q)) ||
    (row["default value / args"] && row["default value / args"].toLowerCase().includes(q)) ||
    (row["default value"] && row["default value"].toLowerCase().includes(q))
  );
}

function tabLabel(tab) {
  switch (tab) {
    case "iosoccer": return "IOSoccer";
    case "sourcemod": return "SourceMod";
    case "hidden": return "Hidden CVARs";
    default: return tab;
  }
}

function switchTab(tab) {
  currentTab = tab;

  document.querySelectorAll(".tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  document.querySelectorAll(".tab-content").forEach(sec => {
    sec.classList.toggle("active", sec.id === "tab-" + tab);
  });

  document.getElementById("cheatToggle").style.display = (tab === "iosoccer") ? "" : "none";
  document.getElementById("searchInput").style.display = (tab === "favourites") ? "none" : "";

  renderAll();
  updateTabInfo(tab);
}

function updateCheatToggle() {
  const btn = document.getElementById("cheatToggle");
  btn.textContent = showCheats ? "HIDE CHEATS" : "SHOW CHEATS";
  btn.classList.toggle("active", showCheats);
}

function setDarkMode(enabled) {
  document.body.classList.toggle("dark", enabled);
  saveToLS("darkMode", enabled);
}

async function loadCSVs() {
  for (const tab in CSV_FILES) {
    const file = CSV_FILES[tab];
    try {
      const resp = await fetch(file);
      if (!resp.ok) throw new Error("Failed to load " + file);
      const text = await resp.text();
      tablesData[tab] = parseCSV(text);
    } catch (e) {
      tablesData[tab] = [];
      console.error("Error loading", file, e);
    }
  }
}

function setupEventListeners() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  document.getElementById("searchInput").addEventListener("input", e => {
    searchQuery = e.target.value;
    renderAll();
  });

  document.getElementById("cheatToggle").addEventListener("click", () => {
    showCheats = !showCheats;
    saveToLS("showCheats", showCheats);
    updateCheatToggle();
    renderAll();
  });

  document.getElementById("darkModeToggle").addEventListener("click", () => {
    const enabled = !document.body.classList.contains("dark");
    setDarkMode(enabled);
  });
}

async function init() {
  favourites = loadFromLS("favourites", []);
  showCheats = loadFromLS("showCheats", true);
  setDarkMode(loadFromLS("darkMode", window.matchMedia('(prefers-color-scheme: dark)').matches));
  updateCheatToggle();
  await loadCSVs();
  setupEventListeners();
  switchTab(currentTab);
}

window.addEventListener("DOMContentLoaded", init);

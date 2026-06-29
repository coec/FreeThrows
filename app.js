const STORAGE_KEY = "freeThrowTrackerV1";

let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  teams: [],
  players: [],
  events: [],
  shots: [],
  currentEventId: null
};

let lastReport = "";
function selectedTeamId() {
  return document.getElementById("teamSelect")?.value || null;
}

function addPlayerToTeamById(playerId) {
  const teamId = selectedTeamId();
  const player = playerById(playerId);

  if (!teamId || !player) return;

  if (!player.teamIds.includes(teamId)) {
    player.teamIds.push(teamId);
  }

  save();
  render();
}

function removePlayerFromTeamById(playerId) {
  const teamId = selectedTeamId();
  const player = playerById(playerId);

  if (!teamId || !player) return;

  player.teamIds = player.teamIds.filter(id => id !== teamId);

  save();
  render();
}

function renderTeamMembers() {
  const teamId = selectedTeamId();
  const availableDiv = document.getElementById("availablePlayers");
  const membersDiv = document.getElementById("teamMembers");

  if (!availableDiv || !membersDiv) return;

  if (!teamId) {
    availableDiv.innerHTML = "Create/select a team first.";
    membersDiv.innerHTML = "";
    return;
  }

  const available = data.players
    .filter(p => !p.teamIds.includes(teamId))
    .sort((a, b) => a.name.localeCompare(b.name));

  const members = data.players
    .filter(p => p.teamIds.includes(teamId))
    .sort((a, b) => a.name.localeCompare(b.name));

  availableDiv.innerHTML = available.length
    ? available.map(p => `
        <div class="member-row">
          <span>${esc(p.name)}</span>
          <button onclick="addPlayerToTeamById('${p.id}')">Add</button>
        </div>
      `).join("")
    : "<p>All players are already in this team.</p>";

  membersDiv.innerHTML = members.length
    ? members.map(p => `
        <div class="member-row">
          <span>${esc(p.name)}</span>
          <button onclick="removePlayerFromTeamById('${p.id}')">Remove</button>
        </div>
      `).join("")
    : "<p>No players in this team yet.</p>";
}
function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  render();
}

function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

function pct(made, total) {
  return total ? ((made / total) * 100).toFixed(1) : "0.0";
}

function stats(shots) {
  const total = shots.length;
  const made = shots.filter(s => s.result === "made").length;
  return { made, total, percent: pct(made, total) };
}

function bestStreak(shots) {
  let best = 0;
  let current = 0;

  [...shots].sort((a, b) => a.time.localeCompare(b.time)).forEach(s => {
    if (s.result === "made") {
      current++;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  });

  return best;
}

function currentStreak(shots) {
  let streak = 0;

  [...shots].sort((a, b) => b.time.localeCompare(a.time)).some(s => {
    if (s.result === "made") {
      streak++;
      return false;
    }
    return true;
  });

  return streak;
}

function currentEvent() {
  return data.events.find(e => e.id === data.currentEventId);
}

function teamById(id) {
  return data.teams.find(t => t.id === id);
}

function playerById(id) {
  return data.players.find(p => p.id === id);
}

function teamPlayers(teamId) {
  return data.players.filter(p => p.teamIds.includes(teamId));
}

function eventPlayers(event) {
  if (!event) return [];

  if (event.type === "team") {
    return teamPlayers(event.teamId);
  }

  return data.players.filter(p => p.id === event.playerId);
}

function shotsForEvent(eventId, playerId = null) {
  return data.shots.filter(s =>
    s.eventId === eventId &&
    (!playerId || s.playerId === playerId)
  );
}

function shotsForTeam(teamId, playerId = null) {
  const eventIds = data.events
    .filter(e => e.type === "team" && e.teamId === teamId)
    .map(e => e.id);

  return data.shots.filter(s =>
    eventIds.includes(s.eventId) &&
    (!playerId || s.playerId === playerId)
  );
}

function shotsForPlayer(playerId) {
  return data.shots.filter(s => s.playerId === playerId);
}

function addTeam() {
  const name = document.getElementById("teamName").value.trim();
  if (!name) return;

  data.teams.push({ id: uid(), name });
  document.getElementById("teamName").value = "";
  save();
  render();
}

function addPlayer() {
  const name = document.getElementById("playerName").value.trim();
  if (!name) return;

  data.players.push({
    id: uid(),
    name,
    teamIds: []
  });

  document.getElementById("playerName").value = "";
  save();
  render();
}

function addPlayerToTeam() {
  const teamId = document.getElementById("teamSelect").value;
  const playerId = document.getElementById("playerSelect").value;

  const player = playerById(playerId);
  if (!teamId || !player) return;

  if (!player.teamIds.includes(teamId)) {
    player.teamIds.push(teamId);
  }

  save();
  render();
}

function addEvent() {
  const type = document.getElementById("eventType").value;
  const purpose = document.getElementById("eventPurpose").value;
  const name = document.getElementById("eventName").value.trim() || new Date().toLocaleString();

  let event = {
    id: uid(),
    type,
    purpose,
    name,
    created: new Date().toLocaleString()
  };

  if (type === "team") {
    const teamId = document.getElementById("teamSelect").value;
    if (!teamId) {
      alert("Select a team first.");
      return;
    }
    event.teamId = teamId;
  } else {
    const playerId = document.getElementById("eventPlayerSelect").value;
    if (!playerId) {
      alert("Select a player first.");
      return;
    }
    event.playerId = playerId;
  }

  data.events.push(event);
  data.currentEventId = event.id;
  document.getElementById("eventName").value = "";

  save();
  showScreen("record");
}

function setCurrentEvent() {
  data.currentEventId = document.getElementById("currentEvent").value;
  save();
  render();
}

function recordShot(playerId, result) {
  const event = currentEvent();
  if (!event) {
    alert("Create or select an event first.");
    return;
  }

  data.shots.push({
    id: uid(),
    eventId: event.id,
    playerId,
    result,
    time: new Date().toISOString()
  });

  save();
  renderRecord();
}

function undoLast(playerId) {
  const event = currentEvent();
  if (!event) return;

  const shots = shotsForEvent(event.id, playerId)
    .sort((a, b) => b.time.localeCompare(a.time));

  if (!shots.length) return;

  data.shots = data.shots.filter(s => s.id !== shots[0].id);
  save();
  renderRecord();
}

function render() {
  try {
    renderSetup();
    renderEventSelector();
    renderRecord();
  } catch (err) {
    console.error("Render failed:", err);
    alert("Render failed: " + err.message);
  }
}

function renderSetup() {
  console.log("renderSetup running", data.teams);
  const teamSelect = document.getElementById("teamSelect");
  const eventPlayerSelect = document.getElementById("eventPlayerSelect");

  if (teamSelect) {
    const currentTeam = teamSelect.value;

    teamSelect.innerHTML = data.teams.map(t =>
      `<option value="${t.id}">${esc(t.name)}</option>`
    ).join("");

    if (currentTeam) {
      teamSelect.value = currentTeam;
    }
  }

  if (eventPlayerSelect) {
    eventPlayerSelect.innerHTML = data.players.map(p =>
      `<option value="${p.id}">${esc(p.name)}</option>`
    ).join("");
  }

  renderTeamMembers();
}

function refreshSetup() {
  renderSetup();
}

function renderEventSelector() {
  const select = document.getElementById("currentEvent");

  select.innerHTML = data.events.map(e => {
    let owner = "";

    if (e.type === "team") {
      owner = teamById(e.teamId)?.name || "Unknown team";
    } else {
      owner = playerById(e.playerId)?.name || "Unknown player";
    }

    return `<option value="${e.id}">${esc(e.name)} — ${esc(owner)} — ${esc(e.purpose)}</option>`;
  }).join("");

  if (data.currentEventId) {
    select.value = data.currentEventId;
  }
}

function renderRecord() {
  const area = document.getElementById("recordingArea");
  const event = currentEvent();

  if (!event) {
    area.innerHTML = `<div class="card">Create an event first.</div>`;
    return;
  }

  const players = eventPlayers(event);

  if (!players.length) {
    area.innerHTML = `<div class="card">No players are available for this event.</div>`;
    return;
  }

  area.innerHTML = players.map(p => {
    const eventStats = stats(shotsForEvent(event.id, p.id));
    const playerStats = stats(shotsForPlayer(p.id));
    const eventShots = shotsForEvent(event.id, p.id);

    return `
      <div class="player-card">
        <div class="player-name">${esc(p.name)}</div>

        <div class="stats">
          Event: ${eventStats.made}/${eventStats.total} (${eventStats.percent}%)<br>
          Lifetime: ${playerStats.made}/${playerStats.total} (${playerStats.percent}%)<br>
          Current streak: ${currentStreak(eventShots)}<br>
          Best event streak: ${bestStreak(eventShots)}
        </div>

        <div class="shot-buttons">
          <button class="made" onclick="recordShot('${p.id}', 'made')">Made</button>
          <button class="miss" onclick="recordShot('${p.id}', 'miss')">Miss</button>
        </div>

        <button class="undo" onclick="undoLast('${p.id}')">Undo Last</button>
      </div>
    `;
  }).join("");
}

function reportForPlayers(title, players, shotFn) {
  const allShots = players.flatMap(p => shotFn(p));
  const total = stats(allShots);

  let text = `${title}\n`;
  text += "-".repeat(title.length) + "\n";
  text += `Total: ${total.made}/${total.total} (${total.percent}%)\n\n`;

  players
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(p => {
      const s = stats(shotFn(p));
      text += `${p.name}: ${s.made}/${s.total} (${s.percent}%)`;
      text += ` | Best streak: ${bestStreak(shotFn(p))}\n`;
    });

  return text;
}

function showEventReport() {
  const event = currentEvent();
  if (!event) return;

  const players = eventPlayers(event);
  const owner = event.type === "team"
    ? teamById(event.teamId)?.name
    : playerById(event.playerId)?.name;

  lastReport =
    `FREE THROW EVENT REPORT\n` +
    `${event.name}\n` +
    `${owner}\n` +
    `${event.purpose}\n` +
    `${event.created}\n\n` +
    reportForPlayers("Event", players, p => shotsForEvent(event.id, p.id));

  document.getElementById("reportOutput").textContent = lastReport;
  showScreen("reports");
}

function showTeamReport() {
  const teamId = document.getElementById("teamSelect").value;
  const team = teamById(teamId);

  if (!team) {
    alert("Select a team first.");
    return;
  }

  const players = teamPlayers(team.id);

  lastReport =
    `FREE THROW TEAM REPORT\n` +
    `${team.name}\n\n` +
    reportForPlayers("Team Events", players, p => shotsForTeam(team.id, p.id));

  document.getElementById("reportOutput").textContent = lastReport;
}

function showAllPlayersReport() {
  lastReport =
    `FREE THROW ALL PLAYERS REPORT\n\n` +
    reportForPlayers("All Players", data.players, p => shotsForPlayer(p.id));

  document.getElementById("reportOutput").textContent = lastReport;
}

function copyReport() {
  if (!lastReport) showEventReport();

  navigator.clipboard.writeText(lastReport).then(() => {
    alert("Report copied.");
  }).catch(() => {
    alert("Copy failed. Select and copy the report manually.");
  });
}

function exportSelectedTeam() {
  const teamId = document.getElementById("teamSelect").value;
  const team = teamById(teamId);

  if (!team) {
    alert("Select a team first.");
    return;
  }

  const players = teamPlayers(team.id);
  const events = data.events.filter(e => e.type === "team" && e.teamId === team.id);
  const eventIds = events.map(e => e.id);
  const shots = data.shots.filter(s => eventIds.includes(s.eventId));

  const exportData = {
    exportType: "freeThrowTeamV1",
    exportedAt: new Date().toISOString(),
    team,
    players,
    events,
    shots
  };

  const safeName = team.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  downloadJson(exportData, `free-throw-team-${safeName}.json`);
}

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function importTeam(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);

      if (imported.exportType !== "freeThrowTeamV1") {
        alert("Invalid team export.");
        return;
      }

      upsert(data.teams, imported.team);
      imported.players.forEach(p => upsert(data.players, p));
      imported.events.forEach(ev => upsert(data.events, ev));
      imported.shots.forEach(s => upsert(data.shots, s));

      save();
      render();
      alert("Team imported.");
    } catch {
      alert("Import failed.");
    }
  };

  reader.readAsText(file);
}

function upsert(array, item) {
  const index = array.findIndex(x => x.id === item.id);
  if (index >= 0) array[index] = item;
  else array.push(item);
}

render();

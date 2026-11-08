// Número máximo de jugadores que permite la plantilla.
const MAX_PLAYERS = 14;
// Orden real de rotación indicado para este sistema: desde R1 se pasa a R6.
const ROTATION_ORDER = [1, 6, 5, 4, 3, 2];
// Posiciones numéricas disponibles en la pista.
const POSITIONS = [1, 2, 3, 4, 5, 6];
// Orden visual de la pista: fila superior 4-3-2 y fila inferior 5-6-1.
const COURT_LAYOUT = [4, 3, 2, 5, 6, 1];
// Puesto exacto que corresponde a cada posición numérica en cada rotación.
// Se utiliza una tabla explícita porque el orden de rotación es R1 > R6 > R5 > R4 > R3 > R2.
const ROTATION_ROLES = {
  1: { 1: 'CO', 2: 'Rc1', 3: 'C2', 4: 'OP', 5: 'Rc2', 6: 'C1' },
  6: { 1: 'Rc1', 2: 'C2', 3: 'OP', 4: 'Rc2', 5: 'C1', 6: 'CO' },
  5: { 1: 'C2', 2: 'OP', 3: 'Rc2', 4: 'C1', 5: 'CO', 6: 'Rc1' },
  4: { 1: 'OP', 2: 'Rc2', 3: 'C1', 4: 'CO', 5: 'Rc1', 6: 'C2' },
  3: { 1: 'Rc2', 2: 'C1', 3: 'CO', 4: 'Rc1', 5: 'C2', 6: 'OP' },
  2: { 1: 'C1', 2: 'CO', 3: 'Rc1', 4: 'C2', 5: 'OP', 6: 'Rc2' },
};
// Coordenadas aproximadas de recepción para cada puesto y cada rotación.
const RECEPTION_COORDS = {
  1: { OP: [11, 38], C2: [50, 11], Rc1: [73,48], Rc2: [26, 66], C1: [55, 66], CO: [89, 63] },
  2: { C2: [16, 11], CO: [87, 12], Rc1: [25, 60], Rc2: [56, 68], C1: [86, 62], OP: [18, 84] },
  3: { C2: [43, 63], CO: [55, 12], C1: [84, 32], Rc1: [18, 63], Rc2: [75, 67], OP: [60, 85] },
  4: { CO: [11, 10], C1: [20, 32], C2: [72, 62], Rc1: [48, 74], Rc2: [25, 64], OP: [85, 85] },
  5: { C1: [18,12], CO: [14, 40], OP: [88, 52], Rc2: [25, 79], Rc1: [52, 77], C2: [78, 75] },
  6: { OP: [52, 12], C2: [77, 38], CO: [52, 35], Rc1: [82, 64], C1: [48, 75], Rc2: [15, 65] },
};
// Abreviaturas utilizadas en la lista de suplentes.
const roleShort = { Colocador: 'CO', Receptor: 'R', Central: 'C', Opuesto: 'OP', 'Líbero / Otro': 'OT' };

// Estado completo del set y de la alineación actual.
const state = {
  roster: [],
  lineup: {},
  rotation: 1,
  phase: 'serve',
  homeScore: 0,
  awayScore: 0,
  homeSets: 0,
  awaySets: 0,
  setNumber: 1,
  notice: '',
};

// Atajo para localizar elementos del HTML mediante un selector CSS.
const $ = (selector) => document.querySelector(selector);
const setupView = $('#setupView');
const matchView = $('#matchView');

function renderRoster() {
  // Dibuja de nuevo la lista de jugadores y actualiza el contador de plantilla.
  $('#rosterCount').textContent = `${state.roster.length} / ${MAX_PLAYERS}`;
  const list = $('#rosterList');
  if (!state.roster.length) {
    list.className = 'roster-list empty-state';
    list.textContent = 'Añade los jugadores de la plantilla.';
    renderLineupFields();
    return;
  }
  list.className = 'roster-list';
  list.innerHTML = state.roster.map((player, index) => `
    <div class="roster-item"><span class="player-index">${String(index + 1).padStart(2, '0')}</span>
      <div><strong>${escapeHtml(player.name)}</strong><div class="player-role">${player.role}</div></div>
      <button class="remove-player" type="button" data-remove="${player.id}" aria-label="Eliminar ${escapeHtml(player.name)}">×</button>
    </div>`).join('');
  list.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => removePlayer(button.dataset.remove)));
  renderLineupFields();
}

function renderLineupFields() {
  // Genera los seis selectores para asignar jugadores a las posiciones de salida.
  $('#lineupFields').innerHTML = POSITIONS.map((position) => {
    const selected = state.lineup[position] || '';
    const options = state.roster.map((player) => `<option value="${player.id}" ${player.id === selected ? 'selected' : ''}>${escapeHtml(player.name)} · ${roleShort[player.role] || 'OT'}</option>`).join('');
    return `<div class="lineup-field"><label>Posición ${position}<select data-position="${position}"><option value="">Seleccionar jugador</option>${options}</select></label></div>`;
  }).join('');
  $('#lineupFields').querySelectorAll('select').forEach((select) => select.addEventListener('change', (event) => {
    state.lineup[event.target.dataset.position] = event.target.value;
  }));
}

function addPlayer(event) {
  // Añade un jugador a la plantilla cuando se envía el formulario.
  event.preventDefault();
  const name = $('#playerName').value.trim();
  if (!name || state.roster.length >= MAX_PLAYERS) return;
  state.roster.push({ id: makeId(), name, role: $('#playerRole').value });
  $('#playerName').value = '';
  $('#playerName').focus();
  renderRoster();
}

function makeId() {
  // Crea un identificador único compatible con navegador local y servidor web.
  if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  return `player-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function removePlayer(id) {
  // Elimina un jugador y limpia cualquier posición que tuviera asignada.
  state.roster = state.roster.filter((player) => player.id !== id);
  Object.keys(state.lineup).forEach((position) => { if (state.lineup[position] === id) delete state.lineup[position]; });
  renderRoster();
}

function startSet() {
  // Comprueba la alineación y cambia de la pantalla de configuración al marcador.
  const selected = POSITIONS.map((position) => state.lineup[position]).filter(Boolean);
  $('#setupError').textContent = '';
  if (state.roster.length < 6) return $('#setupError').textContent = 'Añade al menos 6 jugadores a la plantilla.';
  if (selected.length !== 6 || new Set(selected).size !== 6) return $('#setupError').textContent = 'Selecciona seis jugadores distintos, uno por posición.';
  state.rotation = Number($('#initialRotation').value);
  state.phase = $('#initialPhase').value;
  state.homeScore = 0; state.awayScore = 0; state.notice = '';
  setupView.classList.remove('active'); matchView.classList.add('active'); renderMatch();
}

function renderMatch() {
  // Actualiza marcador, sets, saque/recepción, rotación y pista.
  $('#homeScore').textContent = state.homeScore;
  $('#awayScore').textContent = state.awayScore;
  $('#homeSets').textContent = state.homeSets;
  $('#awaySets').textContent = state.awaySets;
  $('#setLabel').textContent = `Set ${state.setNumber}`;
  $('#setMessage').textContent = state.notice || 'En juego';
  $('#homeStatus').textContent = state.phase === 'serve' ? 'Saca' : 'Recibe';
  $('#matchTitle').textContent = `R${state.rotation} · ${state.phase === 'serve' ? 'En saque' : 'En recepción'}`;
  $('#phaseBadge').textContent = state.phase === 'serve' ? 'Saque' : 'Recepción';
  renderCourt(); renderBench();
}

function roleForPosition(position) {
  // Busca el puesto exacto de la posición en la rotación actual.
  return ROTATION_ROLES[state.rotation][position];
}

function renderCourt() {
  // Dibuja la pista de saque o la distribución táctica de recepción.
  const court = $('#court');
  court.classList.toggle('reception-court', state.phase === 'receive');
  if (state.phase === 'receive') {
    court.innerHTML = POSITIONS.map((position) => {
      const player = state.roster.find((item) => item.id === state.lineup[position]);
      const role = roleForPosition(position);
      const [left, top] = RECEPTION_COORDS[state.rotation][role];
      return `<div class="court-slot reception-slot role-${role}" style="--left:${left}%;--top:${top}%"><span class="position">${role}</span><strong>${player ? escapeHtml(player.name) : '—'}</strong><small>Pos. ${position}</small></div>`;
    }).join('');
    return;
  }
  const names = COURT_LAYOUT.map((position) => {
    const player = state.roster.find((item) => item.id === state.lineup[position]);
    return { position, player, role: roleForPosition(position) };
  });
  court.innerHTML = names.map(({ position, player, role }) => `<div class="court-slot serve-slot role-${role}"><span class="position">${role}</span><strong>${player ? escapeHtml(player.name) : '—'}</strong><small>Pos. ${position}</small></div>`).join('');
}

function renderBench() {
  // Muestra como suplentes los jugadores que no están en las seis posiciones.
  const onCourt = new Set(Object.values(state.lineup));
  const substitutes = state.roster.filter((player) => !onCourt.has(player.id));
  $('#bench').innerHTML = `<div class="bench-title">Suplentes disponibles</div>${substitutes.length ? substitutes.map((player) => `<span>${escapeHtml(player.name)} · ${roleShort[player.role] || 'OT'}</span>`).join('') : '<span>No hay suplentes</span>'}`;
}

function addPoint(team) {
  // Suma un punto y aplica las reglas de saque, recepción y cambio de rotación.
  if (team === 'home') {
    state.homeScore += 1;
    if (state.phase === 'receive') { rotateLineup(); state.phase = 'serve'; state.rotation = nextRotation(state.rotation); state.notice = `Punto local · rotación R${state.rotation}`; }
    else state.notice = 'Punto local · se mantiene el saque';
  } else {
    state.awayScore += 1;
    if (state.phase === 'serve') state.phase = 'receive';
    state.notice = 'Punto visitante';
  }
  if (isSetWon(state.homeScore, state.awayScore)) return finishSet('home');
  if (isSetWon(state.awayScore, state.homeScore)) return finishSet('away');
  renderMatch();
}

// Devuelve la siguiente rotación siguiendo R1 > R6 > R5 > R4 > R3 > R2.
function nextRotation(currentRotation) {
  const currentIndex = ROTATION_ORDER.indexOf(Number(currentRotation));
  return ROTATION_ORDER[(currentIndex + 1) % ROTATION_ORDER.length];
}

// Desplaza físicamente a los jugadores cuando el equipo local gana en recepción.
function rotateLineup() {
  // Rotación solicitada por el entrenador:
  // jugador de 1 pasa a 6, de 6 pasa a 5, de 5 pasa a 4,
  // de 4 pasa a 3, de 3 pasa a 2 y de 2 pasa a 1.
  const current = { ...state.lineup };
  state.lineup[1] = current[2];
  state.lineup[2] = current[3];
  state.lineup[3] = current[4];
  state.lineup[4] = current[5];
  state.lineup[5] = current[6];
  state.lineup[6] = current[1];
}

function isSetWon(score, other) { return score >= 25 && score - other >= 2; }

function finishSet(winner) {
  // Guarda el set ganado, muestra el resultado y prepara un nuevo set.
  if (winner === 'home') state.homeSets += 1; else state.awaySets += 1;
  state.notice = winner === 'home' ? 'CV Kairos gana el set' : 'Visitante gana el set';
  renderMatch();
  $('#homePointButton').disabled = true; $('#awayPointButton').disabled = true;
  setTimeout(() => { state.setNumber += 1; state.homeScore = 0; state.awayScore = 0; state.rotation = 1; state.phase = 'serve'; state.notice = 'Nuevo set: revisa la alineación y la rotación inicial.'; matchView.classList.remove('active'); setupView.classList.add('active'); $('#homePointButton').disabled = false; $('#awayPointButton').disabled = false; renderRoster(); }, 900);
}

function openSubstitution() {
  // Abre el diálogo de cambios y carga posiciones y suplentes disponibles.
  const onCourt = new Set(Object.values(state.lineup));
  const substitutes = state.roster.filter((player) => !onCourt.has(player.id));
  if (!substitutes.length) return $('#matchNotice').textContent = 'No hay jugadores suplentes disponibles.';
  $('#subPosition').innerHTML = POSITIONS.map((position) => `<option value="${position}">Posición ${position}</option>`).join('');
  $('#subPlayer').innerHTML = substitutes.map((player) => `<option value="${player.id}">${escapeHtml(player.name)} · ${player.role}</option>`).join('');
  $('#subError').textContent = ''; $('#substitutionModal').classList.remove('hidden');
}

function confirmSubstitution() {
  // Sustituye al jugador de la posición seleccionada por el suplente elegido.
  const position = $('#subPosition').value; const playerId = $('#subPlayer').value;
  if (!position || !playerId) return;
  state.lineup[position] = playerId; $('#substitutionModal').classList.add('hidden'); $('#matchNotice').textContent = `Cambio realizado en la posición ${position}.`; renderMatch();
}

// Vuelve a la pantalla de configuración para preparar el siguiente set.
function resetToSetup() { matchView.classList.remove('active'); setupView.classList.add('active'); state.homeScore = 0; state.awayScore = 0; state.notice = ''; renderRoster(); }

// Protege los nombres escritos por el usuario antes de insertarlos en el HTML.
function escapeHtml(value) { return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }

// Eventos de los formularios y botones principales de la aplicación.
$('#playerForm').addEventListener('submit', addPlayer);
$('#startMatchButton').addEventListener('click', startSet);
$('#homePointButton').addEventListener('click', () => addPoint('home'));
$('#awayPointButton').addEventListener('click', () => addPoint('away'));
$('#substituteButton').addEventListener('click', openSubstitution);
$('#confirmSubButton').addEventListener('click', confirmSubstitution);
$('#closeModalButton').addEventListener('click', () => $('#substitutionModal').classList.add('hidden'));
$('#restartButton').addEventListener('click', resetToSetup);
renderRoster();

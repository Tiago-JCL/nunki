const STATS = [
  { key: "atk",   label: "Atk",   preview: "Attack" },
  { key: "def",   label: "Def",   preview: "Defense" },
  { key: "spatk", label: "SpAtk", preview: "Special Atk" },
  { key: "spdef", label: "SpDef", preview: "Special Defense" },
  { key: "speed", label: "Speed", preview: "Speed" },
];

// Valores "brutos" (0..100) que o usuário ajusta.
// A UI EXIBE a versão normalizada, que sempre soma 100 quando totalBruto > 0.
const raw = Object.fromEntries(STATS.map(s => [s.key, 0]));
const base = Object.fromEntries(STATS.map(s => [s.key, 0]));

const elPoints = document.getElementById("points");
const elBars = document.getElementById("bars");
const elBaseGrid = document.getElementById("baseGrid");
const elPreview = document.getElementById("preview");
const elTotalNorm = document.getElementById("totalNorm");
const elToast = document.getElementById("toast");
const btnFormar = document.getElementById("btnFormar");

function clampInt(v, min, max){
  const n = Number.isFinite(v) ? v : parseFloat(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function getNormalizedPercents(){
  const total = STATS.reduce((sum, s) => sum + raw[s.key], 0);
  if (total <= 0) return Object.fromEntries(STATS.map(s => [s.key, 0]));
  return Object.fromEntries(
    STATS.map(s => [s.key, (raw[s.key] / total) * 100])
  );
}

// Distribui "points" usando as porcentagens normalizadas,
// garantindo que a soma dos pontos distribuídos dê exatamente "points".
function computeAdded(points, normPct){
  const floats = STATS.map(s => ({
    key: s.key,
    exact: (points * normPct[s.key]) / 100
  }));

  const floors = floats.map(x => ({
    key: x.key,
    val: Math.floor(x.exact),
    frac: x.exact - Math.floor(x.exact),
  }));

  let used = floors.reduce((sum, x) => sum + x.val, 0);
  let remain = points - used;

  floors.sort((a,b) => b.frac - a.frac);

  for (let i = 0; i < floors.length && remain > 0; i++){
    floors[i].val += 1;
    remain -= 1;
  }

  // voltar pra ordem original
  const out = {};
  for (const s of STATS){
    out[s.key] = floors.find(x => x.key === s.key).val;
  }
  return out;
}

function buildBars(){
  elBars.innerHTML = "";
  for (const s of STATS){
    const row = document.createElement("div");
    row.className = "barRow";

    const name = document.createElement("div");
    name.className = "statName";
    name.textContent = s.label;

    const bar = document.createElement("div");
    bar.className = "bar";
    bar.setAttribute("role", "slider");
    bar.setAttribute("aria-label", `Distribuição ${s.label}`);

    const fill = document.createElement("div");
    fill.className = "barFill";
    fill.style.width = "0%";
    bar.appendChild(fill);

    const pct = document.createElement("div");
    pct.className = "pct";
    pct.textContent = "0%";

    // Clique/arraste para ajustar o valor bruto 0..100
    const setFromEvent = (ev) => {
      const rect = bar.getBoundingClientRect();
      const x = Math.min(Math.max(ev.clientX - rect.left, 0), rect.width);
      const val = clampInt((x / rect.width) * 100, 0, 100);
      raw[s.key] = val;
      render();
    };

    let dragging = false;

    bar.addEventListener("pointerdown", (ev) => {
      dragging = true;
      bar.setPointerCapture(ev.pointerId);
      setFromEvent(ev);
    });

    bar.addEventListener("pointermove", (ev) => {
      if (!dragging) return;
      setFromEvent(ev);
    });

    bar.addEventListener("pointerup", () => { dragging = false; });
    bar.addEventListener("pointercancel", () => { dragging = false; });

    row.appendChild(name);
    row.appendChild(bar);
    row.appendChild(pct);

    row._fill = fill;
    row._pct = pct;
    row._key = s.key;

    elBars.appendChild(row);
  }
}

function buildBaseInputs(){
  elBaseGrid.innerHTML = "";
  for (const s of STATS){
    const item = document.createElement("div");
    item.className = "baseItem";

    const lab = document.createElement("label");
    lab.textContent = s.label + ":";

    const inp = document.createElement("input");
    inp.type = "number";
    inp.min = "0";
    inp.step = "1";
    inp.value = "0";

    inp.addEventListener("input", () => {
      base[s.key] = clampInt(parseInt(inp.value, 10), 0, 999999);
      render();
    });

    item.appendChild(lab);
    item.appendChild(inp);
    elBaseGrid.appendChild(item);
  }
}

function render(){
  const points = clampInt(parseInt(elPoints.value, 10), 0, 999999);

  const norm = getNormalizedPercents();
  const totalNorm = STATS.reduce((sum, s) => sum + norm[s.key], 0);
  elTotalNorm.textContent = totalNorm > 0 ? "100%" : "0%";

  // Atualiza as barras com % NORMALIZADA
  const rows = [...elBars.querySelectorAll(".barRow")];
  for (const row of rows){
    const key = row._key;
    const pct = totalNorm > 0 ? norm[key] : 0;
    row._fill.style.width = `${pct}%`;
    row._pct.textContent = `${Math.round(pct)}%`;
  }

  // Calcula pontos adicionados e soma no base
  const added = totalNorm > 0 ? computeAdded(points, norm) : Object.fromEntries(STATS.map(s => [s.key, 0]));

  // Preview
  elPreview.innerHTML = "";
  for (const s of STATS){
    const li = document.createElement("li");

    const k = document.createElement("span");
    k.className = "k";
    k.textContent = `• ${s.preview}`;

    const v = document.createElement("span");
    v.className = "v";

    const finalVal = (base[s.key] || 0) + (added[s.key] || 0);
    v.textContent = `${finalVal}`;

    const plus = document.createElement("span");
    plus.className = "plus";
    plus.textContent = added[s.key] > 0 ? `+${added[s.key]}` : "+0";

    v.appendChild(plus);

    li.appendChild(k);
    li.appendChild(v);
    elPreview.appendChild(li);
  }
}

function toast(msg){
  elToast.textContent = msg;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (elToast.textContent = ""), 1800);
}

// Eventos
elPoints.addEventListener("input", () => {
  elPoints.value = clampInt(parseInt(elPoints.value, 10), 0, 999999);
  render();
});

btnFormar.addEventListener("click", () => {
  toast("Formação aplicada ✔");
});

buildBars();
buildBaseInputs();
render();

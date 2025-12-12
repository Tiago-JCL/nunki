const STATS = [
  { key: "atk",   label: "Atk",   preview: "Attack" },
  { key: "def",   label: "Def",   preview: "Defense" },
  { key: "spatk", label: "SpAtk", preview: "Special Atk" },
  { key: "spdef", label: "SpDef", preview: "Special Defense" },
  { key: "speed", label: "Speed", preview: "Speed" },
];
const NATURES = [
  { name: "Líder",       up: "atk",   down: "spatk" },
  { name: "Corajoso",    up: "atk",   down: "speed" },
  { name: "Solitário",   up: "atk",   down: "def" },
  { name: "Atrapalhado", up: "atk",   down: "spdef" },

  { name: "Ousado",      up: "def",   down: "atk" },
  { name: "Travesso",    up: "def",   down: "spatk" },
  { name: "Carente",     up: "def",   down: "speed" },
  { name: "Relaxado",    up: "def",   down: "spdef" },

  { name: "Modesto",     up: "spatk", down: "atk" },
  { name: "Tranquilo",   up: "spatk", down: "def" },
  { name: "Calado",      up: "spatk", down: "speed" },
  { name: "Impulsivo",   up: "spatk", down: "spdef" },

  { name: "Calculista",  up: "spdef", down: "atk" },
  { name: "Cuidadoso",   up: "spdef", down: "spatk" },
  { name: "Gentil",      up: "spdef", down: "def" },
  { name: "Narcisista",  up: "spdef", down: "speed" },

  { name: "Ansioso",     up: "speed", down: "def" },
  { name: "Alegre",      up: "speed", down: "spatk" },
  { name: "Ingênuo",     up: "speed", down: "spdef" },
  { name: "Tímido",      up: "speed", down: "atk" },

  { name: "Sério",       up: null,    down: null }, // neutro
];

function getSelectedNature(){
  const name = elNature?.value || "Sério";
  return NATURES.find(n => n.name === name) || NATURES[NATURES.length - 1];
}

function getNatureMarkerForStat(statKey){
  const n = getSelectedNature();
  if (!n.up || !n.down) return "";
  if (statKey === n.up) return "+";
  if (statKey === n.down) return "-";
  return "";
}

function buildNatureOptions(){
  if (!elNature) return;
  elNature.innerHTML = "";

  for (const n of NATURES){
    const opt = document.createElement("option");
    opt.value = n.name;
    opt.textContent = n.name;
    elNature.appendChild(opt);
  }

  elNature.value = "Sério";
  elNature.addEventListener("change", render);
}

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
const elNature = document.getElementById("nature");

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

    const strip = document.createElement("div");
    strip.className = "dotStrip";
    strip.setAttribute("aria-label", `Distribuição ${s.label}`);

    const dots = [];
    for (let i = 1; i <= 20; i++){
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dotBtn";
      btn.setAttribute("aria-label", `${s.label} ${i * 5}%`);
      btn.setAttribute("aria-pressed", "false");

      btn.addEventListener("click", () => {
        const desired = i * 5;
        const next = (raw[s.key] === desired) ? 0 : desired; // clicar no mesmo nível zera

        const sumOthers = STATS.reduce((sum, st) => {
          if (st.key === s.key) return sum;
          return sum + raw[st.key];
        }, 0);

        // Se passar de 100, não deixa clicar
        if (sumOthers + next > 100){
          toast("Limite de 100% atingido");
          return;
        }

        raw[s.key] = next;
        render();
      });

      dots.push(btn);
      strip.appendChild(btn);
    }

    const pct = document.createElement("div");
    pct.className = "pct";
    pct.textContent = "0%";

    row.appendChild(name);
    row.appendChild(strip);
    row.appendChild(pct);

    row._dots = dots;
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
  const totalRaw = STATS.reduce((sum, s) => sum + raw[s.key], 0);
  elTotalNorm.textContent = `${totalRaw}%`;
  
  // Atualiza as bolinhas (0..100 em passos de 5)
  const rows = [...elBars.querySelectorAll(".barRow")];
  for (const row of rows){
    const key = row._key;
    const active = Math.round((raw[key] || 0) / 5);
  
    row._dots.forEach((btn, idx) => {
      const on = idx < active;
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  
    row._pct.textContent = `${raw[key] || 0}%`;
  }
  
  // Calcula pontos adicionados e soma no base
  const added = totalRaw > 0 ? computeAdded(points, norm) : Object.fromEntries(STATS.map(s => [s.key, 0]));


  // Preview
  elPreview.innerHTML = "";
  for (const s of STATS){
    const li = document.createElement("li");

    const k = document.createElement("span");
    k.className = "k";
    k.textContent = `• ${s.preview}`;

    const mk = getNatureMarkerForStat(s.key);
    if (mk === "+"){
      const b = document.createElement("span");
      b.className = "badge plus";
      b.textContent = "+";
      k.appendChild(b);
    }else if (mk === "-"){
      const b = document.createElement("span");
      b.className = "badge minus";
      b.textContent = "-";
      k.appendChild(b);
    }


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

function getFinalStats(){
  const points = clampInt(parseInt(elPoints.value, 10), 0, 999999);

  const norm = getNormalizedPercents();
  const totalNorm = STATS.reduce((sum, s) => sum + norm[s.key], 0);

  const added =
    totalNorm > 0
      ? computeAdded(points, norm)
      : Object.fromEntries(STATS.map(s => [s.key, 0]));

  const final = {};
  for (const s of STATS){
    final[s.key] = (base[s.key] || 0) + (added[s.key] || 0);
  }
  return final;
}

function formatWhatsapp(finalStats){
  const n = getSelectedNature();

  const line = (label, value, statKey) => {
    const mk = getNatureMarkerForStat(statKey);
    const suffix = mk ? ` (${mk})` : "";
    // IMPORTANTe: (+)/(-) fica fora do "_" exatamente como você mandou
    return `_*• ${label} |* ${value}_${suffix}`;
  };

  return [
    `_🧠 *• Nature:* ${n.name}_`,
    "",
    line("Attack", finalStats.atk, "atk"),
    line("Defense", finalStats.def, "def"),
    line("Special Atk", finalStats.spatk, "spatk"),
    line("Special Defense", finalStats.spdef, "spdef"),
    line("Speed", finalStats.speed, "speed"),
  ].join("\n");
}

async function copyToClipboard(text){
  // 1) padrão moderno (funciona bem no GitHub Pages / HTTPS)
  if (navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(text);
    return;
  }

  // 2) fallback (alguns casos locais / browsers antigos)
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();

  const ok = document.execCommand("copy");
  document.body.removeChild(ta);

  if (!ok) throw new Error("copy_failed");
}

// Eventos
elPoints.addEventListener("input", () => {
  elPoints.value = clampInt(parseInt(elPoints.value, 10), 0, 999999);
  render();
});

btnFormar.addEventListener("click", async () => {
  try{
    const finalStats = getFinalStats();
    const text = formatWhatsapp(finalStats);
    await copyToClipboard(text);
    toast("Copiado ✔");
  }catch (e){
    toast("Não foi possível copiar ❌");
  }
});

buildBars();
buildBaseInputs();
buildNatureOptions();
render();

document.addEventListener("DOMContentLoaded", () => {
    // --- VISTAS / DOM ---
    const menuView = document.getElementById("menu-view");
    const sumaView = document.getElementById("view-suma-0-9");
    const goSumaBtn = document.getElementById("op-suma-0-9");
    const scene = document.getElementById("scene");
  
    const countLeftEl = document.getElementById("count-left");
    const countRightEl = document.getElementById("count-right");
  
    const opAEl = document.getElementById("op-a");
    const opBEl = document.getElementById("op-b");
    const answerEl = document.getElementById("answer");
    const resultBigEl = document.getElementById("result-big");
    const btnSkipExample = document.getElementById("btn-skip-example");
    const btnCheck = document.getElementById("btn-check");
    const btnNext = document.getElementById("btn-next");
    const btnMenu = document.getElementById("btn-menu");
    const msgEl = document.getElementById("msg");
    const lessonLabelEl = document.getElementById("lesson-label");

    const btnExampleToggle = document.getElementById("btn-example-toggle");
  
    // --- CONFIG ---
    const MAX_N = 9;                // 0–9
    const DIAM = 36;                // px
    const R = DIAM / 2;
    const PADDING = 10;             // px
    const MIN_GAP = 6;              // px entre círculos
    const MIN_DIST = DIAM + MIN_GAP; // distancia mínima centro a centro
    const BETWEEN_MS = 180;         // pausa breve entre elementos
    const PULSE_MS = 900;           // pulso de grupo/total
    const NEXT_DELAY_MS = 800;      // espera antes de pasar al siguiente al acertar
    const TTS_ENABLED_DEFAULT = true;
  
    // Paleta con singular y plural para voz
    const PALETA = [
      { sing: "rojo",     plural: "rojos",     hex: "#ef4444" },
      { sing: "azul",     plural: "azules",    hex: "#3b82f6" },
      { sing: "verde",    plural: "verdes",    hex: "#10b981" },
      { sing: "amarillo", plural: "amarillos", hex: "#f59e0b" },
      { sing: "morado",   plural: "morados",   hex: "#8b5cf6" },
      { sing: "naranja",  plural: "naranjas",  hex: "#f97316" },
      { sing: "rosa",     plural: "rosas",     hex: "#ec4899" },
      { sing: "café",     plural: "cafés",     hex: "#8b5a2b" },
      { sing: "negro",    plural: "negros",    hex: "#111827" },
      { sing: "gris",     plural: "grises",    hex: "#6b7280" },
    ];
  
    // Voces y TTS
    let ttsEnabled = TTS_ENABLED_DEFAULT && "speechSynthesis" in window;
    let esVoice = null;
  
    function pickSpanishVoice() {
      if (!ttsEnabled) return;
      const vs = window.speechSynthesis.getVoices();
      esVoice =
        vs.find(v => v.lang?.toLowerCase().startsWith("es")) ||
        vs.find(v => (v.name || "").toLowerCase().includes("spanish")) ||
        null;
    }
    if (ttsEnabled) {
      pickSpanishVoice();
      window.speechSynthesis.onvoiceschanged = () => pickSpanishVoice();
    }
  
    function cancelSpeech() {
      try { window.speechSynthesis?.cancel?.(); } catch {}
    }
  
    function speak(text) {
      if (!ttsEnabled) return Promise.resolve();
      return new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance(text);
        if (esVoice) u.voice = esVoice;
        u.lang = esVoice?.lang || "es-MX";
        u.rate = 1.0;
        u.pitch = 1.0;
        u.onend = resolve;
        u.onerror = resolve;
        window.speechSynthesis.speak(u);
      });
    }
  
    const wait = (ms) => new Promise(res => setTimeout(res, ms));
  
    function mostrar(view) {
      if (view === "suma") {
        menuView.classList.add("hidden");
        sumaView.classList.remove("hidden");
      } else {
        sumaView.classList.add("hidden");
        menuView.classList.remove("hidden");
      }
    }
  
    function elegirDosColores() {
      const idx1 = Math.floor(Math.random() * PALETA.length);
      let idx2 = Math.floor(Math.random() * PALETA.length);
      while (idx2 === idx1) idx2 = Math.floor(Math.random() * PALETA.length);
      return { A: PALETA[idx1], B: PALETA[idx2] };
    }
  
    function generarPar() {
      const a = Math.floor(Math.random() * (MAX_N + 1));
      const b = Math.floor(Math.random() * (MAX_N + 1));
      return { a, b };
    }
  
    // -------- Control de ejecución (abortables) --------
    let runId = 0;               // token global
    let current = null;          // datos del ejercicio actual (a, b, total, nodos)
    const isActive = (id) => id === runId;
    function abortRun() { runId++; cancelSpeech(); }
  
    // ---------- Colocación sin empalmes ----------
    function crearGrupoSinEmpalmes(cuantos, xMin, xMax, alto, colorHex, groupKey, obstacles = []) {
      const nodes = [];
      const maxTries = 500;

      for (let i = 0; i < cuantos; i++) {
        let placed = false;
        let tries = 0;

        while (!placed && tries < maxTries) {
          tries++;

          const x = Math.random() * (xMax - xMin - DIAM - PADDING * 2) + xMin + PADDING;
          const y = Math.random() * (alto - DIAM - PADDING * 2) + PADDING;

          const cx = x + R;
          const cy = y + R;

          // 1) No chocar con círculos ya puestos en este grupo
          let colision = false;
          for (const prev of nodes) {
            const pcx = parseFloat(prev.dataset.cx);
            const pcy = parseFloat(prev.dataset.cy);
            const dx = cx - pcx;
            const dy = cy - pcy;
            if (dx * dx + dy * dy < (MIN_DIST) * (MIN_DIST)) { colision = true; break; }
          }
          if (colision) continue;

          // 2) No chocar con obstáculos ( + y números )
          const candidate = { x, y, w: DIAM, h: DIAM };
          for (const ob of obstacles) {
            if (rectsIntersect(candidate, ob)) { colision = true; break; }
          }
          if (colision) continue;

          // OK: crear círculo
          const c = document.createElement("div");
          c.className = "circle spawn";
          c.style.background = colorHex;
          c.style.left = `${x}px`;
          c.style.top = `${y}px`;
          c.dataset.group = groupKey;
          c.dataset.cx = String(cx);
          c.dataset.cy = String(cy);
          scene.appendChild(c);
          nodes.push(c);
          placed = true;
        }
      }
      return nodes;
    }
  
    // Extras sin empalmes (ni con existentes ni entre sí)
    function crearExtrasNoEmpalme(cuantos, existingNodes) {
      const rect = scene.getBoundingClientRect();
      const ancho = rect.width;
      const alto = rect.height;
      const extras = [];
      const maxTries = 600;

      const ocupados = existingNodes.map(n => ({
        cx: parseFloat(n.dataset.cx),
        cy: parseFloat(n.dataset.cy),
      }));

      const obstacles = getObstacleRects(scene);

      for (let i = 0; i < cuantos; i++) {
        let placed = false;
        let tries = 0;

        while (!placed && tries < maxTries) {
          tries++;

          const x = Math.random() * (ancho - DIAM - PADDING * 2) + PADDING;
          const y = Math.random() * (alto  - DIAM - PADDING * 2) + PADDING;
          const cx = x + R;
          const cy = y + R;

          let colision = false;

          // contra existentes
          for (const p of ocupados) {
            const dx = cx - p.cx;
            const dy = cy - p.cy;
            if (dx * dx + dy * dy < (MIN_DIST) * (MIN_DIST)) { colision = true; break; }
          }
          if (colision) continue;

          // contra extras ya colocados
          for (const e of extras) {
            const dx = cx - parseFloat(e.dataset.cx);
            const dy = cy - parseFloat(e.dataset.cy);
            if (dx * dx + dy * dy < (MIN_DIST) * (MIN_DIST)) { colision = true; break; }
          }
          if (colision) continue;

          // contra obstáculos (+ y números)
          const candidate = { x, y, w: DIAM, h: DIAM };
          for (const ob of obstacles) {
            if (rectsIntersect(candidate, ob)) { colision = true; break; }
          }
          if (colision) continue;

          const c = document.createElement("div");
          c.className = "circle extra spawn";
          c.style.left = `${x}px`;
          c.style.top = `${y}px`;
          c.dataset.cx = String(cx);
          c.dataset.cy = String(cy);
          scene.appendChild(c);
          extras.push(c);
          placed = true;
        }
      }
      return extras;
    }
  
    function dibujarCirculos({ a, b }, colores) {
      if (!scene) return { nodesA: [], nodesB: [] };

      // Elimina solo círculos previos
      scene.querySelectorAll(".circle, .extra").forEach(el => el.remove());

      const rect = scene.getBoundingClientRect();
      const ancho = rect.width;
      const alto = rect.height;
      const mitad = ancho / 2;

      // zonas prohibidas: + central y números de las esquinas
      const obstacles = getObstacleRects(scene);

      const nodesA = crearGrupoSinEmpalmes(a, 0, mitad, alto, colores.A.hex, "A", obstacles);
      const nodesB = crearGrupoSinEmpalmes(b, mitad, ancho, alto, colores.B.hex, "B", obstacles);

      countLeftEl.textContent = String(a);
      countRightEl.textContent = String(b);
      countLeftEl.style.color = colores.A.hex;
      countRightEl.style.color = colores.B.hex;

      return { nodesA, nodesB };
    }
  
    // Frases y números
    function fraseHay(lado, n, color) {
      if (n === 1) return `A la ${lado} hay un círculo ${color.sing}.`;
      return `A la ${lado} hay ${n} círculos ${color.plural}.`;
    }
  
    const NUMS = [
      "cero","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve",
      "diez","once","doce","trece","catorce","quince","dieciséis","diecisiete","dieciocho"
    ];
    const nWord = (n) => NUMS[n] ?? String(n);
  
    // ----- Utilidades de coloreo sincronizado con voz -----
    async function hablarConPulso(nodes, texto, id) {
      if (!isActive(id)) return;
      nodes.forEach(el => el.classList.add("counting"));
      await speak(texto);
      if (!isActive(id)) return;
      nodes.forEach(el => el.classList.remove("counting"));
    }
  
    async function conteoSecuencial(nodes, etiquetaPlural, id) {
      if (!isActive(id)) return;
      if (nodes.length === 0) {
        await speak(`Contemos los ${etiquetaPlural}: cero.`);
        return;
      }
      await speak(`Contemos los ${etiquetaPlural}.`);
      for (let i = 0; i < nodes.length; i++) {
        if (!isActive(id)) return;
        const el = nodes[i];
        el.classList.add("counting");
        el.classList.add("highlight");
        await speak(nWord(i + 1)); // mantiene color mientras habla
        if (!isActive(id)) return;
        el.classList.remove("highlight");
        await wait(BETWEEN_MS);
      }
      if (!isActive(id)) return;
      nodes.forEach(el => el.classList.remove("counting"));
    }
  
    async function recuentoTotalAcumulado(nodesAll, id) {
      for (let i = 0; i < nodesAll.length; i++) {
        if (!isActive(id)) return;
        const el = nodesAll[i];
        el.classList.add("counting", "highlight");
        await speak(nWord(i + 1));
        if (!isActive(id)) return;
        el.classList.remove("highlight");
        await wait(BETWEEN_MS);
      }
      if (!isActive(id)) return;
      nodesAll.forEach(el => el.classList.remove("counting"));
    }

    // Color aleatorio para celebrar (evita los colores de A y B)
    function randomCelebrationColor(exclude = []) {
    const opciones = PALETA.map(p => p.hex).filter(h => !exclude.includes(h));
    if (opciones.length === 0) opciones.push("#22c55e");
    return opciones[Math.floor(Math.random() * opciones.length)];
    }
  
    // Cambia TODOS los círculos al color de celebración
    function celebrarCorrecto(nodesAll, colores) {
    const color = randomCelebrationColor([colores.A.hex, colores.B.hex]);
    nodesAll.forEach(el => {
      el.classList.remove("counting", "highlight", "ghost");
      el.style.background = color;          // inline style > clases
        });
    }
  
  
    // ----- Lección -----
    let ejercicioIdx = 0; // 0..4 (0 es ejemplo)
    let phase = "idle";   // "idle" | "example" | "asking" | "evaluating" | "transition"
    let savedLesson = null; // guardará estado al entrar al ejemplo ad hoc
    const SKIP_DEFAULT_TEXT = btnSkipExample?.textContent || "Omitir ejemplo";

  
    function setPanelForExample(a, b, total) {
      phase = "example";
      lessonLabelEl.textContent = `Ejercicio ${ejercicioIdx + 1}/5 (Ejemplo)`;
      opAEl.textContent = a;
      opBEl.textContent = b;

      answerEl.value = "";
      answerEl.disabled = true;
      answerEl.classList.add("hidden");
      resultBigEl.textContent = "";
      resultBigEl.classList.add("hidden");

      btnSkipExample.classList.remove("hidden");
      btnCheck.classList.add("hidden");
      btnNext.classList.add("hidden");
      btnMenu.classList.remove("hidden");
      msgEl.textContent = "";

      // por si acaso, que se puedan usar en ejemplo
      btnSkipExample.disabled = false;
      btnMenu.disabled = false;

      btnExampleToggle?.classList.add("hidden");
    }

    function setPanelForQuestion(a, b) {
      phase = "asking";
      lessonLabelEl.textContent = `Ejercicio ${ejercicioIdx + 1}/5`;
      opAEl.textContent = a;
      opBEl.textContent = b;

      resultBigEl.textContent = "";
      resultBigEl.classList.add("hidden");
      answerEl.value = "";
      answerEl.disabled = false;
      answerEl.classList.remove("hidden");
      answerEl.focus();

      btnCheck.disabled = false;

      btnSkipExample.classList.add("hidden");
      btnCheck.classList.remove("hidden");
      btnNext.classList.add("hidden");
      btnMenu.classList.remove("hidden");
      msgEl.textContent = "";

      btnExampleToggle?.classList.remove("hidden");
      if (btnExampleToggle) btnExampleToggle.textContent = "Ver ejemplo";

      // Asegura etiqueta correcta del botón cuando vuelves a la lección
      btnSkipExample.textContent = SKIP_DEFAULT_TEXT;
    }
  
    function limpiarErroresVisuales() {
      scene.querySelectorAll(".ghost").forEach(el => el.classList.remove("ghost"));
      scene.querySelectorAll(".extra").forEach(el => el.remove());
    }
  
    function marcarFantasmas(nodesPool, cuantos) {
      const pool = nodesPool.slice();
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      for (let k = 0; k < cuantos && k < pool.length; k++) {
        pool[k].classList.add("ghost");
      }
    }
  
    // Sanitiza la respuesta a 0..18 y enteros
    function sanitizeAnswer() {
      let v = answerEl.value.trim();
      if (v === "") return;
      let n = Math.floor(Number(v));
      if (Number.isNaN(n)) { answerEl.value = ""; return; }
      if (n < 0) n = 0;
      if (n > 18) n = 18;
      if (String(n) !== v) answerEl.value = String(n);
    }
    answerEl.addEventListener("input", sanitizeAnswer);
  
    // --- Handlers globales para que funcionen desde el primer segundo ---
    function onSkipExample() {
      // Si venimos de un ejemplo ad-hoc, este botón funciona como "Volver a la lección"
      if (savedLesson) { exitAdHocExample(); return; }

      // Comportamiento normal: omitir el ejemplo inicial
      if (ejercicioIdx === 0) {
        abortRun();
        ejercicioIdx = 1;
        correrEjercicio();
      }
    }
    function onMenu() {
      abortRun();            // corta voz/animaciones actuales
      ejercicioIdx = 0;
      mostrar("menu");
      msgEl.textContent = "";
    }

    function enterAdHocExampleRandom() {
      if (!current) return; // aún no hay ejercicio cargado

      // Guarda lo necesario para restaurar luego
      savedLesson = {
        ejercicioIdx,
        answerValue: answerEl.value,
        datos: { a: current.a, b: current.b, total: current.total, colores: current.colores }
      };

      abortRun();         // corta voz/animaciones en curso
      phase = "example";  // bloquea interacción de ejercicio

      // UI: convierto "Omitir ejemplo" -> "Volver a la lección"
      btnSkipExample.textContent = "Volver a la lección";
      btnSkipExample.classList.remove("hidden");
      btnSkipExample.disabled = false;

      // Oculto controles del ejercicio mientras estoy en ejemplo
      btnCheck.classList.add("hidden");
      btnNext.classList.add("hidden");
      answerEl.disabled = true;

      // --- Generar EJEMPLO ALEATORIO como el inicial (evitando 0+0) ---
      const colores = elegirDosColores();
      let { a, b } = generarPar();
      let guard = 0;
      while (a === 0 && b === 0 && guard < 50) { ({ a, b } = generarPar()); guard++; }
      const total = a + b;

      setPanelForExample(a, b, total); // prepara panel de ejemplo

      const myRun = ++runId;
      const { nodesA, nodesB } = dibujarCirculos({ a, b }, colores);
      const nodesAll = [...nodesA, ...nodesB];

      // Misma secuencia que tu ejemplo inicial
      (async () => {
        await speak(fraseHay("izquierda", a, colores.A)); if (!isActive(myRun)) return;
        await speak(fraseHay("derecha", b, colores.B));   if (!isActive(myRun)) return;

        await conteoSecuencial(nodesA, colores.A.plural, myRun); if (!isActive(myRun)) return;
        await conteoSecuencial(nodesB, colores.B.plural, myRun); if (!isActive(myRun)) return;

        await speak("Entonces,"); if (!isActive(myRun)) return;
        await hablarConPulso(nodesA, nWord(a), myRun);            if (!isActive(myRun)) return;
        await hablarConPulso(nodesB, `más ${nWord(b)}`, myRun);   if (!isActive(myRun)) return;
        await hablarConPulso(nodesAll, `es ${nWord(total)}`, myRun); if (!isActive(myRun)) return;

        resultBigEl.textContent = String(total);
        resultBigEl.classList.remove("hidden");

        await recuentoTotalAcumulado(nodesAll, myRun); if (!isActive(myRun)) return;

        msgEl.textContent = "Toca “Volver a la lección” para continuar.";
      })();
    }

    function exitAdHocExample() {
      if (!savedLesson) return;

      abortRun(); // corta cualquier locución del ejemplo
      const { ejercicioIdx: idx, answerValue, datos } = savedLesson;
      savedLesson = null;

      // Restaurar índice y reconstruir el ejercicio en curso
      ejercicioIdx = idx;
      phase = "transition";

      // Volver a etiquetar el botón como "Omitir ejemplo"
      btnSkipExample.textContent = SKIP_DEFAULT_TEXT;

      // Redibuja con los mismos números y colores del ejercicio original
      const myRun = ++runId;
      const { a, b, colores } = datos;
      const { nodesA, nodesB } = dibujarCirculos({ a, b }, colores);
      const nodesAll = [...nodesA, ...nodesB];
      current = { a, b, total: a + b, nodesA, nodesB, nodesAll, colores, run: myRun };

      // Restaura el panel de pregunta
      setPanelForQuestion(a, b);
      answerEl.value = answerValue || "";
      answerEl.disabled = false;

      // Mostrar controles y volver a permitir responder
      btnCheck.classList.remove("hidden");
      btnNext.classList.add("hidden");
      phase = "asking";
      msgEl.textContent = "Continuemos.";
      btnCheck.disabled = false;      // asegúrate de habilitarlo
      attachCheckHandlers(myRun);     // ¡reconectar handlers para este myRun!
    }

    // Registrar una sola vez
    btnSkipExample.addEventListener("click", onSkipExample);
    btnMenu.addEventListener("click", onMenu);

    // --- Zonas prohibidas (obstáculos) ---
    function rectsIntersect(a, b) {
      return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
    }

    function rectFromEl(el, sceneRect, inflate = 0) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const relX = r.left - sceneRect.left;
      const relY = r.top  - sceneRect.top;
      return {
        x: relX - inflate,
        y: relY - inflate,
        w: r.width  + inflate * 2,
        h: r.height + inflate * 2,
      };
    }

    function getObstacleRects(scene) {
      const sceneRect = scene.getBoundingClientRect();
      const plusEl  = document.getElementById("big-plus");     // signo +
      const leftEl  = document.getElementById("count-left");   // número izq
      const rightEl = document.getElementById("count-right");  // número der

      const obstacles = [];
      const plusRect  = rectFromEl(plusEl,  sceneRect, 16); // margen generoso
      const leftRect  = rectFromEl(leftEl,  sceneRect, 8);
      const rightRect = rectFromEl(rightEl, sceneRect, 8);

      if (plusRect)  obstacles.push(plusRect);
      if (leftRect)  obstacles.push(leftRect);
      if (rightRect) obstacles.push(rightRect);

      return obstacles;
    }

    btnExampleToggle?.addEventListener("click", () => {
      // Abre un ejemplo aleatorio, no el del ejercicio actual
      enterAdHocExampleRandom();
    });

    function attachCheckHandlers(myRun) {
      const onCheck = async () => {
        if (!current || current.run !== myRun) return;

        // Solo aceptamos clicks cuando estamos esperando respuesta
        if (phase !== "asking") return;

        // Bloqueo inmediato para evitar spam mientras evaluamos
        phase = "evaluating";
        btnCheck.disabled = true;
        answerEl.disabled = true;

        limpiarErroresVisuales();
        sanitizeAnswer();

        const raw = answerEl.value.trim();
        const val = Number(raw);
        if (raw === "" || Number.isNaN(val)) {
          msgEl.textContent = "Escribe un número de 0 a 18.";
          // Volver a permitir responder
          answerEl.disabled = false;
          phase = "asking";
          btnCheck.disabled = false;
          return;
        }

        if (val === current.total) {
          // ✅ Correcto
          msgEl.textContent = "¡Correcto!";
          cancelSpeech();
          celebrarCorrecto(current.nodesAll, current.colores);
          await speak("Correcto.");

          // Entramos en transición: cualquier click posterior se ignora
          phase = "transition";

          if (ejercicioIdx < 4) {
            ejercicioIdx += 1;
            setTimeout(() => { abortRun(); correrEjercicio(); }, NEXT_DELAY_MS);
          } else {
            msgEl.textContent = "¡Lección terminada!";
            btnNext.classList.add("hidden");
            btnCheck.classList.add("hidden");
          }
        } else {
          // ❌ Incorrecto: feedback y reintento
          if (val > current.total) {
            const diff = val - current.total;
            crearExtrasNoEmpalme(diff, current.nodesAll);
            msgEl.textContent = `Te pasaste por ${diff}.`;
            cancelSpeech();
            await speak(`Te pasaste por ${diff}.`);
          } else {
            const diff = current.total - val;
            marcarFantasmas(current.nodesAll, diff);
            msgEl.textContent = `Faltan ${diff}.`;
            cancelSpeech();
            await speak(`Te faltan ${diff}.`);
          }
          answerEl.disabled = false;
          phase = "asking";
          btnCheck.disabled = false;
        }
      };

      // Conexión de handlers (sobrescribe cualquier anterior)
      btnCheck.onclick = onCheck;
      answerEl.onkeydown = (e) => {
        if (e.key === "Enter") {
          if (btnCheck.disabled || phase !== "asking") { e.preventDefault(); return; }
          onCheck();
        }
      };
    }

    async function correrEjercicio() {
      limpiarErroresVisuales();
  
      const myRun = ++runId;
  
      const colores = elegirDosColores();
  
      // --- generar par ---
      let { a, b } = generarPar();
      // En el EJEMPLO, no permitir 0 + 0
      if (ejercicioIdx === 0) {
        let guard = 0;
        while (a === 0 && b === 0 && guard < 50) {
          ({ a, b } = generarPar());
          guard++;
        }
      }
  
      const { nodesA, nodesB } = dibujarCirculos({ a, b }, colores);
      const nodesAll = [...nodesA, ...nodesB];
      const total = a + b;
  
      current = { a, b, total, nodesA, nodesB, nodesAll, colores, run: myRun };
  
      if (ejercicioIdx === 0) {
        // -------- EJEMPLO --------
        setPanelForExample(a, b, total);
  
        await speak(fraseHay("izquierda", a, colores.A));
        if (!isActive(myRun)) return;
        await speak(fraseHay("derecha", b, colores.B));
        if (!isActive(myRun)) return;
  
        await conteoSecuencial(nodesA, colores.A.plural, myRun);
        if (!isActive(myRun)) return;
        await conteoSecuencial(nodesB, colores.B.plural, myRun);
        if (!isActive(myRun)) return;
  
        // Palabra previa para marcar nueva frase
        await speak("Entonces,");
        if (!isActive(myRun)) return;

        await hablarConPulso(nodesA, nWord(a), myRun);
        if (!isActive(myRun)) return;

        await hablarConPulso(nodesB, `más ${nWord(b)}`, myRun);
        if (!isActive(myRun)) return;
  
        // "es total" (todos) → aquí se revela el resultado en grande
        await hablarConPulso(nodesAll, `es ${nWord(total)}`, myRun);
        if (!isActive(myRun)) return;
        resultBigEl.textContent = String(total);
        resultBigEl.classList.remove("hidden");
  
        // Recuento total 1..total con acumulado
        await recuentoTotalAcumulado(nodesAll, myRun);
        if (!isActive(myRun)) return;
  
        btnNext.classList.remove("hidden");
        msgEl.textContent = "Cuando estés listo, pasa al siguiente ejercicio.";
      } else {
        // -------- EJERCICIO NORMAL --------
        setPanelForQuestion(a, b);

        // Pregunta con pulsos SOLO mientras pronuncia los números
        await speak("¿Cuánto es");
        if (!isActive(myRun)) return;

        await hablarConPulso(nodesA, nWord(a), myRun);
        if (!isActive(myRun)) return;

        await speak("más");
        if (!isActive(myRun)) return;

        await hablarConPulso(nodesB, nWord(b), myRun);
        if (!isActive(myRun)) return;

        if (!isActive(myRun)) return;
        nodesB.forEach(el => el.classList.add("counting"));
        await wait(PULSE_MS);
        nodesB.forEach(el => el.classList.remove("counting"));
        if (!isActive(myRun)) return;

        // ⬇️ Conecta handlers correctos para ESTE myRun
        attachCheckHandlers(myRun);
      }

  
      btnNext.onclick = () => {
        if (ejercicioIdx === 0) {
          abortRun();
          ejercicioIdx = 1;
          correrEjercicio();
        } else if (ejercicioIdx < 4) {
          abortRun();
          ejercicioIdx += 1;
          correrEjercicio();
        }
      };
    }
  
    // Entrada a la vista de suma
    goSumaBtn?.addEventListener("click", async () => {
      mostrar("suma");
      ejercicioIdx = 0;
      await correrEjercicio();
    });
  });
  
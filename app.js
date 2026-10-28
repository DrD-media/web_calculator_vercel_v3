/**
 * Управление интерфейсом и визуализацией веб-калькулятора системной динамики
 */

let model = new SimulationModel();
let currentResults = null;
let pertChartInstance = null;
let dynChartInstance = null;
let radarChartInstance = null;

// Цветовые палитры
const PALETTE_28 = [
  "#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", "#98df8a",
  "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b", "#c49c94",
  "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d",
  "#17becf", "#9edae5", "#393b79", "#5254a3", "#6b6ecf", "#9c9ede",
  "#637939", "#8ca252", "#b5cf6b", "#cedb9c"
];

const PERT_COLORS = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"];

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
// ============================================================================
function startApp() {
  try {
    if (!model && typeof SimulationModel !== "undefined") {
      model = new SimulationModel();
    }
    setupTabs();
    initTableU0();
    initEquationsList();
    initPerturbationControls();
    initDynamicsControls();
    initRadarControls();
    initCorrespondenceTable();
    initExportHandlers();

    // Первый автоматический запуск
    runSimulation();
  } catch (err) {
    console.error("App startup error:", err);
    const banner = document.getElementById("runtimeErrorBanner");
    if (banner) {
      banner.style.display = "block";
      banner.textContent = "Ошибка при запуске калькулятора: " + err.message + "\n" + (err.stack || "");
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApp);
} else {
  startApp();
}

// ============================================================================
// НАВИГАЦИЯ ПО ВКЛАДКАМ
// ============================================================================
function openTab(targetId) {
  const buttons = document.querySelectorAll(".app-tabs .tab-btn");
  buttons.forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-tab") === targetId);
  });
  document.querySelectorAll(".tab-pane").forEach(p => {
    p.classList.toggle("active", p.id === targetId);
  });
  if (targetId === "tab-pert" && pertChartInstance) pertChartInstance.resize();
  if (targetId === "tab-dynamics" && dynChartInstance) dynChartInstance.resize();
  if (targetId === "tab-radar" && radarChartInstance) radarChartInstance.resize();
}

function setupTabs() {
  const buttons = document.querySelectorAll(".app-tabs .tab-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      openTab(btn.getAttribute("data-tab"));
    });
  });

  // Быстрые кнопки перехода из блока Управление
  document.querySelectorAll(".btn-nav-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      if (target) openTab(target);
    });
  });
}

// ============================================================================
// ВКЛАДКА 1: НАЧАЛЬНЫЕ УСЛОВИЯ u0, ПРЕДЕЛЫ ДОПУСКА И УРАВНЕНИЯ F_k(x)
// ============================================================================
function initTableU0() {
  const tbody = document.getElementById("tbodyU0");
  tbody.innerHTML = "";

  CHARACTERISTICS.forEach((ch, idx) => {
    const tr = document.createElement("tr");
    if (ch.is_quality) tr.classList.add("row-quality");

    const roleDesc = ch.is_quality ? "Критерий качества" : "Фактор дефекта";
    const defLimit = ch.is_quality ? 0.75 : 0.25;
    const limitReq = ch.is_quality ? `≥ ${defLimit.toFixed(2)}` : `≤ ${defLimit.toFixed(2)}`;

    tr.innerHTML = `
      <td><strong>${ch.var_name}</strong></td>
      <td>${ch.iso_node}</td>
      <td>${ch.name}</td>
      <td><span class="${ch.is_quality ? 'badge-qual' : 'badge-def'}">${roleDesc} (${limitReq})</span></td>
      <td>
        <input type="number" class="u0-input" id="u0_input_${idx}" 
               min="0" max="1" step="0.05" value="${ch.default_u0.toFixed(2)}">
      </td>
      <td>
        <input type="number" class="ulim-input" id="ulim_input_${idx}" 
               min="0" max="1" step="0.05" value="${defLimit.toFixed(2)}">
      </td>
    `;
    tbody.appendChild(tr);

    // Слушатель изменения предела для перерисовки радара
    tr.querySelector(`#ulim_input_${idx}`).addEventListener("input", () => {
      if (radarChartInstance) renderRadarChart();
    });
  });

  document.getElementById("btnRandU0").addEventListener("click", () => {
    CHARACTERISTICS.forEach((ch, idx) => {
      const input = document.getElementById(`u0_input_${idx}`);
      if (ch.is_quality) {
        input.value = (0.60 + Math.random() * 0.35).toFixed(2);
      } else {
        input.value = (0.15 + Math.random() * 0.40).toFixed(2);
      }
    });
  });

  document.getElementById("btnResetU0").addEventListener("click", () => {
    CHARACTERISTICS.forEach((ch, idx) => {
      const input = document.getElementById(`u0_input_${idx}`);
      input.value = ch.default_u0.toFixed(2);
    });
  });

  document.getElementById("btnHalfU0").addEventListener("click", () => {
    CHARACTERISTICS.forEach((ch, idx) => {
      const input = document.getElementById(`u0_input_${idx}`);
      input.value = "0.50";
    });
  });

  // Пакетное задание пределов для всех характеристик
  document.getElementById("btnApplyBatchLimits").addEventListener("click", () => {
    const qVal = parseFloat(document.getElementById("batchLimitQuality").value) || 0.75;
    const dVal = parseFloat(document.getElementById("batchLimitDefects").value) || 0.25;
    CHARACTERISTICS.forEach((ch, idx) => {
      const inp = document.getElementById(`ulim_input_${idx}`);
      if (inp) inp.value = (ch.is_quality ? qVal : dVal).toFixed(2);
    });
    if (radarChartInstance) renderRadarChart();
  });

  // Пресет шага 0.25
  document.getElementById("btnPresetStep25").addEventListener("click", () => {
    document.getElementById("batchLimitQuality").value = "0.75";
    document.getElementById("batchLimitDefects").value = "0.25";
    CHARACTERISTICS.forEach((ch, idx) => {
      const inp = document.getElementById(`ulim_input_${idx}`);
      if (inp) inp.value = (ch.is_quality ? 0.75 : 0.25).toFixed(2);
    });
    if (radarChartInstance) renderRadarChart();
  });

  document.getElementById("btnRunSim").addEventListener("click", () => runSimulation(true));
}

// Множество ID функций, отредактированных пользователем вручную
const userEditedFunctions = new Set();

function markFunctionAsCustom(f_id, isCustom = true) {
  if (isCustom) {
    userEditedFunctions.add(f_id);
  } else {
    userEditedFunctions.delete(f_id);
  }
  updateRowCustomState(f_id);
}

function updateRowCustomState(f_id) {
  const row = document.getElementById(`eq_row_${f_id}`);
  const badge = document.getElementById(`badge_custom_${f_id}`);
  const isCustom = userEditedFunctions.has(f_id);
  if (row) {
    if (isCustom) {
      row.classList.add("is-custom");
    } else {
      row.classList.remove("is-custom");
    }
  }
  if (badge) {
    badge.style.display = isCustom ? "inline-flex" : "none";
  }
}

window.resetSingleCustomFlag = function(f_id) {
  markFunctionAsCustom(f_id, false);
  showToast(`Снята отметка ручного ввода для F${f_id}. Теперь она будет обновляться случайно.`, "info");
};

// Модальное окно подтверждения выбора перезаписи
function openConfirmModal({ title, bodyHtml, options }) {
  const modal = document.getElementById("randomizeModal");
  if (!modal) return;

  const titleEl = document.getElementById("modalTitle");
  const bodyEl = document.getElementById("modalBody");
  const actionsEl = document.getElementById("modalActions");

  if (titleEl) titleEl.innerHTML = title;
  if (bodyEl) bodyEl.innerHTML = bodyHtml;
  if (actionsEl) {
    actionsEl.innerHTML = "";
    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `modal-btn-option ${opt.className || ''}`;
      btn.innerHTML = `
        <div>
          <span>${opt.text}</span>
          ${opt.sub ? `<span class="sub">${opt.sub}</span>` : ''}
        </div>
      `;
      btn.addEventListener("click", () => {
        closeConfirmModal();
        if (opt.action) opt.action();
      });
      actionsEl.appendChild(btn);
    });
  }

  const closeBtn = document.getElementById("modalCloseBtn");
  if (closeBtn) closeBtn.onclick = closeConfirmModal;

  modal.onclick = (e) => {
    if (e.target === modal) closeConfirmModal();
  };

  modal.style.display = "flex";
}

function closeConfirmModal() {
  const modal = document.getElementById("randomizeModal");
  if (modal) modal.style.display = "none";
}

// Модальное окно подробных результатов расчета
function openSimResultModal(u0, results) {
  const modal = document.getElementById("simResultModal");
  const body = document.getElementById("simResultModalBody");
  if (!modal || !body || !results) return;

  const u1_start = u0[0];
  const u1_end = results.u[0][100];
  const diff1 = u1_end - u1_start;
  const pct1 = u1_start !== 0 ? ((diff1 / u1_start) * 100) : 0;
  const diffStr = (diff1 >= 0 ? "+" : "") + diff1.toFixed(3);
  const pctStr = (pct1 >= 0 ? "+" : "") + pct1.toFixed(1) + "%";
  const trendClass = diff1 >= 0 ? "trend-up" : "trend-down";

  // Оценка изменения
  let verdictHtml = "";
  if (diff1 > 0.02) {
    verdictHtml = `<span style="color:#16a34a;">🟢 Положительная динамика:</span> Интегральный показатель сопровождаемости вырос на <strong>${pctStr}</strong> (с ${u1_start.toFixed(2)} до ${u1_end.toFixed(2)}). Система демонстрирует устойчивость и надежность при текущем профиле возмущений.`;
  } else if (diff1 < -0.02) {
    verdictHtml = `<span style="color:#dc2626;">🔴 Негативная динамика:</span> Интегральный показатель сопровождаемости снизился на <strong>${Math.abs(pct1).toFixed(1)}%</strong> (с ${u1_start.toFixed(2)} до ${u1_end.toFixed(2)}). Накопление дефектов превосходит компенсационный потенциал.`;
  } else {
    verdictHtml = `<span style="color:#d97706;">🟡 Квазистационарный баланс:</span> Показатель сопровождаемости практически стабилен (${pctStr}, с ${u1_start.toFixed(2)} до ${u1_end.toFixed(2)}), система находится в точке динамического равновесия.`;
  }

  // Подсчет выполнения условий допусков на финальном срезе t = 1.00
  let qualPass = 0, qualTotal = 0;
  let defPass = 0, defTotal = 0;
  for (let i = 0; i < 28; i++) {
    const ch = CHARACTERISTICS[i];
    const v1 = results.u[i][100];
    const lim = parseFloat(document.getElementById(`ulim_input_${i}`)?.value) || (ch.is_quality ? 0.75 : 0.25);
    if (ch.is_quality) {
      qualTotal++;
      if (v1 >= lim) qualPass++;
    } else {
      defTotal++;
      if (v1 <= lim) defPass++;
    }
  }

  // Сводка по 6 характеристикам качества верхнего уровня (u1..u6)
  let tableRows = "";
  for (let i = 0; i < 6; i++) {
    const ch = CHARACTERISTICS[i];
    const v0 = u0[i];
    const v1 = results.u[i][100];
    const d = v1 - v0;
    const dStr = (d >= 0 ? "+" : "") + d.toFixed(2);
    const lim = parseFloat(document.getElementById(`ulim_input_${i}`)?.value) || 0.75;
    const isOk = v1 >= lim;
    const statusBadge = isOk
      ? `<span class="badge-qual" style="background:#dcfce7; color:#166534; font-size:11px;">✓ Норма (≥ ${lim.toFixed(2)})</span>`
      : `<span class="badge-def" style="background:#fee2e2; color:#b91c1c; font-size:11px;">⚠️ Ниже нормы (${v1.toFixed(2)} < ${lim.toFixed(2)})</span>`;

    tableRows += `
      <tr>
        <td><strong>${ch.var_name}</strong> <span style="color:#64748b; font-size:11px;">(${ch.iso_node})</span></td>
        <td>${ch.name}</td>
        <td style="text-align:center;">${v0.toFixed(2)}</td>
        <td style="text-align:center; font-weight:700;">${v1.toFixed(2)}</td>
        <td style="text-align:center; font-weight:600; color:${d >= 0 ? '#16a34a' : '#dc2626'};">${dStr}</td>
        <td style="text-align:center; font-weight:600; color:#b91c1c;">${lim.toFixed(2)}</td>
        <td style="text-align:center;">${statusBadge}</td>
      </tr>
    `;
  }

  body.innerHTML = `
    <!-- Карточка целевого показателя -->
    <div class="res-kpi-card">
      <div class="res-kpi-header">
        <span>Целевой показатель модели: u₁ — Сопровождаемость (вершина U5)</span>
        <span style="font-size: 11px; font-weight: 500; color: #64748b;">Метод: RK4 (Рунге-Кутта 4-го порядка, N=100)</span>
      </div>
      <div class="res-metrics-grid">
        <div class="res-metric-cell">
          <span class="res-m-label">Начальное u₁(0)</span>
          <span class="res-m-val">${u1_start.toFixed(2)}</span>
        </div>
        <div class="res-metric-cell">
          <span class="res-m-label">Финальное u₁(1.00)</span>
          <span class="res-m-val">${u1_end.toFixed(2)}</span>
        </div>
        <div class="res-metric-cell">
          <span class="res-m-label">Абсолютный сдвиг Δu₁</span>
          <span class="res-m-val ${trendClass}">${diffStr}</span>
        </div>
        <div class="res-metric-cell">
          <span class="res-m-label">Относительный рост</span>
          <span class="res-m-val ${trendClass}">${pctStr}</span>
        </div>
      </div>
      <div class="res-verdict-box">
        ${verdictHtml}
      </div>
    </div>

    <!-- Сводка соблюдения допусков -->
    <div class="res-compliance-summary">
      <div class="res-comp-pill quality">
        <div style="font-weight:700; margin-bottom:2px;">Критерии качества (u₁..u₆)</div>
        <div>Соответствуют допуску: <strong>${qualPass} из ${qualTotal}</strong> (условие uᵢ ≥ u_lim)</div>
      </div>
      <div class="res-comp-pill defects">
        <div style="font-weight:700; margin-bottom:2px;">Факторы дефектов (u₇..u₂₈)</div>
        <div>В пределах нормы: <strong>${defPass} из ${defTotal}</strong> (условие uᵢ ≤ u_lim)</div>
      </div>
    </div>

    <!-- Сводная таблица по характеристикам верхнего уровня -->
    <div style="font-weight:700; font-size:12.5px; color:#1e293b; margin-bottom:6px;">
      Динамика характеристик качества верхнего уровня (u₁..u₆):
    </div>
    <div class="res-table-wrap">
      <table class="res-table">
        <thead>
          <tr>
            <th>Переменная</th>
            <th>Наименование</th>
            <th style="text-align:center;">u(0)</th>
            <th style="text-align:center;">u(1.00)</th>
            <th style="text-align:center;">Δu</th>
            <th style="text-align:center;">Предел</th>
            <th style="text-align:center;">Статус</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;

  // Подключение кнопок модального окна
  const closeBtn = document.getElementById("simResultCloseBtn");
  const bottomCloseBtn = document.getElementById("btnResClose");
  if (closeBtn) closeBtn.onclick = closeSimResultModal;
  if (bottomCloseBtn) bottomCloseBtn.onclick = closeSimResultModal;

  const btnDyn = document.getElementById("btnResNavDyn");
  const btnRadar = document.getElementById("btnResNavRadar");
  const btnPert = document.getElementById("btnResNavPert");

  if (btnDyn) {
    btnDyn.onclick = () => {
      closeSimResultModal();
      openTab("tab-dynamics");
    };
  }
  if (btnRadar) {
    btnRadar.onclick = () => {
      closeSimResultModal();
      openTab("tab-radar");
    };
  }
  if (btnPert) {
    btnPert.onclick = () => {
      closeSimResultModal();
      openTab("tab-pert");
    };
  }

  modal.onclick = (e) => {
    if (e.target === modal) closeSimResultModal();
  };

  modal.style.display = "flex";
}

function closeSimResultModal() {
  const modal = document.getElementById("simResultModal");
  if (modal) modal.style.display = "none";
}

// Закрытие модальных окон по Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeConfirmModal();
    closeSimResultModal();
  }
});

// Всплывающие уведомления (toasts)
function showToast(message, type = "info", duration = 3500) {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}

// ----------------------------------------------------------------------------
// СПИСОК ВСЕХ 187 УРАВНЕНИЙ СВЯЗИ F_k(x) (ПО СКРИНШОТУ ПРЕПОДАВАТЕЛЯ)
// ----------------------------------------------------------------------------
function initEquationsList() {
  const container = document.getElementById("equationsList");
  if (!container) return;
  container.innerHTML = "";

  for (let f_id = 1; f_id <= 187; f_id++) {
    const func = model.functions[f_id];
    const chArg = CHARACTERISTICS[func.arg_u - 1];

    const row = document.createElement("div");
    row.className = "eq-row";
    row.id = `eq_row_${f_id}`;

    row.innerHTML = `
      <div class="eq-row-top">
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <span class="eq-f-label">F <strong>${f_id}</strong></span>
          <span class="eq-arg-desc">(аргумент u${func.arg_u} / ${chArg.iso_node}: ${chArg.short_name})</span>
          <span class="badge-custom-func" id="badge_custom_${f_id}" style="display: none;" title="Коэффициенты этой функции заданы вручную">
            Введено вручную
            <button type="button" class="badge-custom-reset-btn" title="Снять отметку ручного ввода" onclick="resetSingleCustomFlag(${f_id})">&times;</button>
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <label style="font-size: 11px; color: #475569;">Степень:</label>
          <select class="eq-deg-select" id="eq_deg_${f_id}">
            <option value="1" ${func.degree === 1 ? 'selected' : ''}>1: c·x + d (лин)</option>
            <option value="2" ${func.degree === 2 ? 'selected' : ''}>2: b·x² + c·x + d (кв)</option>
            <option value="3" ${func.degree === 3 ? 'selected' : ''}>3: a·x³ + b·x² + c·x + d (куб)</option>
          </select>
        </div>
      </div>
      <div class="eq-row-body">
        <span class="eq-f-title">F ${f_id} (x) = </span>
        <span class="eq-term-span" id="term_a_${f_id}" style="display: ${func.degree === 3 ? 'inline-flex' : 'none'};">
          <input type="number" step="0.05" class="eq-coeff-num" id="coeff_a_${f_id}" value="${func.a.toFixed(2)}">
          <span class="eq-term-str">*x³ +</span>
        </span>
        <span class="eq-term-span" id="term_b_${f_id}" style="display: ${func.degree >= 2 ? 'inline-flex' : 'none'};">
          <input type="number" step="0.05" class="eq-coeff-num" id="coeff_b_${f_id}" value="${func.b.toFixed(2)}">
          <span class="eq-term-str">*x² +</span>
        </span>
        <span class="eq-term-span" id="term_c_${f_id}">
          <input type="number" step="0.05" class="eq-coeff-num" id="coeff_c_${f_id}" value="${func.c.toFixed(2)}">
          <span class="eq-term-str">*x +</span>
        </span>
        <span class="eq-term-span" id="term_d_${f_id}">
          <input type="number" step="0.05" class="eq-coeff-num" id="coeff_d_${f_id}" value="${func.d.toFixed(2)}">
        </span>
      </div>
    `;
    container.appendChild(row);

    // Обработчик изменения степени полинома (фиксирует ручной ввод)
    row.querySelector(`#eq_deg_${f_id}`).addEventListener("change", (e) => {
      const deg = parseInt(e.target.value);
      func.degree = deg;
      document.getElementById(`term_a_${f_id}`).style.display = deg === 3 ? "inline-flex" : "none";
      document.getElementById(`term_b_${f_id}`).style.display = deg >= 2 ? "inline-flex" : "none";
      markFunctionAsCustom(f_id, true);
    });

    // Обработчики ввода коэффициентов (фиксируют ручной ввод)
    ["a", "b", "c", "d"].forEach(cf => {
      const inp = row.querySelector(`#coeff_${cf}_${f_id}`);
      if (inp) {
        inp.addEventListener("input", (e) => {
          func[cf] = parseFloat(e.target.value) || 0.0;
          markFunctionAsCustom(f_id, true);
        });
      }
    });
  }

  // Кнопка рандомизации 187 функций с диалогом защиты ручного ввода
  document.getElementById("btnRandFuncs").addEventListener("click", () => {
    const customCount = userEditedFunctions.size;

    if (customCount === 0) {
      model.randomizeFunctions(null);
      updateAllEquationRows();
      showToast("Коэффициенты всех 187 функций успешно заполнены случайными значениями!", "success");
      return;
    }

    const customList = Array.from(userEditedFunctions).sort((a, b) => a - b);
    const preview = customList.slice(0, 6).map(id => `<b>F${id}</b>`).join(", ");
    const moreText = customCount > 6 ? ` и ещё ${customCount - 6} функций` : "";

    openConfirmModal({
      title: "🎲 Заполнение случайными коэффициентами",
      bodyHtml: `
        <p>В модели обнаружены функции, которые вы редактировали <strong>вручную</strong> (${customCount} шт.): ${preview}${moreText}.</p>
        <div class="modal-info-box">
          <strong>Выбор режима генерации:</strong> вы можете защитить ваши формулы от перезаписи либо обновить все уравнения.
        </div>
      `,
      options: [
        {
          text: `🛡️ Заполнить только нетронутые (${187 - customCount} функций)`,
          sub: "Сохранить все ваши ручные коэффициенты и сгенерировать случайные значения только для остальных",
          className: "modal-btn-protect",
          action: () => {
            model.randomizeFunctions(userEditedFunctions);
            updateAllEquationRows();
            showToast(`Случайно заполнены ${187 - customCount} функций. Ручной ввод (${customCount} шт.) сохранён!`, "success");
          }
        },
        {
          text: "⚠️ Перезаписать всё (включая ручной ввод)",
          sub: "Сбросить ручные правки и сгенерировать новые случайные значения для всех 187 функций",
          className: "modal-btn-overwrite",
          action: () => {
            userEditedFunctions.clear();
            model.randomizeFunctions(null);
            updateAllEquationRows();
            for (let i = 1; i <= 187; i++) updateRowCustomState(i);
            showToast("Все 187 функций перезаписаны случайными значениями!", "warning");
          }
        },
        {
          text: "Отмена",
          className: "modal-btn-cancel",
          action: null
        }
      ]
    });
  });

  // Сброс к исходным с диалогом защиты ручного ввода
  document.getElementById("btnResetFuncs").addEventListener("click", () => {
    const customCount = userEditedFunctions.size;

    if (customCount === 0) {
      model.initDefaultFunctions(null);
      updateAllEquationRows();
      showToast("Все 187 функций сброшены к сбалансированным значениям по умолчанию.", "info");
      return;
    }

    const customList = Array.from(userEditedFunctions).sort((a, b) => a - b);
    const preview = customList.slice(0, 6).map(id => `<b>F${id}</b>`).join(", ");
    const moreText = customCount > 6 ? ` и ещё ${customCount - 6} функций` : "";

    openConfirmModal({
      title: "↺ Сброс функций связи к исходным",
      bodyHtml: `
        <p>В модели есть функции, отредактированные <strong>вручную</strong> (${customCount} шт.): ${preview}${moreText}.</p>
        <div class="modal-info-box">
          Сбросить только нетронутые функции к базовым или вернуть абсолютно все функции к исходным?
        </div>
      `,
      options: [
        {
          text: `🛡️ Сбросить только нетронутые (${187 - customCount} функций)`,
          sub: "Сохранить ваши ручные настройки и сбросить остальные к значениям по умолчанию",
          className: "modal-btn-protect",
          action: () => {
            model.initDefaultFunctions(userEditedFunctions);
            updateAllEquationRows();
            showToast(`Сброшены ${187 - customCount} функций. Ручной ввод сохранён.`, "info");
          }
        },
        {
          text: "⚠️ Сбросить всё (стереть ручной ввод)",
          sub: "Полностью вернуть все 187 функций к заводским значениям по умолчанию",
          className: "modal-btn-overwrite",
          action: () => {
            userEditedFunctions.clear();
            model.initDefaultFunctions(null);
            updateAllEquationRows();
            for (let i = 1; i <= 187; i++) updateRowCustomState(i);
            showToast("Все 187 функций сброшены к исходным значениям по умолчанию.", "warning");
          }
        },
        {
          text: "Отмена",
          className: "modal-btn-cancel",
          action: null
        }
      ]
    });
  });

  // Кнопки быстрой установки всех степеней
  document.getElementById("btnSetAllDeg1").addEventListener("click", () => setAllFunctionsDegree(1));
  document.getElementById("btnSetAllDeg2").addEventListener("click", () => setAllFunctionsDegree(2));
  document.getElementById("btnSetAllDeg3").addEventListener("click", () => setAllFunctionsDegree(3));

  // Выпадающий список быстрого перехода
  const jumpSel = document.getElementById("quickJumpFunc");
  if (jumpSel) {
    jumpSel.innerHTML = "";
    for (let i = 1; i <= 187; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `F${i}`;
      jumpSel.appendChild(opt);
    }
    jumpSel.addEventListener("change", (e) => {
      const targetRow = document.getElementById(`eq_row_${e.target.value}`);
      if (targetRow) {
        targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
        targetRow.style.backgroundColor = "#fef08a";
        setTimeout(() => targetRow.style.backgroundColor = "", 1500);
      }
    });
  }

  // Поиск
  const searchInp = document.getElementById("searchEqInput");
  if (searchInp) {
    searchInp.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      for (let i = 1; i <= 187; i++) {
        const row = document.getElementById(`eq_row_${i}`);
        if (!row) continue;
        if (!q) {
          row.style.display = "";
        } else {
          const match = `f${i}`.includes(q) || `${i}` === q || row.textContent.toLowerCase().includes(q);
          row.style.display = match ? "" : "none";
        }
      }
    });
  }
}

function updateAllEquationRows() {
  for (let f_id = 1; f_id <= 187; f_id++) {
    const func = model.functions[f_id];
    const sel = document.getElementById(`eq_deg_${f_id}`);
    if (sel) sel.value = func.degree;

    const inpA = document.getElementById(`coeff_a_${f_id}`);
    const inpB = document.getElementById(`coeff_b_${f_id}`);
    const inpC = document.getElementById(`coeff_c_${f_id}`);
    const inpD = document.getElementById(`coeff_d_${f_id}`);
    if (inpA) inpA.value = func.a.toFixed(2);
    if (inpB) inpB.value = func.b.toFixed(2);
    if (inpC) inpC.value = func.c.toFixed(2);
    if (inpD) inpD.value = func.d.toFixed(2);

    const termA = document.getElementById(`term_a_${f_id}`);
    const termB = document.getElementById(`term_b_${f_id}`);
    if (termA) termA.style.display = func.degree === 3 ? "inline-flex" : "none";
    if (termB) termB.style.display = func.degree >= 2 ? "inline-flex" : "none";

    updateRowCustomState(f_id);
  }
}

function setAllFunctionsDegree(deg) {
  const customCount = userEditedFunctions.size;

  const applyDegree = (skipCustom) => {
    for (let f_id = 1; f_id <= 187; f_id++) {
      if (skipCustom && userEditedFunctions.has(f_id)) continue;
      const func = model.functions[f_id];
      func.degree = deg;
      if (deg === 1) {
        func.a = 0.0;
        func.b = 0.0;
      } else if (deg === 2) {
        func.a = 0.0;
      }
    }
    updateAllEquationRows();
    const degNames = { 1: "линейная (1)", 2: "квадратичная (2)", 3: "кубическая (3)" };
    showToast(`Установлена ${degNames[deg]} степень ${skipCustom ? `для ${187 - customCount} нетронутых функций` : 'для всех 187 функций'}.`, "info");
  };

  if (customCount === 0) {
    applyDegree(false);
    return;
  }

  openConfirmModal({
    title: `Смена степени функций на ${deg}`,
    bodyHtml: `
      <p>В модели есть функции, отредактированные <strong>вручную</strong> (${customCount} шт.).</p>
      <div class="modal-info-box">
        Применить новую степень полинома только к нетронутым функциям или переключить все 187?
      </div>
    `,
    options: [
      {
        text: `🛡️ Применить только к нетронутым (${187 - customCount} функций)`,
        sub: "Сохранить текущие степени и формулы для функций с ручным вводом",
        className: "modal-btn-protect",
        action: () => applyDegree(true)
      },
      {
        text: "⚠️ Применить ко всем 187 функциям",
        sub: "Переключить степень для всех функций модели, включая ручные",
        className: "modal-btn-overwrite",
        action: () => applyDegree(false)
      },
      {
        text: "Отмена",
        className: "modal-btn-cancel",
        action: null
      }
    ]
  });
}

// ============================================================================
// ВЫЧИСЛЕНИЯ РУНГЕ-КУТТА
// ============================================================================
function runSimulation(isManual = false) {
  const u0 = [];
  for (let idx = 0; idx < 28; idx++) {
    const inp = document.getElementById(`u0_input_${idx}`);
    u0.push(parseFloat(inp ? inp.value : 0.5) || 0.5);
  }

  const updateBadges = (text, border, color) => {
    const badge = document.getElementById("simStatusBadge");
    const badgeMgmt = document.getElementById("simStatusBadgeMgmt");
    [badge, badgeMgmt].forEach(el => {
      if (el) {
        el.textContent = text;
        el.style.borderColor = border;
        el.style.color = color;
      }
    });
  };

  updateBadges("Выполняется расчет...", "#f59e0b", "#f59e0b");

  setTimeout(() => {
    try {
      currentResults = model.solve(u0, 100);

      renderPerturbationChart();
      renderDynamicsChart();
      renderRadarChart();

      const u1_end = currentResults.u[0][100];
      updateBadges(`Расчет завершен • u₁(Сопровождаемость): ${u0[0].toFixed(2)} → ${u1_end.toFixed(2)}`, "#10b981", "#34d399");

      if (isManual) {
        openSimResultModal(u0, currentResults);
      }
    } catch (simErr) {
      console.error("Simulation error:", simErr);
      updateBadges("Ошибка при расчете", "#ef4444", "#ef4444");
      const banner = document.getElementById("runtimeErrorBanner");
      if (banner) {
        banner.style.display = "block";
        banner.textContent = "Ошибка при вычислении ОДУ Рунге-Кутта: " + simErr.message;
      }
    }
  }, 20);
}

// ============================================================================
// ВКЛАДКА 2: ГРАФИК ВОЗМУЩЕНИЙ
// ============================================================================
function initPerturbationControls() {
  const container = document.getElementById("pertCheckboxList");
  container.innerHTML = "";

  PERTURBATIONS.forEach((p, idx) => {
    const row = document.createElement("div");
    row.classList.add("check-item-row");

    row.innerHTML = `
      <label style="color: ${PERT_COLORS[idx]};">
        <input type="checkbox" id="pert_cb_${idx}" checked>
        <span>${p.symbol}: ${p.title}</span>
      </label>
      <button class="btn-only" data-idx="${idx}">Только</button>
    `;
    container.appendChild(row);

    row.querySelector("input").addEventListener("change", renderPerturbationChart);
    row.querySelector(".btn-only").addEventListener("click", (e) => {
      isolatePerturbation(parseInt(e.target.getAttribute("data-idx")));
    });
  });

  document.getElementById("btnPertSelectAll").addEventListener("click", () => {
    PERTURBATIONS.forEach((_, idx) => {
      document.getElementById(`pert_cb_${idx}`).checked = true;
    });
    renderPerturbationChart();
  });

  document.getElementById("btnPertDeselectAll").addEventListener("click", () => {
    PERTURBATIONS.forEach((_, idx) => {
      document.getElementById(`pert_cb_${idx}`).checked = false;
    });
    renderPerturbationChart();
  });
}

function isolatePerturbation(targetIdx) {
  PERTURBATIONS.forEach((_, idx) => {
    document.getElementById(`pert_cb_${idx}`).checked = (idx === targetIdx);
  });
  renderPerturbationChart();
}

function renderPerturbationChart() {
  if (!currentResults || typeof Chart === "undefined") return;

  const ctx = document.getElementById("pertChart").getContext("2d");
  const datasets = [];

  PERTURBATIONS.forEach((p, idx) => {
    const cb = document.getElementById(`pert_cb_${idx}`);
    if (cb && cb.checked) {
      datasets.push({
        label: `${p.symbol}: ${p.title}`,
        data: currentResults.lambdas[idx],
        borderColor: PERT_COLORS[idx],
        backgroundColor: "transparent",
        borderWidth: 2.2,
        tension: 0.15,
        pointRadius: 0,
        pointHoverRadius: 5
      });
    }
  });

  if (pertChartInstance) {
    pertChartInstance.destroy();
  }

  pertChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: currentResults.t,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          position: "top",
          labels: { font: { size: 11, family: "Segoe UI" } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(3)}`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Время t ∈ [0, 1]", font: { weight: "bold" } },
          grid: { color: "#e2e8f0" }
        },
        y: {
          min: 0.0,
          max: 1.1,
          title: { display: true, text: "Интенсивность возмущения", font: { weight: "bold" } },
          grid: { color: "#e2e8f0" }
        }
      }
    }
  });
}

// ============================================================================
// ВКЛАДКА 3: ДИНАМИКА ХАРАКТЕРИСТИК (ОДИНОЧНЫЙ / МУЛЬТИ РЕЖИМ)
// ============================================================================
function initDynamicsControls() {
  // Выпадающий список характеристик для одиночного режима
  const selectSingle = document.getElementById("selectSingleChar");
  selectSingle.innerHTML = "";
  CHARACTERISTICS.forEach((ch, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    const tag = ch.is_quality ? "[Качество]" : "[Дефект]";
    opt.textContent = `${tag} ${ch.var_name} (${ch.iso_node}): ${ch.short_name}`;
    selectSingle.appendChild(opt);
  });
  selectSingle.addEventListener("change", renderDynamicsChart);

  document.getElementById("btnPrevChar").addEventListener("click", () => {
    let cur = parseInt(selectSingle.value);
    if (cur > 0) {
      selectSingle.value = cur - 1;
      renderDynamicsChart();
    }
  });

  document.getElementById("btnNextChar").addEventListener("click", () => {
    let cur = parseInt(selectSingle.value);
    if (cur < 27) {
      selectSingle.value = cur + 1;
      renderDynamicsChart();
    }
  });

  // Чекбоксы для мульти-режима
  const container = document.getElementById("dynCheckboxList");
  container.innerHTML = "";
  CHARACTERISTICS.forEach((ch, idx) => {
    const row = document.createElement("div");
    row.classList.add("check-item-row");

    const color = PALETTE_28[idx];
    row.innerHTML = `
      <label style="color: ${ch.is_quality ? '#1e3a8a' : '#475569'};">
        <input type="checkbox" id="dyn_cb_${idx}" ${ch.is_quality ? "checked" : ""}>
        <span>${ch.var_name} (${ch.iso_node}): ${ch.short_name}</span>
      </label>
      <button class="btn-only" data-idx="${idx}">Только</button>
    `;
    container.appendChild(row);

    row.querySelector("input").addEventListener("change", renderDynamicsChart);
    row.querySelector(".btn-only").addEventListener("click", (e) => {
      isolateCharacteristic(parseInt(e.target.getAttribute("data-idx")));
    });
  });

  // Кнопки быстрых фильтров
  document.getElementById("btnFilterQuality").addEventListener("click", () => {
    CHARACTERISTICS.forEach((ch, idx) => {
      document.getElementById(`dyn_cb_${idx}`).checked = ch.is_quality;
    });
    renderDynamicsChart();
  });

  document.getElementById("btnFilterDefects").addEventListener("click", () => {
    CHARACTERISTICS.forEach((ch, idx) => {
      document.getElementById(`dyn_cb_${idx}`).checked = !ch.is_quality;
    });
    renderDynamicsChart();
  });

  document.getElementById("btnFilterAll").addEventListener("click", () => {
    CHARACTERISTICS.forEach((_, idx) => {
      document.getElementById(`dyn_cb_${idx}`).checked = true;
    });
    renderDynamicsChart();
  });

  document.getElementById("btnFilterNone").addEventListener("click", () => {
    CHARACTERISTICS.forEach((_, idx) => {
      document.getElementById(`dyn_cb_${idx}`).checked = false;
    });
    renderDynamicsChart();
  });

  // Переключение одиночного/мульти режима
  document.querySelectorAll("input[name='dynMode']").forEach(radio => {
    radio.addEventListener("change", () => {
      const isSingle = document.getElementById("dynModeSingle").checked;
      document.getElementById("sidebarSingleControls").style.display = isSingle ? "block" : "none";
      document.getElementById("sidebarMultiControls").style.display = isSingle ? "none" : "block";
      document.getElementById("singleCardBox").style.display = isSingle ? "block" : "none";
      renderDynamicsChart();
    });
  });
}

function isolateCharacteristic(targetIdx) {
  CHARACTERISTICS.forEach((_, idx) => {
    document.getElementById(`dyn_cb_${idx}`).checked = (idx === targetIdx);
  });
  renderDynamicsChart();
}

function renderDynamicsChart() {
  if (!currentResults || typeof Chart === "undefined") return;

  const ctx = document.getElementById("dynChart").getContext("2d");
  const isSingle = document.getElementById("dynModeSingle").checked;

  if (dynChartInstance) {
    dynChartInstance.destroy();
  }

  if (isSingle) {
    // ---------------------------------------------------------
    // РЕЖИМ 1: ОДИНОЧНЫЙ АНАЛИЗ (1 ЛИНИЯ)
    // ---------------------------------------------------------
    const idx = parseInt(document.getElementById("selectSingleChar").value) || 0;
    const ch = CHARACTERISTICS[idx];
    const yVals = currentResults.u[idx];
    const u_start = yVals[0];
    const u_end = yVals[100];
    const delta = u_end - u_start;
    const pct = u_start > 1e-4 ? (delta / u_start) * 100 : 0.0;
    const color = ch.is_quality ? "#1e3a8a" : "#b91c1c";

    // Обновляем карточку анализа
    document.getElementById("singleCardTitle").textContent = `${ch.var_name} (${ch.iso_node}): ${ch.name}`;
    document.getElementById("valStart").textContent = u_start.toFixed(3);
    document.getElementById("valEnd").textContent = u_end.toFixed(3);
    document.getElementById("valDelta").textContent = (delta >= 0 ? "+" : "") + delta.toFixed(3);
    document.getElementById("valPct").textContent = (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";

    let verdict = "";
    if (ch.is_quality) {
      if (delta > 0) verdict = `Показатель качества ${ch.short_name} вырос на +${pct.toFixed(1)}%, что свидетельствует об успешном улучшении сопровождаемости ПО.`;
      else verdict = `Показатель качества ${ch.short_name} снизился на ${pct.toFixed(1)}%. Требуется усиление инженерных процессов.`;
    } else {
      if (delta < 0) verdict = `Фактор дефекта ${ch.short_name} снизился на ${pct.toFixed(1)}% — проектная надежность повысилась, дефекты успешно устранены.`;
      else verdict = `Метрика дефекта ${ch.short_name} возросла на +${pct.toFixed(1)}% — фиксируется накопление ошибок в кодовой базе.`;
    }
    document.getElementById("singleVerdictText").textContent = verdict;

    document.getElementById("dynChartTitle").textContent =
      `Изолированный анализ: ${ch.var_name} (${ch.iso_node}) ${ch.name} (Δ = ${delta >= 0 ? "+" : ""}${delta.toFixed(3)})`;

    // Вычисляем аккуратные границы по Y
    const yMin = Math.min(...yVals);
    const yMax = Math.max(...yVals);
    const ySpan = Math.max(yMax - yMin, 0.08);

    dynChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: currentResults.t,
        datasets: [{
          label: `${ch.var_name} (${ch.iso_node}): ${ch.short_name}`,
          data: yVals,
          borderColor: color,
          backgroundColor: ch.is_quality ? "rgba(30, 58, 138, 0.05)" : "rgba(185, 28, 28, 0.05)",
          borderWidth: 3.0,
          fill: true,
          tension: 0.1,
          pointRadius: (ctx) => {
            const i = ctx.dataIndex;
            return (i === 0 || i === 100) ? 6 : 0;
          },
          pointBackgroundColor: color
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Значение: ${ctx.parsed.y.toFixed(3)}`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: "Время t ∈ [0, 1]", font: { weight: "bold" } },
            grid: { color: "#e2e8f0" }
          },
          y: {
            min: Math.max(0.0, Math.round((yMin - 0.15 * ySpan) * 100) / 100),
            max: Math.min(1.2, Math.round((yMax + 0.20 * ySpan) * 100) / 100),
            title: { display: true, text: `Значение ${ch.var_name}(t)`, font: { weight: "bold" } },
            grid: { color: "#e2e8f0" }
          }
        }
      }
    });

  } else {
    // ---------------------------------------------------------
    // РЕЖИМ 2: МНОЖЕСТВЕННЫЙ ВЫБОР (С ФИЛЬТРАМИ)
    // ---------------------------------------------------------
    const datasets = [];
    let countActive = 0;

    CHARACTERISTICS.forEach((ch, idx) => {
      const cb = document.getElementById(`dyn_cb_${idx}`);
      if (cb && cb.checked) {
        countActive++;
        datasets.push({
          label: `${ch.var_name} (${ch.iso_node}): ${ch.short_name}`,
          data: currentResults.u[idx],
          borderColor: PALETTE_28[idx],
          borderWidth: ch.is_quality ? 2.5 : 1.5,
          borderDash: ch.is_quality ? [] : [4, 4],
          backgroundColor: "transparent",
          tension: 0.1,
          pointRadius: 0
        });
      }
    });

    document.getElementById("dynChartTitle").textContent =
      `Динамика характеристик системы качества ПО (отображено ${countActive} из 28)`;

    dynChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: currentResults.t,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "nearest", intersect: false },
        plugins: {
          legend: {
            position: countActive <= 8 ? "top" : "right",
            labels: {
              boxWidth: 12,
              font: { size: countActive > 12 ? 9.5 : 11 }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: "Время t ∈ [0, 1]", font: { weight: "bold" } },
            grid: { color: "#e2e8f0" }
          },
          y: {
            min: 0.0,
            max: 1.05,
            title: { display: true, text: "Значение характеристики uᵢ(t)", font: { weight: "bold" } },
            grid: { color: "#e2e8f0" }
          }
        }
      }
    });
  }
}

// ============================================================================
// ВКЛАДКА 4: ЛЕПЕСТКОВАЯ (РАДАРНАЯ) ДИАГРАММА
// ============================================================================
function initRadarControls() {
  document.querySelectorAll("input[name='radarTime'], input[name='radarScope']").forEach(radio => {
    radio.addEventListener("change", renderRadarChart);
  });
  const cbLimit = document.getElementById("cbShowRadarLimit");
  if (cbLimit) {
    cbLimit.addEventListener("change", renderRadarChart);
  }
}

function renderRadarChart() {
  if (!currentResults || typeof Chart === "undefined") return;

  const ctx = document.getElementById("radarChart").getContext("2d");
  const timeChoice = document.querySelector("input[name='radarTime']:checked").value;
  const scopeChoice = document.querySelector("input[name='radarScope']:checked").value;

  const isTop6 = (scopeChoice === "top6");
  const labels = isTop6
    ? CHARACTERISTICS.slice(0, 6).map(ch => `${ch.var_name} (${ch.iso_node})`)
    : CHARACTERISTICS.map(ch => `${ch.var_name} (${ch.iso_node})`);
  const numVars = isTop6 ? 6 : 28;

  const qMap = {
    t0: { color: "#3182ce", bg: "rgba(49, 130, 206, 0.15)", label: "Начало (t=0.00)" },
    t1: { color: "#319795", bg: "rgba(49, 151, 149, 0.15)", label: "1-я четв. (t=0.25)" },
    t2: { color: "#38a169", bg: "rgba(56, 161, 105, 0.15)", label: "2-я четв. (t=0.50)" },
    t3: { color: "#d69e2e", bg: "rgba(214, 158, 46, 0.15)", label: "3-я четв. (t=0.75)" },
    t4: { color: "#e53e3e", bg: "rgba(229, 62, 62, 0.15)", label: "Финал (t=1.00)" }
  };

  const datasets = [];
  const quarters = currentResults.quarters;

  // Красная линия нормативного предела (допуска)
  const cbLimit = document.getElementById("cbShowRadarLimit");
  const showLimit = !cbLimit || cbLimit.checked;
  const limitsArray = [];
  for (let i = 0; i < numVars; i++) {
    const inp = document.getElementById(`ulim_input_${i}`);
    let val = parseFloat(inp ? inp.value : (CHARACTERISTICS[i].is_quality ? 0.75 : 0.25));
    if (isNaN(val)) val = CHARACTERISTICS[i].is_quality ? 0.75 : 0.25;
    limitsArray.push(val);
  }

  if (showLimit) {
    datasets.push({
      label: "🔴 Нормативный предел (допуск)",
      data: limitsArray,
      borderColor: "#dc2626",
      backgroundColor: "rgba(220, 38, 38, 0.05)",
      borderWidth: 2.8,
      borderDash: [6, 4],
      pointBackgroundColor: "#dc2626",
      pointBorderColor: "#ffffff",
      pointBorderWidth: 1.5,
      pointRadius: 4,
      pointHoverRadius: 6,
      order: -1
    });
  }

  if (timeChoice === "all") {
    ["t0", "t1", "t2", "t3", "t4"].forEach(key => {
      const q = qMap[key];
      const vals = quarters[key].values.slice(0, numVars);
      datasets.push({
        label: q.label,
        data: vals,
        borderColor: q.color,
        backgroundColor: q.bg,
        borderWidth: 1.8,
        pointRadius: 2
      });
    });
    document.getElementById("radarChartTitle").textContent =
      `Сводная лепестковая диаграмма: эволюция всех 5 временных срезов`;
  } else {
    const q = qMap[timeChoice];
    const vals = quarters[timeChoice].values.slice(0, numVars);
    datasets.push({
      label: q.label,
      data: vals,
      borderColor: q.color,
      backgroundColor: q.bg,
      borderWidth: 2.4,
      pointRadius: 3
    });
    document.getElementById("radarChartTitle").textContent =
      `Лепестковая диаграмма состояния системы: ${q.label}`;
  }

  if (radarChartInstance) {
    radarChartInstance.destroy();
  }

  radarChartInstance = new Chart(ctx, {
    type: "radar",
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0.0,
          max: 1.0,
          ticks: {
            stepSize: 0.25,
            font: { size: 10, weight: "bold" },
            color: "#1e293b",
            backdropColor: "rgba(255, 255, 255, 0.85)"
          },
          grid: {
            color: "#cbd5e1"
          },
          angleLines: {
            color: "#e2e8f0"
          },
          pointLabels: {
            font: { size: isTop6 ? 11 : 8.5, weight: "600" },
            color: "#0f172a"
          }
        }
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            boxWidth: 14,
            font: { size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed.r !== undefined ? ctx.parsed.r.toFixed(3) : ctx.raw;
              return ` ${ctx.dataset.label}: ${val}`;
            }
          }
        }
      }
    }
  });

  updateRadarCompliance(timeChoice, quarters, limitsArray, numVars);
}

function updateRadarCompliance(timeChoice, quarters, limitsArray, numVars) {
  const compBox = document.getElementById("complianceDetailText");
  if (!compBox) return;

  const targetKey = timeChoice === "all" ? "t4" : timeChoice;
  const vals = quarters[targetKey].values;
  const tVal = quarters[targetKey].t;

  let qualityTotal = 0;
  let qualityPass = 0;
  let defectsTotal = 0;
  let defectsPass = 0;
  const violations = [];

  for (let i = 0; i < numVars; i++) {
    const ch = CHARACTERISTICS[i];
    const val = vals[i];
    const lim = limitsArray[i];

    if (ch.is_quality) {
      qualityTotal++;
      if (val >= lim - 1e-4) {
        qualityPass++;
      } else {
        violations.push({
          var_name: ch.var_name,
          name: ch.short_name,
          val: val.toFixed(3),
          lim: lim.toFixed(2),
          type: "Качество ниже нормы (требуется ≥ " + lim.toFixed(2) + ")"
        });
      }
    } else {
      defectsTotal++;
      if (val <= lim + 1e-4) {
        defectsPass++;
      } else {
        violations.push({
          var_name: ch.var_name,
          name: ch.short_name,
          val: val.toFixed(3),
          lim: lim.toFixed(2),
          type: "Дефект выше нормы (допустимо ≤ " + lim.toFixed(2) + ")"
        });
      }
    }
  }

  const timeLabel = timeChoice === "all" ? `Финальное состояние t = ${tVal.toFixed(2)} (показан срез t=1.00)` : `Временной срез t = ${tVal.toFixed(2)}`;

  let html = `<div style="margin-bottom: 6px;"><strong>Срез:</strong> ${timeLabel}</div>`;
  html += `<div style="display: flex; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">`;
  html += `  <div style="background: #eff6ff; padding: 6px 10px; border-radius: 4px; border: 1px solid #bfdbfe; font-size: 12px;">
               <strong>Критерии качества:</strong> ${qualityPass} из ${qualityTotal} в норме (≥ u_lim)
             </div>`;
  if (defectsTotal > 0) {
    html += `  <div style="background: #fef2f2; padding: 6px 10px; border-radius: 4px; border: 1px solid #fecaca; font-size: 12px;">
                 <strong>Факторы дефектов:</strong> ${defectsPass} из ${defectsTotal} в норме (≤ u_lim)
               </div>`;
  }
  html += `</div>`;

  if (violations.length === 0) {
    html += `<div style="color: #15803d; font-weight: 600; font-size: 12px;">✓ Все показатели удовлетворяют заданным нормативным ограничениям!</div>`;
  } else {
    html += `<div style="color: #b91c1c; font-weight: 600; margin-bottom: 4px; font-size: 12px;">Зафиксировано отклонений: ${violations.length}</div>`;
    html += `<ul style="margin: 0; padding-left: 18px; font-size: 11.5px; color: #334155; max-height: 120px; overflow-y: auto;">`;
    violations.slice(0, 10).forEach(v => {
      html += `<li><b>${v.var_name}</b> (${v.name}): факт <b>${v.val}</b> | ${v.type}</li>`;
    });
    if (violations.length > 10) {
      html += `<li>... и ещё ${violations.length - 10} отклонений</li>`;
    }
    html += `</ul>`;
  }

  compBox.innerHTML = html;
}

// ============================================================================
// ВКЛАДКА 5: ТАБЛИЦА СООТВЕТСТВИЯ И ЭКСПОРТ CSV
// ============================================================================
function initCorrespondenceTable() {
  const tbody = document.getElementById("tbodyCorrespondence");
  tbody.innerHTML = "";

  CHARACTERISTICS.forEach(ch => {
    const tr = document.createElement("tr");
    if (ch.is_quality) tr.classList.add("row-quality");

    tr.innerHTML = `
      <td><strong>${ch.var_name}</strong></td>
      <td><strong>${ch.iso_node}</strong></td>
      <td>${ch.name}</td>
      <td>${ch.level} (${ch.is_quality ? "Критерий качества" : "Фактор дефекта"})</td>
    `;
    tbody.appendChild(tr);
  });
}

function initExportHandlers() {
  document.getElementById("btnDownloadCSV").addEventListener("click", () => {
    if (!currentResults) {
      alert("Сначала выполните расчет модели!");
      return;
    }

    const t = currentResults.t;
    const u = currentResults.u;
    const lambdas = currentResults.lambdas;

    let csvContent = "";
    // Заголовок
    const header = ["Время_t"]
      .concat(CHARACTERISTICS.map(ch => `${ch.var_name}_${ch.iso_node}`))
      .concat(PERTURBATIONS.map(p => p.symbol));
    csvContent += header.join(";") + "\r\n";

    // Строки данных
    for (let s = 0; s < t.length; s++) {
      const row = [t[s].toFixed(4)]
        .concat(CHARACTERISTICS.map((_, i) => u[i][s].toFixed(6)))
        .concat(PERTURBATIONS.map((_, k) => lambdas[k][s].toFixed(6)));
      csvContent += row.join(";") + "\r\n";
    }

    // Скачивание через Blob (работает в любом браузере)
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "результаты_моделирования_качества_ПО.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

// Экспорт любого графика в PNG прямо из Canvas
function exportChartPNG(canvasId, defaultFilename) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const imageURI = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.setAttribute("href", imageURI);
  link.setAttribute("download", defaultFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

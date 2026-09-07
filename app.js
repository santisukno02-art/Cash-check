/*
  1) หลังจากสร้าง Google Apps Script แล้ว ให้นำ Web App URL มาใส่ใน GOOGLE_SCRIPT_URL ด้านล่าง
  2) ถ้าใช้ Apps Script URL โดยตรง เว็บไซต์จะส่งข้อมูลแบบ text/plain เพื่อหลีกเลี่ยง CORS preflight
*/
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNEQnnd7qNLsFJ6x4M46oKy8q9rhAmlLtck-9g6dn4LI0Ntmgailf4BqQeTYVVbDIE/exec";

const DENOMINATIONS = [
  { value: 1000, label: "1,000", type: "banknote", unit: "ใบ" },
  { value: 500, label: "500", type: "banknote", unit: "ใบ" },
  { value: 100, label: "100", type: "banknote", unit: "ใบ" },
  { value: 50, label: "50", type: "banknote", unit: "ใบ" },
  { value: 20, label: "20", type: "banknote", unit: "ใบ" },
  { value: 10, label: "10", type: "coin", unit: "เหรียญ" },
  { value: 5, label: "5", type: "coin", unit: "เหรียญ" },
  { value: 2, label: "2", type: "coin", unit: "เหรียญ" },
  { value: 1, label: "1", type: "coin", unit: "เหรียญ" },
  { value: 0.50, label: "0.50", type: "coin", unit: "เหรียญ" },
  { value: 0.25, label: "0.25", type: "coin", unit: "เหรียญ" }
];

const counts = Object.fromEntries(DENOMINATIONS.map(d => [String(d.value), 0]));
const $ = id => document.getElementById(id);
const money = n => Number(n || 0).toLocaleString("th-TH", {minimumFractionDigits:2, maximumFractionDigits:2});
const integer = n => Number(n || 0).toLocaleString("th-TH");

function renderMoneyCards() {
  $("banknotes").innerHTML = "";
  $("coins").innerHTML = "";

  DENOMINATIONS.forEach(d => {
    const card = document.createElement("div");
    card.className = `money-card ${d.type === "coin" ? "coin" : ""}`;
    card.innerHTML = `
      <div>
        <div class="denom">${d.label} <small>บาท</small></div>
        <div class="amount" id="amount-${d.value}">0.00 บาท</div>
      </div>
      <div class="counter">
        <button aria-label="ลด ${d.label}" data-action="minus" data-value="${d.value}">−</button>
        <input aria-label="จำนวน ${d.label}" type="number" min="0" step="1" value="0" data-count="${d.value}">
        <button class="plus" aria-label="เพิ่ม ${d.label}" data-action="plus" data-value="${d.value}">+</button>
      </div>
    `;
    (d.type === "coin" ? $("coins") : $("banknotes")).appendChild(card);
  });

  document.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.value;
      counts[key] = Math.max(0, counts[key] + (btn.dataset.action === "plus" ? 1 : -1));
      syncInputs();
      updateSummary();
    });
  });

  document.querySelectorAll("[data-count]").forEach(input => {
    input.addEventListener("input", () => {
      const key = input.dataset.count;
      counts[key] = Math.max(0, Math.floor(Number(input.value) || 0));
      updateSummary();
    });
  });
}

function syncInputs() {
  document.querySelectorAll("[data-count]").forEach(input => {
    input.value = counts[input.dataset.count];
  });
}

function getSummary() {
  let banknoteTotal = 0, coinTotal = 0, banknoteCount = 0, coinCount = 0;
  const detail = {};
  DENOMINATIONS.forEach(d => {
    const count = Number(counts[String(d.value)] || 0);
    const amount = d.value * count;
    detail[String(d.value)] = count;
    if (d.type === "banknote") {
      banknoteTotal += amount; banknoteCount += count;
    } else {
      coinTotal += amount; coinCount += count;
    }
  });
  return {
    banknoteTotal, coinTotal,
    total: banknoteTotal + coinTotal,
    banknoteCount, coinCount,
    pieceCount: banknoteCount + coinCount,
    detail
  };
}

function updateSummary() {
  const s = getSummary();
  $("grandTotal").textContent = money(s.total);
  $("banknoteTotal").textContent = `${money(s.banknoteTotal)} บาท`;
  $("coinTotal").textContent = `${money(s.coinTotal)} บาท`;
  $("banknoteCount").textContent = `${integer(s.banknoteCount)} ใบ`;
  $("coinCount").textContent = `${integer(s.coinCount)} เหรียญ`;
  $("pieceTotal").textContent = `${integer(s.pieceCount)} ชิ้น`;

  DENOMINATIONS.forEach(d => {
    $(`amount-${d.value}`).textContent = `${money(d.value * counts[String(d.value)])} บาท`;
  });
  updateDifference();
}

function updateDifference() {
  const expectedRaw = $("expectedInput").value;
  const expected = Number(expectedRaw);
  const total = getSummary().total;
  if (expectedRaw === "") {
    $("expectedDisplay").textContent = "0.00";
    $("difference").textContent = "—";
    $("differenceHint").textContent = "รอเทียบยอด";
    $("differenceStatus").className = "status-pill neutral";
    $("differenceStatus").textContent = "ยังไม่ได้ตั้งยอดที่ควรมี";
    return;
  }
  const diff = total - expected;
  $("expectedDisplay").textContent = money(expected);
  $("difference").textContent = `${diff >= 0 ? "+" : ""}${money(diff)} บาท`;
  $("differenceHint").textContent = diff === 0 ? "ยอดตรงกัน" : (diff > 0 ? "เงินเกิน" : "เงินขาด");
  $("difference").className = diff === 0 ? "": (diff > 0 ? "diff-positive" : "diff-negative");
  $("differenceStatus").className = `status-pill ${diff === 0 ? "ok" : "bad"}`;
  $("differenceStatus").textContent = diff === 0 ? "✓ ยอดตรงกัน" : (diff > 0 ? `เงินเกิน ${money(diff)} บาท` : `เงินขาด ${money(Math.abs(diff))} บาท`);
}

async function apiGet(params = "") {
  const url = `${GOOGLE_SCRIPT_URL}${params ? `?${params}` : ""}`;
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) throw new Error("เชื่อมต่อ Google Sheets ไม่สำเร็จ");
  return response.json();
}

async function apiPost(payload) {
  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    headers: {"Content-Type": "text/plain;charset=utf-8"},
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("บันทึกข้อมูลไม่สำเร็จ");
  return response.json();
}

async function checkConnection() {
  if (GOOGLE_SCRIPT_URL.includes("PASTE_YOUR")) {
    $("connectionText").textContent = "ยังไม่ได้ตั้งค่า Google Sheets";
    return;
  }
  try {
    await apiGet("action=ping");
    $("connectionDot").classList.add("online");
    $("connectionText").textContent = "Google Sheets เชื่อมต่อแล้ว";
  } catch {
    $("connectionText").textContent = "เชื่อมต่อไม่ได้";
  }
}

async function saveRecord() {
  const s = getSummary();
  if (s.total <= 0) return toast("กรุณากรอกจำนวนเงินก่อนบันทึก", true);
  if (GOOGLE_SCRIPT_URL.includes("PASTE_YOUR")) return toast("กรุณาใส่ Google Apps Script URL ใน app.js ก่อน", true);

  const expectedRaw = $("expectedInput").value;
  const expected = expectedRaw === "" ? null : Number(expectedRaw);
  const difference = expected === null ? null : s.total - expected;

  $("saveBtn").disabled = true;
  $("saveBtn").textContent = "กำลังบันทึก...";
  try {
    const result = await apiPost({
      action: "save",
      note: $("noteInput").value.trim(),
      expected,
      difference,
      total: s.total,
      banknoteTotal: s.banknoteTotal,
      coinTotal: s.coinTotal,
      banknoteCount: s.banknoteCount,
      coinCount: s.coinCount,
      counts: s.detail
    });
    if (!result.ok) throw new Error(result.message || "บันทึกไม่สำเร็จ");
    toast("บันทึกยอดลง Google Sheets แล้ว ✓");
    $("noteInput").value = "";
  } catch (err) {
    toast(err.message || "เกิดข้อผิดพลาด", true);
  } finally {
    $("saveBtn").disabled = false;
    $("saveBtn").innerHTML = 'บันทึกยอด <span>→</span>';
  }
}

function clearAll() {
  DENOMINATIONS.forEach(d => counts[String(d.value)] = 0);
  $("expectedInput").value = "";
  $("noteInput").value = "";
  syncInputs();
  updateSummary();
}

function statusFor(diff) {
  if (diff === null || diff === undefined || diff === "") return ["neutral", "ไม่ระบุ"];
  const n = Number(diff);
  if (Math.abs(n) < 0.005) return ["ok", "ตรงกัน"];
  return ["bad", n > 0 ? "เงินเกิน" : "เงินขาด"];
}

function renderHistory(rows) {
  const body = $("historyBody");
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="8" class="empty">ยังไม่มีประวัติการนับเงิน</td></tr>`;
  } else {
    body.innerHTML = rows.map(r => {
      const [cls, label] = statusFor(r.difference);
      const diffText = r.difference === null || r.difference === "" ? "—" : `${Number(r.difference) > 0 ? "+" : ""}${money(r.difference)}`;
      return `<tr>
        <td>${escapeHtml(r.date || "")}<br><span style="color:#aaa">${escapeHtml(r.time || "")}</span></td>
        <td>${escapeHtml(r.note || "—")}</td>
        <td><strong>${money(r.total)}</strong></td>
        <td>${money(r.banknoteTotal)}</td>
        <td>${money(r.coinTotal)}</td>
        <td>${r.expected === null || r.expected === "" ? "—" : money(r.expected)}</td>
        <td class="${Number(r.difference) > 0 ? "diff-positive" : Number(r.difference) < 0 ? "diff-negative" : ""}">${diffText}</td>
        <td><span class="status-text ${cls}">${label}</span></td>
      </tr>`;
    }).join("");
  }

  $("historyCount").textContent = `${integer(rows.length)} รายการ`;
  $("latestTotal").textContent = rows.length ? `${money(rows[0].total)} บาท` : "—";
  $("issueCount").textContent = `${integer(rows.filter(r => {
    if (r.difference === null || r.difference === "") return false;
    return Math.abs(Number(r.difference)) >= 0.005;
  }).length)} รายการ`;
}

async function loadHistory() {
  if (GOOGLE_SCRIPT_URL.includes("PASTE_YOUR")) {
    $("historyBody").innerHTML = `<tr><td colspan="8" class="empty">กรุณาตั้งค่า Google Apps Script URL ใน app.js</td></tr>`;
    return;
  }
  $("historyBody").innerHTML = `<tr><td colspan="8" class="empty">กำลังโหลด...</td></tr>`;
  try {
    const result = await apiGet("action=history&limit=100");
    if (!result.ok) throw new Error(result.message || "โหลดข้อมูลไม่สำเร็จ");
    renderHistory(result.rows || []);
  } catch (err) {
    $("historyBody").innerHTML = `<tr><td colspan="8" class="empty">โหลดข้อมูลไม่ได้: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
}

function toast(message, error = false) {
  const el = $("toast");
  el.textContent = message;
  el.className = `toast show${error ? " error" : ""}`;
  setTimeout(() => el.className = "toast", 2800);
}

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    const isHistory = btn.dataset.view === "history";
    $("counterView").classList.toggle("hidden", isHistory);
    $("historyView").classList.toggle("hidden", !isHistory);
    $("pageTitle").textContent = isHistory ? "ประวัติการนับเงิน" : "นับเงินสด";
    if (isHistory) loadHistory();
  });
});

$("expectedInput").addEventListener("input", updateDifference);
$("clearBtn").addEventListener("click", () => {
  if (confirm("ต้องการล้างจำนวนเงินทั้งหมดใช่หรือไม่?")) clearAll();
});
$("saveBtn").addEventListener("click", saveRecord);
$("refreshHistory").addEventListener("click", loadHistory);

renderMoneyCards();
updateSummary();
checkConnection();

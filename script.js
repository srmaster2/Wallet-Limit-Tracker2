// Wallet Limit Tracker Script
const DAILY_LIMIT = 60000;
const MONTHLY_LIMIT = 200000;

let wallets = {};

function saveToLocalStorage() {
  localStorage.setItem("wallets", JSON.stringify(wallets));
}

function addWallet() {
  const phone = document.getElementById("newWallet").value.trim();
  if (!phone) return alert("يرجى إدخال رقم المحفظة");
  if (wallets[phone]) return alert("المحفظة موجودة بالفعل");

  wallets[phone] = { balance: 0, transactions: [] };
  saveToLocalStorage();
  populateWalletList();
  document.getElementById("newWallet").value = "";
}

function populateWalletList() {
  const select = document.getElementById("walletSelect");
  select.innerHTML = '<option value="">اختر رقم المحفظة</option>';
  Object.keys(wallets).forEach(phone => {
    const option = document.createElement("option");
    option.value = phone;
    option.textContent = phone;
    select.appendChild(option);
  });
}

function deleteSelectedWallet() {
  const phone = document.getElementById("walletSelect").value;
  if (!phone) return alert("يرجى اختيار محفظة لحذفها");
  if (!confirm("هل أنت متأكد من حذف هذه المحفظة؟")) return;

  delete wallets[phone];
  saveToLocalStorage();
  populateWalletList();
  document.getElementById("output").innerHTML = "";
}

function selectTransactionType(type) {
  document.getElementById("transactionType").value = type;
  document.getElementById("btnDeposit").style.backgroundColor = type === 'deposit' ? '#28a745' : '';
  document.getElementById("btnWithdraw").style.backgroundColor = type === 'withdraw' ? '#dc3545' : '';
}

function addTransaction() {
  const phone = document.getElementById("walletSelect").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const type = document.getElementById("transactionType").value;
  const note = document.getElementById("note").value.trim();

  if (!phone || !wallets[phone]) return alert("يرجى اختيار محفظة");
  if (type === "") return alert("يرجى اختيار نوع العملية");
  if (isNaN(amount) || amount <= 0) return alert("يرجى إدخال مبلغ صحيح");

  const now = new Date();
  const date = formatLocalDateTime(now);

  if (type === "deposit") {
    wallets[phone].balance += amount;
    wallets[phone].transactions.push({ amount, date, type, note });
  } else if (type === "withdraw") {
    const total = amount + 1;
    if (wallets[phone].balance < total) return alert("لا يوجد رصيد كافٍ");
    wallets[phone].balance -= total;
    wallets[phone].transactions.push({ amount: -total, date, type, note });
  }

  saveToLocalStorage();
  updateLimits(phone);
  document.getElementById("amount").value = "";
  document.getElementById("note").value = "";
  document.getElementById("transactionType").value = "";
  selectTransactionType("");
}

function formatLocalDateTime(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

function updateLimits(phone) {
  const today = formatLocalDateTime(new Date()).slice(0, 10);
  const currentMonth = today.slice(0, 7);

  const dailyTotal = wallets[phone].transactions
    .filter(t => t.type === "deposit" && t.date.slice(0, 10) === today)
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyTotal = wallets[phone].transactions
    .filter(t => t.type === "deposit" && t.date.slice(0, 7) === currentMonth)
    .reduce((sum, t) => sum + t.amount, 0);

  const dailyLeft = Math.max(0, DAILY_LIMIT - dailyTotal);
  const monthlyLeft = Math.max(0, MONTHLY_LIMIT - monthlyTotal);

  let resultHTML = `
    <strong>نتائج المحفظة: ${phone}</strong><br>
    - الرصيد الحالي: ${wallets[phone].balance.toFixed(2)} جنيه<br>
    - المتبقي من الحد اليومي: <strong style="color: ${dailyLeft <= 5000 ? 'orange' : dailyLeft === 0 ? 'red' : 'green'}">
      ${dailyLeft.toFixed(2)} جنيه</strong><br>
    - المتبقي من الحد الشهري: <strong style="color: ${monthlyLeft <= 10000 ? 'orange' : monthlyLeft === 0 ? 'red' : 'green'}">
      ${monthlyLeft.toFixed(2)} جنيه</strong>
    ${monthlyTotal > MONTHLY_LIMIT ? '<div style="color: red; font-weight: bold;">⚠️ تم تجاوز الحد الشهري!</div>' : ''}
    <hr>
    <h4>سجل المعاملات:</h4>
    <table>
      <tr><th>#</th><th>النوع</th><th>المبلغ</th><th>التاريخ</th><th>ملاحظة</th><th>خيارات</th></tr>
  `;

  wallets[phone].transactions.slice().reverse().forEach((t, i) => {
    const index = wallets[phone].transactions.length - 1 - i;
    resultHTML += `
      <tr>
        <td>${wallets[phone].transactions.length - i}</td>
        <td>${t.type === "deposit" ? "دخول" : "خروج"}</td>
        <td>${t.amount < 0 ? '-' : ''}${Math.abs(t.amount)} جنيه</td>
        <td>${t.date}</td>
        <td>${t.note || '-'}</td>
        <td>
          <button onclick="editTransaction('${phone}', ${index})" style="background-color: #ffc107; color: #000;">تعديل</button>
          <button onclick="deleteTransaction('${phone}', ${index})" class="btn-danger" style="margin-top: 5px;">حذف</button>
        </td>
      </tr>
    `;
  });

  resultHTML += '</table>';
  document.getElementById("output").innerHTML = resultHTML;
}

function deleteTransaction(phone, index) {
  if (!confirm("هل تريد حذف هذه المعاملة؟")) return;
  wallets[phone].transactions.splice(index, 1);
  wallets[phone].balance = wallets[phone].transactions.reduce((sum, t) => sum + t.amount, 0);
  saveToLocalStorage();
  updateLimits(phone);
}

function editTransaction(phone, index) {
  const transaction = wallets[phone].transactions[index];
  document.getElementById("walletSelect").value = phone;
  updateSelectedWallet();
  const type = transaction.amount > 0 ? "deposit" : "withdraw";
  selectTransactionType(type);
  document.getElementById("amount").value = Math.abs(transaction.amount);
  document.getElementById("note").value = transaction.note || "";
  wallets[phone].transactions.splice(index, 1);
  wallets[phone].balance = wallets[phone].transactions.reduce((sum, t) => sum + t.amount, 0);
  saveToLocalStorage();
  updateLimits(phone);
}

function updateSelectedWallet() {
  const phone = document.getElementById("walletSelect").value;
  if (phone) {
    updateLimits(phone);
  } else {
    document.getElementById("output").innerHTML = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("wallets");
  if (saved) {
    wallets = JSON.parse(saved);
    for (const phone in wallets) {
      if (!wallets[phone].transactions) wallets[phone].transactions = [];
      if (typeof wallets[phone].balance !== "number") wallets[phone].balance = 0;
    }
    saveToLocalStorage();
  }
  populateWalletList();

  const darkToggle = document.getElementById("darkModeToggle");
  const modeLabel = document.getElementById("modeLabel");
  const savedMode = localStorage.getItem("darkMode");
  if (savedMode === "dark") {
    document.body.classList.add("dark");
    darkToggle.checked = true;
    modeLabel.innerHTML = '<i class="fa fa-moon"></i> وضع ليلي';
  }

  darkToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    modeLabel.innerHTML = isDark
      ? '<i class="fa fa-moon"></i> وضع ليلي'
      : '<i class="fa fa-sun"></i> وضع نهاري';
    localStorage.setItem("darkMode", isDark ? "dark" : "light");
  });
});

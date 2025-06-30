// Wallet Limit Tracker Script - Enhanced for Mobile
const DAILY_LIMIT = 60000;
const MONTHLY_LIMIT = 200000;

let wallets = {};

function saveToLocalStorage() {
    localStorage.setItem("wallets", JSON.stringify(wallets));
}

function addWallet() {
    const phone = document.getElementById("newWallet").value.trim();
    if (!phone) return showAlert("يرجى إدخال رقم المحفظة", "warning");
    if (wallets[phone]) return showAlert("المحفظة موجودة بالفعل", "warning");

    wallets[phone] = { balance: 0, transactions: [] };
    saveToLocalStorage();
    populateWalletList();
    document.getElementById("newWallet").value = "";
    showAlert("تم إضافة المحفظة بنجاح", "success");
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
    if (!phone) return showAlert("يرجى اختيار محفظة لحذفها", "warning");
    if (!confirm("هل أنت متأكد من حذف هذه المحفظة؟")) return;

    delete wallets[phone];
    saveToLocalStorage();
    populateWalletList(); // Added this line
    document.getElementById("output").innerHTML = "";
    showAlert("تم حذف المحفظة بنجاح", "success");
}

function selectTransactionType(type) {
    document.getElementById("transactionType").value = type;
    
    // إزالة الفئة النشطة من جميع الأزرار
    document.querySelectorAll('.btn-toggle').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // إضافة الفئة النشطة للزر المحدد
    if (type === 'deposit') {
        document.getElementById("btnDeposit").classList.add('active');
    } else if (type === 'withdraw') {
        document.getElementById("btnWithdraw").classList.add('active');
    }
}

function addTransaction() {
    const phone = document.getElementById("walletSelect").value;
    const amount = parseFloat(document.getElementById("amount").value);
    const type = document.getElementById("transactionType").value;
    const note = document.getElementById("note").value.trim();

    if (!phone || !wallets[phone]) return showAlert("يرجى اختيار محفظة", "warning");
    if (type === "") return showAlert("يرجى اختيار نوع العملية", "warning");
    if (isNaN(amount) || amount <= 0) return showAlert("يرجى إدخال مبلغ صحيح", "warning");

    const now = new Date();
    const date = formatLocalDateTime(now);

    // Calculate current daily and monthly deposits for the selected wallet
    const today = date.slice(0, 10);
    const currentMonth = date.slice(0, 7);

    const dailyDeposits = wallets[phone].transactions
        .filter(t => t.type === "deposit" && t.date.slice(0, 10) === today)
        .reduce((sum, t) => sum + t.amount, 0);

    const monthlyDeposits = wallets[phone].transactions
        .filter(t => t.type === "deposit" && t.date.slice(0, 7) === currentMonth)
        .reduce((sum, t) => sum + t.amount, 0);

    if (type === "deposit") {
        // Check daily limit
        if (dailyDeposits + amount > DAILY_LIMIT) {
            return showAlert(`تجاوز الحد اليومي للإيداع. الحد المتبقي هو ${Math.max(0, DAILY_LIMIT - dailyDeposits).toFixed(2)} جنيه.`, "error");
        }
        // Check monthly limit
        if (monthlyDeposits + amount > MONTHLY_LIMIT) {
            return showAlert(`تجاوز الحد الشهري للإيداع. الحد المتبقي هو ${Math.max(0, MONTHLY_LIMIT - monthlyDeposits).toFixed(2)} جنيه.`, "error");
        }

        wallets[phone].balance += amount;
        wallets[phone].transactions.push({ amount, date, type, note });
        showAlert("تم إضافة عملية الإيداع بنجاح", "success");
    } else if (type === "withdraw") {
        const total = amount + 1;
        if (wallets[phone].balance < total) return showAlert("لا يوجد رصيد كافٍ", "error");
        wallets[phone].balance -= total;
        wallets[phone].transactions.push({ amount: -total, date, type, note });
        showAlert("تم إضافة عملية السحب بنجاح", "success");
    }

    saveToLocalStorage();
    updateLimits(phone);
    clearTransactionForm();
}

function clearTransactionForm() {
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
        <div class="card">
            <h2><i class="fa-solid fa-chart-line"></i> نتائج المحفظة: ${phone}</h2>
            <div class="wallet-summary">
                <div class="summary-item">
                    <span class="label">الرصيد الحالي:</span>
                    <span class="value balance">${wallets[phone].balance.toFixed(2)} جنيه</span>
                </div>
                <div class="summary-item">
                    <span class="label">المتبقي من الحد اليومي:</span>
                    <span class="value ${getDailyLimitClass(dailyLeft)}">${dailyLeft.toFixed(2)} جنيه</span>
                </div>
                <div class="summary-item">
                    <span class="label">المتبقي من الحد الشهري:</span>
                    <span class="value ${getMonthlyLimitClass(monthlyLeft)}">${monthlyLeft.toFixed(2)} جنيه</span>
                </div>
                ${monthlyTotal > MONTHLY_LIMIT ? '<div class="alert alert-danger"><i class="fa-solid fa-exclamation-triangle"></i> تم تجاوز الحد الشهري!</div>' : ''}
            </div>
        </div>
    `;

    if (wallets[phone].transactions.length > 0) {
        resultHTML += `
            <div class="card">
                <h3><i class="fa-solid fa-history"></i> سجل المعاملات</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>النوع</th>
                                <th>المبلغ</th>
                                <th>التاريخ</th>
                                <th>ملاحظة</th>
                                <th>خيارات</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        wallets[phone].transactions.slice().reverse().forEach((t, i) => {
            const index = wallets[phone].transactions.length - 1 - i;
            const transactionNumber = wallets[phone].transactions.length - i;
            const typeText = t.type === "deposit" ? "دخول" : "خروج";
            const typeClass = t.type === "deposit" ? "deposit" : "withdraw";
            const amountText = `${t.amount < 0 ? '-' : ''}${Math.abs(t.amount)} جنيه`;
            
            resultHTML += `
                <tr>
                    <td>${transactionNumber}</td>
                    <td><span class="transaction-type ${typeClass}">${typeText}</span></td>
                    <td class="amount ${typeClass}">${amountText}</td>
                    <td class="date">${formatDisplayDate(t.date)}</td>
                    <td class="note">${t.note || '-'}</td>
                    <td class="actions">
                        <button onclick="editTransaction('${phone}', ${index})" class="btn-action btn-edit" title="تعديل">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button onclick="deleteTransaction('${phone}', ${index})" class="btn-action btn-delete" title="حذف">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        resultHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    document.getElementById("output").innerHTML = resultHTML;
}

function formatDisplayDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const transactionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (transactionDate.getTime() === today.getTime()) {
        return `اليوم ${date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        return date.toLocaleDateString('ar-EG') + ' ' + date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    }
}

function getDailyLimitClass(dailyLeft) {
    if (dailyLeft === 0) return 'danger';
    if (dailyLeft <= 5000) return 'warning';
    return 'success';
}

function getMonthlyLimitClass(monthlyLeft) {
    if (monthlyLeft === 0) return 'danger';
    if (monthlyLeft <= 10000) return 'warning';
    return 'success';
}

function deleteTransaction(phone, index) {
    if (!confirm("هل تريد حذف هذه المعاملة؟")) return;
    
    wallets[phone].transactions.splice(index, 1);
    wallets[phone].balance = wallets[phone].transactions.reduce((sum, t) => sum + t.amount, 0);
    saveToLocalStorage();
    updateLimits(phone);
    showAlert("تم حذف المعاملة بنجاح", "success");
}

function editTransaction(phone, index) {
    const transaction = wallets[phone].transactions[index];
    document.getElementById("walletSelect").value = phone;
    updateSelectedWallet();
    
    const type = transaction.amount > 0 ? "deposit" : "withdraw";
    selectTransactionType(type);
    document.getElementById("amount").value = Math.abs(transaction.amount);
    document.getElementById("note").value = transaction.note || "";
    
    // حذف المعاملة مؤقتاً لإعادة إضافتها
    wallets[phone].transactions.splice(index, 1);
    wallets[phone].balance = wallets[phone].transactions.reduce((sum, t) => sum + t.amount, 0);
    saveToLocalStorage();
    updateLimits(phone);
    
    showAlert("تم تحميل بيانات المعاملة للتعديل", "info");
}

function updateSelectedWallet() {
    const phone = document.getElementById("walletSelect").value;
    if (phone) {
        updateLimits(phone);
    } else {
        document.getElementById("output").innerHTML = "";
    }
}

function showAlert(message, type = 'info') {
    // استخدم نظام التوست الاحترافي في الزاوية السفلية اليمنى
    if (typeof showToast === 'function') {
        showToast(message, type);
    } else {
        // fallback: alert عادي إذا لم يوجد توست
        alert(message);
    }
}

// إضافة أنماط CSS للتنبيهات والعناصر الجديدة
function addDynamicStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .alert {
            padding: 12px 16px;
            margin-bottom: 16px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
            animation: slideDown 0.3s ease-out;
        }
        
        .alert-success {
            background: var(--success-light);
            color: var(--success-color);
            border: 1px solid var(--success-color);
        }
        
        .alert-error {
            background: var(--danger-light);
            color: var(--danger-color);
            border: 1px solid var(--danger-color);
        }
        
        .alert-warning {
            background: #fef3c7;
            color: var(--warning-color);
            border: 1px solid var(--warning-color);
        }
        
        .alert-info {
            background: var(--primary-light);
            color: var(--primary-color);
            border: 1px solid var(--primary-color);
        }
        
        .alert-danger {
            background: var(--danger-light);
            color: var(--danger-color);
            border: 1px solid var(--danger-color);
            margin-top: 16px;
            font-weight: 600;
        }
        
        .wallet-summary {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .summary-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid var(--border-color);
        }
        
        .summary-item:last-child {
            border-bottom: none;
        }
        
        .label {
            font-weight: 500;
            color: var(--text-light);
        }
        
        .value {
            font-weight: 600;
        }
        
        .value.balance {
            color: var(--primary-color);
            font-size: 1.1em;
        }
        
        .value.success {
            color: var(--success-color);
        }
        
        .value.warning {
            color: var(--warning-color);
        }
        
        .value.danger {
            color: var(--danger-color);
        }
        
        .transaction-type {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: 600;
        }
        
        .transaction-type.deposit {
            background: var(--success-light);
            color: var(--success-color);
        }
        
        .transaction-type.withdraw {
            background: var(--danger-light);
            color: var(--danger-color);
        }
        
        .amount.deposit {
            color: var(--success-color);
            font-weight: 600;
        }
        
        .amount.withdraw {
            color: var(--danger-color);
            font-weight: 600;
        }
        
        .date {
            font-size: 0.9em;
            color: var(--text-light);
            opacity: 0.8;
        }
        
        .note {
            max-width: 100px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .actions {
            display: flex;
            gap: 4px;
        }
        
        .btn-action {
            padding: 6px 8px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85em;
            transition: var(--transition);
            min-height: auto;
            width: auto;
        }
        
        .btn-edit {
            background: var(--warning-color);
            color: white;
        }
        
        .btn-delete {
            background: var(--danger-color);
            color: white;
        }
        
        .btn-action:hover {
            transform: scale(1.05);
        }
        
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        body.dark .label {
            color: var(--text-dark);
        }
        
        body.dark .date {
            color: var(--text-dark);
        }
        
        body.dark .summary-item {
            border-bottom-color: var(--border-dark);
        }
        
        @media (max-width: 480px) {
            .actions {
                flex-direction: column;
            }
            
            .btn-action {
                padding: 4px 6px;
                font-size: 0.8em;
            }
            
            .note {
                max-width: 60px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Initial loads
document.addEventListener("DOMContentLoaded", () => {
    loadWalletData();
    populateWalletList();
    addDynamicStyles();

    // Dark mode toggle
    const darkToggle = document.getElementById("darkModeToggle");
    const modeLabel = document.getElementById("modeLabel");
    const savedMode = localStorage.getItem("darkMode");
    
    if (savedMode === "dark") {
        document.body.classList.add("dark");
        darkToggle.checked = true;
        modeLabel.innerHTML = '<i class="fa fa-moon"></i><span>وضع ليلي</span>';
    }

    darkToggle.addEventListener("change", () => {
        document.body.classList.toggle("dark");
        const isDark = document.body.classList.contains("dark");
        modeLabel.innerHTML = isDark
            ? '<i class="fa fa-moon"></i><span>وضع ليلي</span>'
            : '<i class="fa fa-sun"></i><span>وضع نهاري</span>';
        localStorage.setItem("darkMode", isDark ? "dark" : "light");
    });
});

function loadWalletData() {
    const saved = localStorage.getItem("wallets");
    if (saved) {
        wallets = JSON.parse(saved);
        // Ensure data integrity
        for (const phone in wallets) {
            if (!wallets[phone].transactions) wallets[phone].transactions = [];
            if (typeof wallets[phone].balance !== "number") wallets[phone].balance = 0;
        }
    }
}


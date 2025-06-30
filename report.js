// Report Page Script for Wallet Limit Tracker
const DAILY_LIMIT = 60000;
const MONTHLY_LIMIT = 200000;

let wallets = {};
let filteredWallets = {};

// تحميل البيانات من localStorage
function loadWalletData() {
    const saved = localStorage.getItem("wallets");
    if (saved) {
        wallets = JSON.parse(saved);
        // التأكد من سلامة البيانات
        for (const phone in wallets) {
            if (!wallets[phone].transactions) wallets[phone].transactions = [];
            if (typeof wallets[phone].balance !== "number") wallets[phone].balance = 0;
        }
    }
}

// حساب إحصائيات المحفظة
function calculateWalletStats(phone) {
    const wallet = wallets[phone];
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);

    // حساب إجمالي الإيداعات اليومية
    const dailyDeposits = wallet.transactions
        .filter(t => t.type === "deposit" && t.date.slice(0, 10) === today)
        .reduce((sum, t) => sum + t.amount, 0);

    // حساب إجمالي الإيداعات الشهرية
    const monthlyDeposits = wallet.transactions
        .filter(t => t.type === "deposit" && t.date.slice(0, 7) === currentMonth)
        .reduce((sum, t) => sum + t.amount, 0);

    // حساب المتبقي من الحدود
    const dailyRemaining = Math.max(0, DAILY_LIMIT - dailyDeposits);
    const monthlyRemaining = Math.max(0, MONTHLY_LIMIT - monthlyDeposits);

    // تحديد حالة المحفظة
    let status = 'active';
    let statusText = 'نشطة';
    let statusClass = 'active';

    if (dailyRemaining === 0 || monthlyRemaining === 0) {
        status = 'stopped';
        statusText = 'موقوفة';
        statusClass = 'stopped';
    } else if (dailyRemaining <= 5000 || monthlyRemaining <= 10000) {
        status = 'warning';
        statusText = 'تحتاج انتباه';
        statusClass = 'warning';
    }

    // حساب النسب المئوية
    const dailyUsagePercent = ((dailyDeposits / DAILY_LIMIT) * 100).toFixed(1);
    const monthlyUsagePercent = ((monthlyDeposits / MONTHLY_LIMIT) * 100).toFixed(1);

    return {
        phone,
        balance: wallet.balance,
        dailyDeposits,
        monthlyDeposits,
        dailyRemaining,
        monthlyRemaining,
        dailyUsagePercent,
        monthlyUsagePercent,
        status,
        statusText,
        statusClass,
        transactionCount: wallet.transactions.length,
        lastTransaction: wallet.transactions.length > 0 ? 
            wallet.transactions[wallet.transactions.length - 1].date : null
    };
}

// إنشاء الملخص العام
function generateSummary() {
    const walletPhones = Object.keys(wallets);
    if (walletPhones.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
        document.querySelector('.summary-section').style.display = 'none';
        document.querySelector('.wallets-report').style.display = 'none';
        return;
    }

    document.getElementById('emptyState').style.display = 'none';
    document.querySelector('.summary-section').style.display = 'block';
    document.querySelector('.wallets-report').style.display = 'block';

    let totalBalance = 0;
    let activeWallets = 0;
    let stoppedWallets = 0;
    let warningWallets = 0;
    let totalTransactions = 0;

    walletPhones.forEach(phone => {
        const stats = calculateWalletStats(phone);
        totalBalance += stats.balance;
        totalTransactions += stats.transactionCount;
        
        if (stats.status === 'active') activeWallets++;
        else if (stats.status === 'stopped') stoppedWallets++;
        else if (stats.status === 'warning') warningWallets++;
    });

    const summaryHTML = `
        <div class="summary-card">
            <div class="summary-icon">
                <i class="fa-solid fa-wallet"></i>
            </div>
            <div class="summary-content">
                <h3>${walletPhones.length}</h3>
                <p>إجمالي المحافظ</p>
            </div>
        </div>
        
        <div class="summary-card">
            <div class="summary-icon success">
                <i class="fa-solid fa-check-circle"></i>
            </div>
            <div class="summary-content">
                <h3>${activeWallets}</h3>
                <p>محافظ نشطة</p>
            </div>
        </div>
        
        <div class="summary-card">
            <div class="summary-icon warning">
                <i class="fa-solid fa-exclamation-triangle"></i>
            </div>
            <div class="summary-content">
                <h3>${warningWallets}</h3>
                <p>تحتاج انتباه</p>
            </div>
        </div>
        
        <div class="summary-card">
            <div class="summary-icon danger">
                <i class="fa-solid fa-times-circle"></i>
            </div>
            <div class="summary-content">
                <h3>${stoppedWallets}</h3>
                <p>محافظ موقوفة</p>
            </div>
        </div>
        
        <div class="summary-card wide">
            <div class="summary-icon primary">
                <i class="fa-solid fa-coins"></i>
            </div>
            <div class="summary-content">
                <h3>${totalBalance.toFixed(2)} جنيه</h3>
                <p>إجمالي الأرصدة</p>
            </div>
        </div>
        
        <div class="summary-card wide">
            <div class="summary-icon info">
                <i class="fa-solid fa-exchange-alt"></i>
            </div>
            <div class="summary-content">
                <h3>${totalTransactions}</h3>
                <p>إجمالي المعاملات</p>
            </div>
        </div>
    `;

    document.getElementById('summaryGrid').innerHTML = summaryHTML;
}

// إنشاء تقرير المحافظ
function generateWalletsReport() {
    const walletPhones = Object.keys(wallets);
    if (walletPhones.length === 0) return;

    let walletsHTML = '';
    
    walletPhones.forEach(phone => {
        const stats = calculateWalletStats(phone);
        
        walletsHTML += `
            <div class="wallet-card ${stats.statusClass}" data-status="${stats.status}">
                <div class="wallet-header">
                    <div class="wallet-info">
                        <h3><i class="fa-solid fa-mobile-alt"></i> ${phone}</h3>
                        <span class="wallet-status status-${stats.statusClass}">
                            <i class="fa-solid fa-${getStatusIcon(stats.status)}"></i>
                            ${stats.statusText}
                        </span>
                    </div>
                    <div class="wallet-balance">
                        <span class="balance-amount">${stats.balance.toFixed(2)} جنيه</span>
                        <span class="balance-label">الرصيد الحالي</span>
                    </div>
                </div>
                
                <div class="wallet-limits">
                    <div class="limit-item">
                        <div class="limit-header">
                            <span class="limit-label">الحد اليومي</span>
                            <span class="limit-usage">${stats.dailyUsagePercent}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill ${getProgressClass(stats.dailyUsagePercent)}" 
                                 style="width: ${Math.min(stats.dailyUsagePercent, 100)}%"></div>
                        </div>
                        <div class="limit-details">
                            <span class="used">${stats.dailyDeposits.toFixed(2)} جنيه مستخدم</span>
                            <span class="remaining">${stats.dailyRemaining.toFixed(2)} جنيه متبقي</span>
                        </div>
                    </div>
                    
                    <div class="limit-item">
                        <div class="limit-header">
                            <span class="limit-label">الحد الشهري</span>
                            <span class="limit-usage">${stats.monthlyUsagePercent}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill ${getProgressClass(stats.monthlyUsagePercent)}" 
                                 style="width: ${Math.min(stats.monthlyUsagePercent, 100)}%"></div>
                        </div>
                        <div class="limit-details">
                            <span class="used">${stats.monthlyDeposits.toFixed(2)} جنيه مستخدم</span>
                            <span class="remaining">${stats.monthlyRemaining.toFixed(2)} جنيه متبقي</span>
                        </div>
                    </div>
                </div>
                
                <div class="wallet-footer">
                    <div class="transaction-info">
                        <span><i class="fa-solid fa-list"></i> ${stats.transactionCount} معاملة</span>
                        ${stats.lastTransaction ? 
                            `<span><i class="fa-solid fa-clock"></i> آخر معاملة: ${formatDisplayDate(stats.lastTransaction)}</span>` : 
                            '<span><i class="fa-solid fa-info-circle"></i> لا توجد معاملات</span>'
                        }
                    </div>
                    <div class="wallet-actions">
                        <button onclick="viewWalletDetails('${phone}')" class="btn-action btn-view" title="عرض التفاصيل">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button onclick="exportWalletData('${phone}')" class="btn-action btn-export" title="تصدير البيانات">
                            <i class="fa-solid fa-download"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    document.getElementById('walletsContainer').innerHTML = walletsHTML;
}

// مساعدة للحصول على أيقونة الحالة
function getStatusIcon(status) {
    switch (status) {
        case 'active': return 'check-circle';
        case 'stopped': return 'times-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'question-circle';
    }
}

// مساعدة للحصول على فئة شريط التقدم
function getProgressClass(percentage) {
    if (percentage >= 100) return 'danger';
    if (percentage >= 80) return 'warning';
    if (percentage >= 60) return 'info';
    return 'success';
}

// تنسيق التاريخ للعرض
function formatDisplayDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const transactionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (transactionDate.getTime() === today.getTime()) {
        return `اليوم ${date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        return date.toLocaleDateString('ar-EG');
    }
}

// تصفية المحافظ حسب الحالة
function filterWallets() {
    const filter = document.getElementById('statusFilter').value;
    const walletCards = document.querySelectorAll('.wallet-card');
    
    walletCards.forEach(card => {
        const status = card.getAttribute('data-status');
        if (filter === 'all' || status === filter) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// تحديث التقرير
function refreshReport() {
    loadWalletData();
    generateSummary();
    generateWalletsReport();
    showAlert('تم تحديث التقرير بنجاح', 'success');
}

// عرض تفاصيل محفظة معينة
function viewWalletDetails(phone) {
    const stats = calculateWalletStats(phone);
    const wallet = wallets[phone];
    
    let detailsHTML = `
        <div class="wallet-details-modal">
            <div class="modal-header">
                <h3><i class="fa-solid fa-wallet"></i> تفاصيل المحفظة: ${phone}</h3>
                <button onclick="closeModal()" class="close-btn">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
            <div class="modal-content">
                <div class="details-summary">
                    <div class="detail-item">
                        <span class="label">الرصيد الحالي:</span>
                        <span class="value">${stats.balance.toFixed(2)} جنيه</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">الحالة:</span>
                        <span class="value status-${stats.statusClass}">${stats.statusText}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">عدد المعاملات:</span>
                        <span class="value">${stats.transactionCount}</span>
                    </div>
                </div>
                
                <div class="recent-transactions">
                    <h4><i class="fa-solid fa-history"></i> آخر 5 معاملات</h4>
                    <div class="transactions-list">
    `;
    
    const recentTransactions = wallet.transactions.slice(-5).reverse();
    if (recentTransactions.length > 0) {
        recentTransactions.forEach(t => {
            const typeText = t.type === "deposit" ? "دخول" : "خروج";
            const typeClass = t.type === "deposit" ? "deposit" : "withdraw";
            const amountText = `${t.amount < 0 ? '-' : ''}${Math.abs(t.amount)} جنيه`;
            
            detailsHTML += `
                <div class="transaction-item">
                    <div class="transaction-type ${typeClass}">${typeText}</div>
                    <div class="transaction-amount ${typeClass}">${amountText}</div>
                    <div class="transaction-date">${formatDisplayDate(t.date)}</div>
                    <div class="transaction-note">${t.note || 'بدون ملاحظة'}</div>
                </div>
            `;
        });
    } else {
        detailsHTML += '<div class="no-transactions">لا توجد معاملات</div>';
    }
    
    detailsHTML += `
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-overlay" onclick="closeModal()"></div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', detailsHTML);
}

// إغلاق النافذة المنبثقة
function closeModal() {
    const modal = document.querySelector('.wallet-details-modal');
    const overlay = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
    if (overlay) overlay.remove();
}

// تصدير بيانات محفظة معينة
function exportWalletData(phone) {
    const stats = calculateWalletStats(phone);
    const wallet = wallets[phone];
    
    const data = {
        phone: phone,
        balance: stats.balance,
        status: stats.statusText,
        dailyLimit: {
            used: stats.dailyDeposits,
            remaining: stats.dailyRemaining,
            percentage: stats.dailyUsagePercent
        },
        monthlyLimit: {
            used: stats.monthlyDeposits,
            remaining: stats.monthlyRemaining,
            percentage: stats.monthlyUsagePercent
        },
        transactions: wallet.transactions,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `wallet_${phone}_report_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showAlert('تم تصدير بيانات المحفظة بنجاح', 'success');
}

// تصدير التقرير الكامل
function exportReport() {
    const walletPhones = Object.keys(wallets);
    if (walletPhones.length === 0) {
        showAlert('لا توجد محافظ لتصديرها', 'warning');
        return;
    }
    
    const reportData = {
        exportDate: new Date().toISOString(),
        summary: {
            totalWallets: walletPhones.length,
            totalBalance: walletPhones.reduce((sum, phone) => sum + wallets[phone].balance, 0)
        },
        wallets: {}
    };
    
    walletPhones.forEach(phone => {
        const stats = calculateWalletStats(phone);
        reportData.wallets[phone] = {
            balance: stats.balance,
            status: stats.statusText,
            dailyLimit: {
                used: stats.dailyDeposits,
                remaining: stats.dailyRemaining,
                percentage: stats.dailyUsagePercent
            },
            monthlyLimit: {
                used: stats.monthlyDeposits,
                remaining: stats.monthlyRemaining,
                percentage: stats.monthlyUsagePercent
            },
            transactionCount: stats.transactionCount,
            lastTransaction: stats.lastTransaction
        };
    });
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `wallets_report_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showAlert('تم تصدير التقرير الكامل بنجاح', 'success');
}

// عرض رسائل التنبيه
function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fa-solid fa-${getAlertIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alert, container.firstChild);
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 3000);
}

function getAlertIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
}

// تهيئة الصفحة
document.addEventListener("DOMContentLoaded", () => {
    // تحميل البيانات وإنشاء التقرير
    loadWalletData();
    generateSummary();
    generateWalletsReport();
    
    // إعداد الوضع المظلم
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
    
    // تحديث التقرير كل 30 ثانية
    setInterval(() => {
        loadWalletData();
        generateSummary();
        generateWalletsReport();
    }, 30000);
});


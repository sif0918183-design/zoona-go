// ملف الإشعارات المركزية
function showNotification(message, type = 'info', duration = 3000) {
    const notificationArea = document.getElementById('notification-area') || createNotificationArea();
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const titles = {
        success: 'نجاح',
        error: 'خطأ',
        warning: 'تحذير',
        info: 'معلومة'
    };
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        z-index: 99999;
        animation: slideInRight 0.5s ease;
        border-right: 5px solid ${colors[type] || colors.info};
        max-width: 300px;
        font-family: 'Tajawal', sans-serif;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <div style="font-size: 24px;">
                ${icons[type] || icons.info}
            </div>
            <div style="flex: 1;">
                <div style="font-weight: bold; margin-bottom: 5px; color: #1f2937;">
                    ${titles[type] || titles.info}
                </div>
                <div style="color: #4b5563; font-size: 14px;">${message}</div>
            </div>
        </div>
    `;
    
    notificationArea.appendChild(notification);
    
    // إزالة الإشعار بعد المدة المحددة
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.5s ease reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, duration);
    
    return notification;
}

function createNotificationArea() {
    const area = document.createElement('div');
    area.id = 'notification-area';
    document.body.appendChild(area);
    return area;
}

// إضافة أنماط CSS للرسوم المتحركة
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .notification {
        animation: slideInRight 0.5s ease;
    }
`;
document.head.appendChild(style);

// تصدير الوظيفة للاستخدام في الملفات الأخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showNotification };
}
// نظام الخرائط والمواقع
class MapSystem {
    constructor() {
        this.map = null;
        this.userMarker = null;
        this.destinationMarker = null;
        this.userPosition = null;
        this.destinationPosition = null;
        this.routePolyline = null;
        this.locationWatchId = null;
        
        // تنسيقات الأيقونات
        this.markerIcons = {
            user: this.createDivIcon('#4f46e5', '📍'),
            destination: this.createDivIcon('#ef4444', '🎯'),
            driver: this.createDivIcon('#16a34a', '🚗')
        };
    }
    
    // تهيئة الخريطة
    initMap(containerId, center = [15.5007, 32.5599], zoom = 12) {
        if (this.map) {
            this.map.remove();
        }
        
        this.map = L.map(containerId).setView(center, zoom);
        
        // إضافة طبقة الخريطة
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
        
        // إضافة تحكم مقياس الرسم
        L.control.scale({ imperial: false }).addTo(this.map);
        
        return this.map;
    }
    
    // إنشاء أيقونة مخصصة
    createDivIcon(color, emoji = '📍') {
        return L.divIcon({
            html: `
                <div style="
                    background: ${color};
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    color: white;
                ">
                    ${emoji}
                </div>
            `,
            className: 'custom-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });
    }
    
    // تحديث موقع المستخدم
    async updateUserPosition(lat, lng, updateMap = true) {
        this.userPosition = { lat, lng };
        
        if (updateMap) {
            this.map.setView([lat, lng], 15);
        }
        
        if (this.userMarker) {
            this.userMarker.setLatLng([lat, lng]);
        } else {
            this.userMarker = L.marker([lat, lng], {
                icon: this.markerIcons.user,
                title: 'موقعك الحالي'
            }).addTo(this.map);
            
            this.userMarker.bindPopup('📍 موقعك الحالي').openPopup();
        }
        
        if (this.destinationMarker) {
            this.updateRoute();
        }
        
        return this.userPosition;
    }
    
    // تحديث موقع الوجهة
    async updateDestination(lat, lng, address = '') {
        this.destinationPosition = { lat, lng };
        
        if (this.destinationMarker) {
            this.destinationMarker.setLatLng([lat, lng]);
        } else {
            this.destinationMarker = L.marker([lat, lng], {
                icon: this.markerIcons.destination,
                title: 'الوجهة المطلوبة'
            }).addTo(this.map);
            
            const popupText = address || 'الوجهة المطلوبة';
            this.destinationMarker.bindPopup(`🎯 ${popupText}`).openPopup();
        }
        
        if (this.userMarker) {
            this.updateRoute();
        }
        
        return this.destinationPosition;
    }
    
    // تحديث المسار بين الموقع والوجهة
    updateRoute() {
        if (!this.userPosition || !this.destinationPosition) return;
        
        // إزالة المسار القديم إذا وجد
        if (this.routePolyline) {
            this.map.removeLayer(this.routePolyline);
        }
        
        // إنشاء مسار جديد
        this.routePolyline = L.polyline([
            [this.userPosition.lat, this.userPosition.lng],
            [this.destinationPosition.lat, this.destinationPosition.lng]
        ], {
            color: '#4f46e5',
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 10'
        }).addTo(this.map);
        
        // ضبط العرض ليشمل المسار كاملاً
        const bounds = L.latLngBounds([
            [this.userPosition.lat, this.userPosition.lng],
            [this.destinationPosition.lat, this.destinationPosition.lng]
        ]);
        this.map.fitBounds(bounds, { padding: [50, 50] });
        
        return this.routePolyline;
    }
    
    // حساب المسافة بين نقطتين (بالكيلومترات)
    calculateDistance() {
        if (!this.userPosition || !this.destinationPosition) return 0;
        
        const R = 6371; // نصف قطر الأرض بالكيلومترات
        const lat1 = this.userPosition.lat * Math.PI / 180;
        const lat2 = this.destinationPosition.lat * Math.PI / 180;
        const deltaLat = (this.destinationPosition.lat - this.userPosition.lat) * Math.PI / 180;
        const deltaLng = (this.destinationPosition.lng - this.userPosition.lng) * Math.PI / 180;
        
        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
    }
    
    // البحث عن موقع بالاسم
    async searchLocation(query) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=ar`
            );
            
            const results = await response.json();
            
            return results.map(result => ({
                name: result.display_name,
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon)
            }));
            
        } catch (error) {
            console.error('Search location error:', error);
            return [];
        }
    }
    
    // العكس الجغرافي (الحصول على اسم الموقع من الإحداثيات)
    async reverseGeocode(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=ar`
            );
            
            const data = await response.json();
            
            return {
                name: data.display_name,
                address: data.address || {},
                fullData: data
            };
            
        } catch (error) {
            console.error('Reverse geocode error:', error);
            return null;
        }
    }
    
    // بدء تتبع موقع المستخدم
    startTracking(onLocationUpdate) {
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported');
            return;
        }
        
        this.locationWatchId = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                await this.updateUserPosition(latitude, longitude, false);
                
                if (onLocationUpdate) {
                    onLocationUpdate({ lat: latitude, lng: longitude });
                }
            },
            (error) => {
                console.error('Geolocation tracking error:', error);
                
                if (onLocationUpdate) {
                    onLocationUpdate(null, error);
                }
            },
            {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 15000
            }
        );
    }
    
    // إيقاف تتبع الموقع
    stopTracking() {
        if (this.locationWatchId) {
            navigator.geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = null;
        }
    }
    
    // إضافة سائق على الخريطة
    addDriver(lat, lng, driverInfo) {
        const driverMarker = L.marker([lat, lng], {
            icon: this.markerIcons.driver,
            title: driverInfo.name || 'سائق'
        }).addTo(this.map);
        
        const popupContent = `
            <div style="text-align: right; font-family: 'Tajawal', sans-serif;">
                <h4 style="margin: 0 0 10px; color: #16a34a;">🚗 ${driverInfo.name || 'سائق'}</h4>
                <p style="margin: 5px 0; font-size: 14px;">
                    <strong>فئة السيارة:</strong> ${driverInfo.carType || 'غير محدد'}
                </p>
                <p style="margin: 5px 0; font-size: 14px;">
                    <strong>رقم اللوحة:</strong> ${driverInfo.plate || 'غير معروف'}
                </p>
                <p style="margin: 5px 0; font-size: 14px;">
                    <strong>المسافة:</strong> ${driverInfo.distance ? driverInfo.distance.toFixed(1) + ' كم' : '...'}
                </p>
            </div>
        `;
        
        driverMarker.bindPopup(popupContent);
        
        return driverMarker;
    }
    
    // إضافة عدة سائقين
    addMultipleDrivers(drivers) {
        const driverMarkers = [];
        
        drivers.forEach(driver => {
            if (driver.location) {
                const marker = this.addDriver(
                    driver.location.lat,
                    driver.location.lng,
                    driver
                );
                driverMarkers.push(marker);
            }
        });
        
        return driverMarkers;
    }
    
    // تنظيف جميع العلامات
    clearAllMarkers() {
        if (this.userMarker) {
            this.map.removeLayer(this.userMarker);
            this.userMarker = null;
        }
        
        if (this.destinationMarker) {
            this.map.removeLayer(this.destinationMarker);
            this.destinationMarker = null;
        }
        
        if (this.routePolyline) {
            this.map.removeLayer(this.routePolyline);
            this.routePolyline = null;
        }
        
        // يمكن إضافة تنظيف للسائقين إذا كانوا في مصفوفة منفصلة
    }
    
    // الحصول على إحداثيات المركز الحالي للخريطة
    getCurrentCenter() {
        const center = this.map.getCenter();
        return {
            lat: center.lat,
            lng: center.lng
        };
    }
    
    // الحصول على مستوى التكبير الحالي
    getCurrentZoom() {
        return this.map.getZoom();
    }
    
    // تنزيل الخريطة كصورة (تجريبي)
    downloadMapAsImage() {
        const mapContainer = this.map.getContainer();
        html2canvas(mapContainer).then(canvas => {
            const link = document.createElement('a');
            link.download = 'خريطة-الرحلة.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }
    
    // إضافة طبقة حركة المرور (إذا كانت متاحة)
    addTrafficLayer() {
        // هذه الطبقة تحتاج إلى مفتاح API من خدمة خرائط
        // يمكن استخدام OpenStreetMap أو خدمات أخرى
        console.log('Traffic layer requires API key');
    }
    
    // التدمير والتنظيف
    destroy() {
        this.stopTracking();
        this.clearAllMarkers();
        
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        
        this.userPosition = null;
        this.destinationPosition = null;
    }
}

// إنشاء نسخة عامة للنظام
let mapSystem = null;

function initMapSystem() {
    mapSystem = new MapSystem();
    return mapSystem;
}

// وظائف مساعدة مستقلة
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

function calculateDistanceBetween(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// تصدير الدوال للاستخدام في الملفات الأخرى
export { 
    MapSystem, 
    initMapSystem, 
    mapSystem, 
    getCurrentLocation, 
    calculateDistanceBetween 
};
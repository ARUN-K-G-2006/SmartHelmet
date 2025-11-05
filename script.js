// script.js

// Global variables for stats
let dataPoints = 0;
let startTime = Date.now();
let lastUpdateTime = Date.now();

// Function to fetch all data with authentication handling
function fetchAllData() {
    // Fetch sensor data with error handling for authentication
    fetch('/api/sensor-data')
        .then(response => {
            if (response.status === 401) {
                // Authentication failed, redirect to login
                sessionStorage.removeItem('authenticated');
                window.location.href = '/login.html';
                throw new Error('Authentication required');
            }
            return response.json();
        })
        .then(data => {
            console.log("Fetched sensor data:", data);
            updateSensorDisplay(data);
            // Only count data points when we actually receive new data
            if (data.gas !== undefined || data.temperature !== undefined || data.humidity !== undefined) {
                updateDataPoints();
            }
        })
        .catch(error => {
            console.error("Error fetching sensor data:", error);
            if (error.message === 'Authentication required') {
                return; // Already redirected
            }
        });
    
    // Fetch pulse data with error handling for authentication
    fetch('/api/pulse-data')
        .then(response => {
            if (response.status === 401) {
                // Authentication failed, redirect to login
                sessionStorage.removeItem('authenticated');
                window.location.href = '/login.html';
                throw new Error('Authentication required');
            }
            return response.json();
        })
        .then(data => {
            console.log("Fetched pulse data:", data);
            updatePulseDisplay(data);
            // Only count data points when we actually receive new data
            if (data.bpm !== undefined) {
                updateDataPoints();
            }
        })
        .catch(error => {
            console.error("Error fetching pulse data:", error);
            if (error.message === 'Authentication required') {
                return; // Already redirected
            }
        });
}

// Update connection status
document.getElementById('ipAddress').textContent = "Fetching data...";

// Fetch data immediately when page loads
fetchAllData();

// Then fetch new data every 2 seconds (same interval as ESP8266)
setInterval(fetchAllData, 2000);

// Function to update the UI with sensor data
function updateSensorDisplay(data) {
    // Update gas value and status - CHANGED THRESHOLDS: Warning at 50ppm, Danger at 100ppm
    document.getElementById('gasValue').textContent = data.gas || 0;
    updateSensorStatus('gas', data.gas, 50, 100); // Changed thresholds
    
    // Update temperature value and status
    document.getElementById('tempValue').textContent = data.temperature || 0;
    updateSensorStatus('temp', data.temperature, 35, 45);
    
    // Update humidity value and status
    document.getElementById('humValue').textContent = data.humidity || 0;
    updateSensorStatus('hum', data.humidity, 70, 85);
    
    // Update buzzer status
    const buzzerStatus = document.getElementById('buzzerStatus');
    if (data.buzzer) {
        buzzerStatus.textContent = "ACTIVE";
        buzzerStatus.className = "buzzer-status buzzer-active";
        document.getElementById('buzzerPanel').classList.add('active');
    } else {
        buzzerStatus.textContent = "INACTIVE";
        buzzerStatus.className = "buzzer-status buzzer-inactive";
        document.getElementById('buzzerPanel').classList.remove('active');
    }
    
    // Update overall status
    updateOverallStatus();
}

// Function to update the UI with pulse data
function updatePulseDisplay(data) {
    // Update pulse value and status
    document.getElementById('pulseValue').textContent = data.bpm || 0;
    updatePulseStatus(data.bpm);
    
    // Update overall status
    updateOverallStatus();
}

// Function to update sensor status indicators based on thresholds
function updateSensorStatus(sensorType, value, warningThreshold, dangerThreshold) {
    const statusElement = document.getElementById(sensorType + 'Status');
    const cardElement = document.getElementById(sensorType + 'Card');
    
    // Reset classes
    cardElement.classList.remove('warning', 'danger');
    statusElement.classList.remove('status-warning', 'status-danger');
    
    if (value >= dangerThreshold) {
        statusElement.textContent = "DANGER";
        statusElement.classList.add('status-danger');
        cardElement.classList.add('danger');
    } else if (value >= warningThreshold) {
        statusElement.textContent = "WARNING";
        statusElement.classList.add('status-warning');
        cardElement.classList.add('warning');
    } else {
        statusElement.textContent = "NORMAL";
        statusElement.classList.add('status-normal');
    }
}

// Function to update pulse status based on thresholds
function updatePulseStatus(bpm) {
    const statusElement = document.getElementById('pulseStatus');
    const cardElement = document.getElementById('pulseCard');
    const iconElement = cardElement.querySelector('.gauge-icon');
    
    // Reset classes
    cardElement.classList.remove('pulse-warning', 'pulse-danger');
    statusElement.classList.remove('status-pulse-warning', 'status-pulse-danger');
    iconElement.classList.remove('heartbeat');
    
    if (bpm <= 0) {
        statusElement.textContent = "NO DATA";
        statusElement.classList.add('status-warning');
    } else if (bpm < 60 || bpm > 100) {
        statusElement.textContent = "DANGER";
        statusElement.classList.add('status-pulse-danger');
        cardElement.classList.add('pulse-danger');
        iconElement.classList.add('heartbeat');
    } else if (bpm < 65 || bpm > 90) {
        statusElement.textContent = "WARNING";
        statusElement.classList.add('status-pulse-warning');
        cardElement.classList.add('pulse-warning');
        iconElement.classList.add('heartbeat');
    } else {
        statusElement.textContent = "NORMAL";
        statusElement.classList.add('status-normal');
    }
}

// Function to update the overall alert panel based on all data
function updateOverallStatus() {
    const alertPanel = document.getElementById('alertPanel');
    const alertIcon = alertPanel.querySelector('.alert-icon');
    const alertTitle = alertPanel.querySelector('.alert-title');
    const alertMessage = alertPanel.querySelector('.alert-message');
    
    // Get current values
    const gasValue = parseInt(document.getElementById('gasValue').textContent);
    const tempValue = parseFloat(document.getElementById('tempValue').textContent);
    const humValue = parseFloat(document.getElementById('humValue').textContent);
    const pulseValue = parseInt(document.getElementById('pulseValue').textContent);
    
    // Get statuses
    const gasStatus = document.getElementById('gasStatus').textContent;
    const tempStatus = document.getElementById('tempStatus').textContent;
    const humStatus = document.getElementById('humStatus').textContent;
    const pulseStatus = document.getElementById('pulseStatus').textContent;
    
    // Check if any sensor is in danger state
    const isSensorDanger = gasStatus === "DANGER" || tempStatus === "DANGER" || humStatus === "DANGER";
    const isSensorWarning = gasStatus === "WARNING" || tempStatus === "WARNING" || humStatus === "WARNING";
    
    // Check pulse status
    const isPulseDanger = pulseStatus === "DANGER";
    const isPulseWarning = pulseStatus === "WARNING";
    
    // Update current status display
    const currentStatusElement = document.getElementById('currentStatus');
    
    if (isSensorDanger || isPulseDanger) {
        if (isSensorDanger) {
            alertPanel.className = 'alert-panel alert';
            alertIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
            alertTitle.textContent = 'CRITICAL ALERT: EVACUATE IMMEDIATELY!';
            alertMessage.textContent = 'Hazardous levels detected.';
            currentStatusElement.textContent = 'Danger';
            currentStatusElement.style.color = '#e53e3e';
        } else {
            alertPanel.className = 'alert-panel pulse-alert';
            alertIcon.innerHTML = '<i class="fas fa-heartbeat"></i>';
            alertTitle.textContent = 'CRITICAL ALERT: MEDICAL EMERGENCY!';
            alertMessage.textContent = 'Abnormal heart rate detected.';
            currentStatusElement.textContent = 'Danger';
            currentStatusElement.style.color = '#e53e3e';
        }
    } else if (isSensorWarning || isPulseWarning) {
        if (isSensorWarning) {
            alertPanel.className = 'alert-panel warning';
            alertIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            alertTitle.textContent = 'WARNING: ELEVATED LEVELS DETECTED';
            alertMessage.textContent = 'Exercise caution. Monitor levels closely.';
            currentStatusElement.textContent = 'Warning';
            currentStatusElement.style.color = '#ed8936';
        } else {
            alertPanel.className = 'alert-panel warning';
            alertIcon.innerHTML = '<i class="fas fa-heartbeat"></i>';
            alertTitle.textContent = 'WARNING: ELEVATED HEART RATE';
            alertMessage.textContent = 'Worker may be under stress. Monitor closely.';
            currentStatusElement.textContent = 'Warning';
            currentStatusElement.style.color = '#ed8936';
        }
    } else {
        alertPanel.className = 'alert-panel safe';
        alertIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
        alertTitle.textContent = 'ALL SYSTEMS NORMAL';
        alertMessage.textContent = 'All parameters within safe limits. Continue operations.';
        currentStatusElement.textContent = 'Normal';
        currentStatusElement.style.color = '#38a169';
    }
}

// Update additional stats
function updateAdditionalStats() {
    // Update uptime
    const uptimeMs = Date.now() - startTime;
    const hours = Math.floor(uptimeMs / 3600000);
    const minutes = Math.floor((uptimeMs % 3600000) / 60000);
    const seconds = Math.floor((uptimeMs % 60000) / 1000);
    document.getElementById('uptime').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update last update time
    const now = new Date();
    document.getElementById('lastUpdate').textContent = 
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
}

// Update stats every second
setInterval(updateAdditionalStats, 1000);

// Initialize stats
updateAdditionalStats();

// Update data points count when new data is received
function updateDataPoints() {
    dataPoints++;
    document.getElementById('dataPoints').textContent = dataPoints;
}

// Add logout functionality
document.addEventListener('DOMContentLoaded', function() {
    // You can add a logout button to your HTML and handle it here
    // Example: <button id="logoutBtn">Logout</button>
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            fetch('/api/logout', {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    sessionStorage.removeItem('authenticated');
                    window.location.href = '/login.html';
                }
            })
            .catch(error => {
                console.error('Logout error:', error);
            });
        });
    }
});
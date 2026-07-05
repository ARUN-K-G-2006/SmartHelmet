# SmartShield – IoT based Safety Helmet for Workers
## 📌 About the Project

**SmartShield** is an IoT-based smart helmet designed for workers in hazardous environments such as mines, chemical plants, construction sites, and oil refineries. The system continuously monitors:

- **Environmental parameters** – toxic/combustible gases (MQ-2), temperature, and humidity (DHT11)
- **Worker's vital signs** – real-time heart rate (pulse sensor)

If dangerous conditions are detected (e.g., gas leak, abnormal heart rate, extreme temperature), the helmet triggers:
- **Local alerts** – buzzer + red LED on the helmet
- **Remote alerts** – real‑time warnings on a web dashboard

All data is transmitted via **Wi-Fi** using HTTP client requests to a Node.js backend, which serves a live monitoring dashboard for supervisors.

---

## 🧠 How It Works (Prototype)

Two ESP8266 modules work together:

| ESP8266 #1 | ESP8266 #2 |
|------------|------------|
| DHT11 (temp/humidity) | V1706 analog pulse sensor(separate ESP8266 for pulse sensor alone) |
| MQ-2 gas sensor | |
| Red LED + Buzzer | |
| 0.96" OLED display | |

Both modules are powered by a laptop USB (for the prototype). Each ESP sends its sensor data independently to the web server using HTTP POST requests. The web dashboard displays all data in real time.

---

## 🛠️ Hardware Used

| Component | Model / Spec |
|-----------|---------------|
| Microcontrollers | 2 × ESP8266 NodeMCU |
| Gas sensor | MQ-2  |
| Temp/Humidity | DHT11 |
| Heart rate sensor | V1706 analog pulse sensor |
| Display | 0.96" OLED (SSD1306, I²C) |
| Alerts | Active buzzer + red LED |
| Power | USB from laptop (prototype) |

---

## 💻 Tech Stack

| Layer | Technology |
|-------|-------------|
| Firmware (ESP8266) | C++ (Arduino Framework) |
| Backend | Node.js + Express.js + express-session |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Communication | HTTP (ESP8266HTTPClient) |
| Data format | JSON (ArduinoJson library) |

---

## 📁 Repository Structure
```text
SMARTHELMET/
├── PulseSensorTest/
│   └── PulseSensorTest.ino        # Firmware for the dedicated Heart Rate ESP8266
├── WebServer/
│   └── WebServer.ino          # Firmware for the main Helmet Sensors ESP8266
├── node_modules/          # Node dependencies
├── server.js              # Node.js Express backend server
├── index.html             # Main dashboard UI
├── login.html             # Secure login portal
├── style.css              # Dashboard and login styling
├── script.js              # Frontend logic for fetching API data
├── package.json           # Project metadata and dependencies
└── package-lock.json
```
    
---

## 🚀 How to Run This Project

### ⚠️ Important Note – `node_modules` not included
The `node_modules` folder is **excluded** from the repository to keep it lightweight. You must install the dependencies locally.

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v14 or later) installed on your computer
- Arduino IDE with ESP8266 board support
- USB cables to connect both ESP8266 modules

### 2. Clone the repository
```bash
git clone https://github.com/ARUN-K-G-2006/SmartHelmet.git
```
Run the two Arduino IDE files separately and then run : "node server.js" in VS code 

#include <ESP8266WiFi.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

// ===== OLED Settings =====
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ===== WiFi Credentials =====
const char* ssid = "Galaxy A35 5G 88E3";
const char* password = "Arun1010";

// ===== Server Details =====
const char* serverURL = "http://10.54.64.195:3000/api/sensor-data";
const char* pulseServerURL = "http://10.54.64.195:3000/api/device-pulse-data";

// ===== Pin Assignments =====
#define GAS_SENSOR A0
#define DHT_PIN D4
#define BUZZER_PIN D5
#define OLED_SDA D2
#define OLED_SCL D1
#define LED_PIN D6

// ===== Thresholds =====
#define GAS_LIMIT 100
#define TEMP_LIMIT 40.0
#define HUM_LIMIT 80.0

#define DHTTYPE DHT11
DHT dht(DHT_PIN, DHTTYPE);

// ===== Sensor values =====
int gasValue = 0;
float temperature = 0.0;
float humidity = 0.0;
bool alertActive = false;

// ===== Pulse data =====
int pulseBPM = 0;
String pulseStatus = "NO DATA";

// ===== Timing variables =====
unsigned long lastDataSend = 0;
unsigned long lastLEDToggle = 0;
unsigned long lastPulseUpdate = 0;
unsigned long lastDisplayChange = 0;
const long sendInterval = 2000;
const long ledBlinkInterval = 500;
const long pulseUpdateInterval = 3000;
const long displayChangeInterval = 5000;

// ===== Display state =====
bool showPulseScreen = false;

void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // ===== OLED Init =====
  Wire.begin(OLED_SDA, OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;);
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Initializing...");
  display.display();
  delay(1000);

  // ===== Wi-Fi Connection =====
  Serial.println("Connecting to WiFi...");
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Connecting to WiFi");
  display.setCursor(0, 16);
  display.print("SSID: ");
  display.println(ssid);
  display.display();
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    display.print(".");
    display.display();
  }
  
  Serial.println("\nConnected to WiFi!");
  Serial.print("ESP8266 IP Address: ");
  Serial.println(WiFi.localIP());

  // Show IP on OLED
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("WiFi Connected!");
  display.setCursor(0, 16);
  display.print("IP: ");
  display.println(WiFi.localIP());
  display.setCursor(0, 32);
  display.println("Ready to send");
  display.setCursor(0, 40);
  display.print("data to server...");
  display.display();
}

void loop() {
  // Read Sensors
  gasValue = analogRead(GAS_SENSOR);
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    temperature = 0.0;
    humidity = 0.0;
    Serial.println("Failed to read from DHT sensor!");
  }

  // Check Alert Conditions
  alertActive = (gasValue > GAS_LIMIT || temperature > TEMP_LIMIT || humidity > HUM_LIMIT);

  // Control LED and Buzzer (NON-BLOCKING)
  if (alertActive) {
    // Blink LED
    if (millis() - lastLEDToggle > ledBlinkInterval) {
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
      lastLEDToggle = millis();
    }
    digitalWrite(BUZZER_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
  }

  // Get pulse data periodically
  if (millis() - lastPulseUpdate > pulseUpdateInterval) {
    getPulseData();
    lastPulseUpdate = millis();
  }

  // Switch display screens periodically
  if (millis() - lastDisplayChange > displayChangeInterval) {
    showPulseScreen = !showPulseScreen;
    lastDisplayChange = millis();
  }

  // Update OLED Display
  updateDisplay();

  // Print to Serial Monitor
  Serial.print("Gas: ");
  Serial.print(gasValue);
  Serial.print(" | Temp: ");
  Serial.print(temperature, 1);
  Serial.print("°C | Humidity: ");
  Serial.print(humidity, 1);
  Serial.print("% | Pulse: ");
  Serial.print(pulseBPM);
  Serial.print(" BPM | Alert: ");
  Serial.println(alertActive ? "YES" : "NO");

  // Send data to server
  if (millis() - lastDataSend > sendInterval) {
    sendSensorData();
    lastDataSend = millis();
  }

  delay(100);
}

void updateDisplay() {
  display.clearDisplay();
  display.setTextSize(1);

  if (showPulseScreen) {
    // Show pulse screen
    display.setCursor(0, 0);
    display.println("HEART RATE MONITOR");
    display.drawLine(0, 10, 128, 10, SSD1306_WHITE);
    
    display.setCursor(0, 20);
    display.setTextSize(2);
    display.print(pulseBPM);
    display.setTextSize(1);
    display.println(" BPM");
    
    display.setCursor(0, 45);
    display.print("Status: ");
    
    // Color code the status
    if (pulseStatus == "DANGER") {
      display.setTextColor(SSD1306_WHITE, SSD1306_BLACK);
      display.println("DANGER!");
    } else if (pulseStatus == "WARNING") {
      display.setTextColor(SSD1306_WHITE, SSD1306_BLACK);
      display.println("WARNING");
    } else if (pulseStatus == "NORMAL") {
      display.setTextColor(SSD1306_WHITE, SSD1306_BLACK);
      display.println("NORMAL");
    } else {
      display.setTextColor(SSD1306_WHITE, SSD1306_BLACK);
      display.println("NO DATA");
    }
    display.setTextColor(SSD1306_WHITE);
  } else {
    // Show sensor screen
    display.setCursor(0, 0);
    display.println("HELMET SENSOR DATA");
    display.drawLine(0, 10, 128, 10, SSD1306_WHITE);
    
    display.setCursor(0, 15);
    display.print("Gas: ");
    display.print(gasValue);
    display.println(" PPM");
    
    display.setCursor(0, 25);
    display.print("Temp: ");
    display.print(temperature, 1);
    display.println(" C");
    
    display.setCursor(0, 35);
    display.print("Humidity: ");
    display.print(humidity, 1);
    display.println(" %");
    
    display.setCursor(0, 45);
    display.print("Alert: ");
    if (alertActive) {
      display.setTextColor(SSD1306_WHITE, SSD1306_BLACK);
      display.println("ACTIVE!");
    } else {
      display.println("INACTIVE");
    }
    display.setTextColor(SSD1306_WHITE);
    
    // Show pulse status briefly at bottom
    display.setCursor(0, 55);
    display.print("Pulse: ");
    display.print(pulseBPM);
    display.print(" BPM");
  }

  display.display();
}

void getPulseData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    WiFiClient client;
    
    Serial.print("Fetching pulse data from: ");
    Serial.println(pulseServerURL);
    
    http.begin(client, pulseServerURL);
    http.addHeader("Content-Type", "application/json");
    
    int httpCode = http.GET();
    
    Serial.print("HTTP response code: ");
    Serial.println(httpCode);
    
    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      Serial.print("Raw pulse data: ");
      Serial.println(payload);
      
      // Parse JSON with ArduinoJSON
      DynamicJsonDocument doc(256);
      DeserializationError error = deserializeJson(doc, payload);
      
      if (!error) {
        // Extract BPM value
        if (doc.containsKey("bpm")) {
          pulseBPM = doc["bpm"].as<int>();
          Serial.print("Parsed BPM: ");
          Serial.println(pulseBPM);
        } else {
          Serial.println("BPM key not found in JSON");
          pulseStatus = "DATA ERROR";
          http.end();
          return;
        }
        
        // Extract status if available, or determine based on BPM
        if (doc.containsKey("status")) {
          pulseStatus = doc["status"].as<String>();
        } else {
          // Determine status based on BPM
          if (pulseBPM <= 0) {
            pulseStatus = "NO DATA";
          } else if (pulseBPM < 60 || pulseBPM > 100) {
            pulseStatus = "DANGER";
          } else if (pulseBPM < 65 || pulseBPM > 90) {
            pulseStatus = "WARNING";
          } else {
            pulseStatus = "NORMAL";
          }
        }
        
        Serial.println("Pulse data updated successfully");
      } else {
        Serial.print("JSON parsing failed: ");
        Serial.println(error.c_str());
        pulseStatus = "PARSE ERROR";
      }
    } else {
      Serial.println("Failed to get pulse data");
      pulseStatus = "SERVER ERROR";
    }
    http.end();
  } else {
    Serial.println("WiFi disconnected. Attempting to reconnect...");
    WiFi.begin(ssid, password);
    pulseStatus = "WIFI ERROR";
  }
}

void sendSensorData() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;
    
    // Create JSON data
    String jsonData = "{\"gas\":" + String(gasValue) + 
                     ",\"temperature\":" + String(temperature, 1) + 
                     ",\"humidity\":" + String(humidity, 1) + 
                     ",\"alert\":" + String(alertActive ? "true" : "false") + 
                     ",\"buzzer\":" + String(digitalRead(BUZZER_PIN) ? "true" : "false") + "}";
    
    // Start HTTP connection
    http.begin(client, serverURL);
    http.addHeader("Content-Type", "application/json");
    
    // Send POST request
    int httpResponseCode = http.POST(jsonData);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("HTTP Response code: " + String(httpResponseCode));
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
    }
    
    // Free resources
    http.end();
  } else {
    Serial.println("WiFi Disconnected");
    // Attempt to reconnect
    WiFi.begin(ssid, password);
  }
}
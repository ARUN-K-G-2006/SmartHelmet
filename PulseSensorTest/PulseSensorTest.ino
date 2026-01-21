#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

// Pulse sensor settings
const int pulsePin = A0;
int threshold = 650; // Your calculated threshold

// WiFi credentials
const char* ssid = "Galaxy A35 5G 88E3";
const char* password = "Arun1010";

// Server details
const char* serverURL = "http://10.54.64.195:3000/api/pulse-data";

unsigned long lastBeatTime = 0;
bool beatFound = false;
int bpm = 0;

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nConnected to WiFi");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  int signal = analogRead(pulsePin);

  if (signal > threshold && !beatFound) {
    beatFound = true;
    unsigned long currentTime = millis();
    
    if (lastBeatTime > 0) {
      unsigned long timeBetweenBeats = currentTime - lastBeatTime;
      // Only calculate BPM for realistic time intervals
      if (timeBetweenBeats > 250) { 
        bpm = 60000 / timeBetweenBeats;
        Serial.print("BPM: ");
        Serial.println(bpm);
        // Send data to server
        sendPulseData(bpm);
      }
    }
    lastBeatTime = currentTime;
  }

  if (signal < threshold && beatFound) {
    beatFound = false;
  }
  
  // Send data every 10 seconds even if no change (to show device is alive)
  static unsigned long lastSendTime = 0;
  if (millis() - lastSendTime > 10000) {
    sendPulseData(bpm);
    lastSendTime = millis();
  }
  
  delay(10);
}

void sendPulseData(int bpm) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;
    
    // Create JSON data
    String jsonData = "{\"bpm\":" + String(bpm) + "}";
    
    // Start HTTP connection
    http.begin(client, serverURL);
    http.addHeader("Content-Type", "application/json");
    
    // Send POST request
    int httpResponseCode = http.POST(jsonData);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("HTTP Response code: " + String(httpResponseCode));
      Serial.println("Response: " + response);
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
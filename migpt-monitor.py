#!/usr/bin/env python3
"""
Monitor xiaoai switch via MQTT and control migpt-ultimate.
- When switch turns ON: wait 10 seconds, then start migpt-ultimate
- When switch turns OFF: immediately stop migpt-ultimate
"""

import subprocess
import sys
import time
import threading
import paho.mqtt.client as mqtt

MQTT_HOST = "202.118.188.17"
MQTT_PORT = 1883
MQTT_TOPIC = "ESP_Easy/status"  # ESP-Easy publishes state to this topic

XIAOAI_INDEX = None  # Will be discovered from ESP-Easy HTTP API
ESP_WEB_URL = "http://202.118.188.111"

CTRL_SCRIPT = "/home/pi/migpt-ctrl.sh"

# State tracking
last_state = None  # None = unknown, 1 = on, 0 = off
on_timer = None    # Thread object for the 10-second delay
on_timer_cancel = False


def discover_xiaoai_index():
    """Find which position xiaoai is in the ESP_Easy/status comma-separated payload."""
    import urllib.request
    import json
    try:
        resp = urllib.request.urlopen(f"{ESP_WEB_URL}/json", timeout=5)
        data = json.loads(resp.read())
        sensors = data.get("Sensors", [])
        for idx, sensor in enumerate(sensors):
            task_values = sensor.get("TaskValues", [])
            if task_values:
                name = task_values[0].get("Name", "")
                if name == "xiaoai":
                    return idx
    except Exception as e:
        print(f"Failed to discover xiaoai index from ESP-Easy HTTP: {e}")
    return None


def start_migpt():
    """Execute migpt-ctrl.sh on"""
    try:
        subprocess.Popen(
            ["bash", CTRL_SCRIPT, "on"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            close_fds=True
        )
        print("migpt-ultimate start command launched")
    except Exception as e:
        print(f"Error starting migpt-ultimate: {e}")


def stop_migpt():
    """Execute migpt-ctrl.sh off"""
    try:
        subprocess.Popen(
            ["bash", CTRL_SCRIPT, "off"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            close_fds=True
        )
        print("migpt-ultimate stop command launched")
    except Exception as e:
        print(f"Error stopping migpt-ultimate: {e}")


def on_delay_thread():
    """Wait 10 seconds after switch ON, then start migpt-ultimate.
    Can be cancelled if switch turns OFF during the wait."""
    global on_timer_cancel
    on_timer_cancel = False
    print("Switch ON detected, waiting 10 seconds before starting migpt-ultimate...")
    for i in range(10):
        if on_timer_cancel:
            print("Timer cancelled — switch turned OFF during wait")
            return
        time.sleep(1)
    if not on_timer_cancel:
        print("10 seconds elapsed, starting migpt-ultimate")
        start_migpt()


def on_mqtt_message(client, userdata, msg):
    """Handle incoming MQTT messages from ESP_Easy/status."""
    global last_state, on_timer, on_timer_cancel

    payload = msg.payload.decode("utf-8")
    values = [v.strip() for v in payload.split(",")]

    if XIAOAI_INDEX is None:
        return

    if XIAOAI_INDEX >= len(values):
        return

    try:
        current_state = int(values[XIAOAI_INDEX])
    except ValueError:
        return

    if current_state == last_state:
        return  # No change

    print(f"Xiaoai switch state changed: {last_state} -> {current_state}")

    if current_state == 1 and last_state != 1:
        # Switch turned ON — start 10-second delay timer
        if on_timer and on_timer.is_alive():
            on_timer_cancel = True  # Cancel any existing timer
            on_timer.join()
        on_timer = threading.Thread(target=on_delay_thread, daemon=True)
        on_timer.start()

    elif current_state == 0:
        # Switch turned OFF — cancel timer and stop immediately
        on_timer_cancel = True
        if on_timer and on_timer.is_alive():
            on_timer.join(timeout=2)
        stop_migpt()

    last_state = current_state


def on_mqtt_connect(client, userdata, flags, rc):
    if rc != 0:
        print(f"MQTT connection failed, return code {rc}")
        return
    print(f"Connected to MQTT broker at {MQTT_HOST}:{MQTT_PORT}")
    client.subscribe(MQTT_TOPIC)
    print(f"Subscribed to {MQTT_TOPIC}")


def on_mqtt_disconnect(client, userdata, rc):
    print(f"Disconnected from MQTT broker (rc={rc}), will auto-reconnect")


def main():
    global XIAOAI_INDEX

    print("Discovering xiaoai switch position in ESP-Easy...")
    XIAOAI_INDEX = discover_xiaoai_index()
    if XIAOAI_INDEX is None:
        print("ERROR: Could not discover xiaoai task index from ESP-Easy HTTP API")
        print("Cannot determine which position xiaoai is in the MQTT status payload")
        sys.exit(1)
    print(f"Xiaoai is at index {XIAOAI_INDEX} in ESP_Easy/status payload")

    client = mqtt.Client()
    client.on_connect = on_mqtt_connect
    client.on_disconnect = on_mqtt_disconnect
    client.on_message = on_mqtt_message

    # Auto-reconnect settings
    client.reconnect_on_failure = True

    print(f"Connecting to MQTT broker at {MQTT_HOST}:{MQTT_PORT}...")
    try:
        client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    except Exception as e:
        print(f"Failed to connect to MQTT: {e}")
        sys.exit(1)

    client.loop_forever()


if __name__ == "__main__":
    main()
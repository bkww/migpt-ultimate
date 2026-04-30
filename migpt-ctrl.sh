#!/bin/bash

PID_FILE="/tmp/migpt-ultimate.pid"
LOG_FILE="/tmp/migpt-ultimate.log"
WORK_DIR="$HOME/migpt-ultimate"
START_CMD="migpt-ultimate start -c config.yaml"

case "$1" in
    on)
        if [ -f "$PID_FILE" ]; then
            OLD_PID=$(cat "$PID_FILE")
            if ps -p "$OLD_PID" > /dev/null 2>&1; then
                echo "migpt-ultimate already running (PID $OLD_PID)"
                exit 0
            fi
            rm -f "$PID_FILE"
        fi
        cd "$WORK_DIR"
        setsid $START_CMD >> "$LOG_FILE" 2>&1 &
        disown
        PID=$!
        echo "$PID" > "$PID_FILE"
        echo "migpt-ultimate started (PID $PID)"
        ;;
    off)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if ps -p "$PID" > /dev/null 2>&1; then
                kill "$PID"
                echo "migpt-ultimate stopped (PID $PID)"
            fi
            rm -f "$PID_FILE"
        else
            echo "migpt-ultimate not running"
        fi
        ;;
    *)
        echo "Usage: $0 {on|off}"
        exit 1
        ;;
esac
#!/bin/bash

# Kill processes on ports 4000 and 9000
echo "🔄 Killing processes on ports 4000 and 9000..."

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pids" ]; then
        echo "  ⚡ Killing processes on port $port: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null
    else
        echo "  ✅ Port $port is already free"
    fi
}

# Kill processes on both ports
kill_port 4000
kill_port 9000

# Wait a moment for processes to fully terminate
sleep 1

echo "✅ Port cleanup complete"

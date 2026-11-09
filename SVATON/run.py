"""
SVATON System Launcher
"""

import subprocess
import threading
import time
import webbrowser
import sys
import os

def run_api():
    print("🚦 Starting SVATON API Server...")
    subprocess.run([sys.executable, "-m", "uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"])

def run_dashboard():
    print("📊 Starting SVATON Dashboard...")
    time.sleep(3)
    subprocess.run([sys.executable, "-m", "streamlit", "run", "dashboard.py", "--server.port", "8501"])

if __name__ == "__main__":
    print("=" * 50)
    print("🚦 SVATON - Smart Vision AI Traffic Optimization Network")
    print("=" * 50)
    
    api_thread = threading.Thread(target=run_api, daemon=True)
    api_thread.start()
    
    time.sleep(5)
    
    def open_browser():
        time.sleep(2)
        webbrowser.open("http://localhost:8501")
        print("\n✅ System ready!")
        print("📱 Dashboard: http://localhost:8501")
    
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    try:
        run_dashboard()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        sys.exit(0)
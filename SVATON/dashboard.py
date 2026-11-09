"""
SVATON Dashboard - Streamlit Frontend
"""

import streamlit as st
import requests
import pandas as pd
import plotly.graph_objs as go
import time
import numpy as np

st.set_page_config(
    page_title="SVATON - Smart Traffic Control",
    page_icon="🚦",
    layout="wide"
)

API_URL = "http://localhost:8000"

# Custom CSS
st.markdown("""
<style>
    .stApp { background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%); }
    h1, h2, h3, h4, h5, h6 { color: white !important; }
    .metric-card { background: rgba(255,255,255,0.15); border-radius: 15px; padding: 20px; text-align: center; }
    .metric-value { font-size: 36px; font-weight: bold; color: #00ffaa; }
    .signal-green { color: #00ff00; }
    .signal-red { color: #ff4444; }
    .emergency-badge { background: #ff4444; color: white; padding: 10px; border-radius: 10px; animation: pulse 1s infinite; text-align: center; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
</style>
""", unsafe_allow_html=True)

st.markdown("# 🚦 SVATON")
st.markdown("### Smart Vision AI Traffic Optimization Network")
st.markdown("---")

# Sidebar
with st.sidebar:
    st.markdown("## 🎮 Control Panel")
    
    col1, col2, col3 = st.columns(3)
    with col1:
        if st.button("🏙️ Normal"):
            requests.post(f"{API_URL}/mode/normal")
    with col2:
        if st.button("🔥 Peak"):
            requests.post(f"{API_URL}/mode/peak")
    with col3:
        if st.button("🌙 Off"):
            requests.post(f"{API_URL}/mode/off")
    
    st.markdown("---")
    emergency_lane = st.selectbox("Ambulance Lane", ['A', 'B', 'C', 'D'])
    if st.button("🚨 TRIGGER AMBULANCE", type="primary"):
        response = requests.post(f"{API_URL}/emergency/trigger?lane={emergency_lane}")
        if response.status_code == 200:
            st.success(response.json().get('message', 'Emergency activated!'))
            st.balloons()
    
    if st.button("✅ Clear Emergency"):
        requests.post(f"{API_URL}/emergency/clear")
        st.success("Emergency cleared")
    
    if st.button("🔄 Reset"):
        requests.post(f"{API_URL}/reset")
        st.success("Reset complete")

# Metrics row
col1, col2, col3, col4 = st.columns(4)

# Main loop
placeholder = st.empty()

while True:
    try:
        response = requests.get(f"{API_URL}/status", timeout=2)
        if response.status_code == 200:
            data = response.json()
            queues = data.get('queues', {'A': 0, 'B': 0, 'C': 0, 'D': 0})
            densities = data.get('densities', {'A': 0, 'B': 0, 'C': 0, 'D': 0})
            current_green = data.get('current_green', 'A')
            emergency = data.get('emergency_mode', False)
            
            with placeholder.container():
                # Metrics
                m1, m2, m3, m4 = st.columns(4)
                m1.metric("Total Vehicles", sum(queues.values()))
                m2.metric("Avg Density", f"{sum(densities.values())/4:.0%}")
                m3.metric("Emergency", "ACTIVE" if emergency else "Normal")
                m4.metric("Vehicles Served", data.get('statistics', {}).get('vehicles_served', 0))
                
                # Lane display
                st.markdown("## 🗺️ Intersection Status")
                cols = st.columns(4)
                for i, lane in enumerate(['A', 'B', 'C', 'D']):
                    is_green = (current_green == lane)
                    color = "🟢" if is_green else "🔴"
                    with cols[i]:
                        st.markdown(f"""
                        <div style="background: rgba(0,0,0,0.5); border-radius: 10px; padding: 15px; text-align: center;">
                            <h2>{color} Lane {lane}</h2>
                            <p><b>Vehicles:</b> {queues[lane]}</p>
                            <p><b>Density:</b> {densities[lane]:.0%}</p>
                        </div>
                        """, unsafe_allow_html=True)
                
                # Charts
                c1, c2 = st.columns(2)
                with c1:
                    fig = go.Figure(data=[go.Bar(x=list(queues.keys()), y=list(queues.values()))])
                    fig.update_layout(title="Queue Lengths", height=350, plot_bgcolor='rgba(0,0,0,0)', paper_bgcolor='rgba(0,0,0,0)', font_color='white')
                    st.plotly_chart(fig, use_container_width=True)
                
                with c2:
                    fig2 = go.Figure(data=[go.Bar(x=list(densities.keys()), y=[d*100 for d in densities.values()])])
                    fig2.update_layout(title="Density (%)", height=350, plot_bgcolor='rgba(0,0,0,0)', paper_bgcolor='rgba(0,0,0,0)', font_color='white')
                    st.plotly_chart(fig2, use_container_width=True)
                
                if emergency:
                    st.markdown('<div class="emergency-badge">🚑 EMERGENCY CORRIDOR ACTIVE - All signals GREEN for ambulance 🚑</div>', unsafe_allow_html=True)
                
                st.caption("🔄 Auto-refreshing every 2 seconds")
    
    except Exception as e:
        with placeholder.container():
            st.error(f"⚠️ API not connected. Make sure the backend is running: python api.py")
            st.info("1. Open a NEW terminal\n2. Run: uvicorn api:app --reload\n3. Then refresh this page")
    
    time.sleep(2)
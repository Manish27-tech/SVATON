"""
FastAPI Backend for SVATON
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional, List
import asyncio
import json
import time
from datetime import datetime

from traffic_logic import TrafficSignalController
from traffic_simulator import TrafficSimulator
from detection import VehicleDetector

app = FastAPI(title="SVATON - Smart Vision AI Traffic Optimization Network")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

controller = TrafficSignalController(lanes=['A', 'B', 'C', 'D'])
simulator = TrafficSimulator()
detector = VehicleDetector()

LANE_CAPACITIES = {'A': 50, 'B': 40, 'C': 45, 'D': 35}

class TrafficAnalysisRequest(BaseModel):
    lane_counts: Dict[str, int]
    ambulance_detected: bool = False
    ambulance_lane: Optional[str] = None

class TrafficAnalysisResponse(BaseModel):
    densities: Dict[str, float]
    signal_timings: Dict[str, int]
    recommended_green_lane: str
    emergency_mode: bool
    queue_lengths: Dict[str, int]
    timestamp: str

@app.get("/")
async def root():
    return {
        "system": "SVATON Active",
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "lanes": ['A', 'B', 'C', 'D']
    }

@app.get("/status")
async def get_status():
    queues = simulator.get_queue_lengths()
    densities = simulator.get_densities(LANE_CAPACITIES)
    
    return {
        "queues": queues,
        "densities": densities,
        "current_green": controller.current_green_lane,
        "emergency_mode": simulator.emergency_active,
        "statistics": simulator.get_statistics()
    }

@app.post("/analyze", response_model=TrafficAnalysisResponse)
async def analyze_traffic(request: TrafficAnalysisRequest):
    queue_lengths = simulator.get_queue_lengths()
    densities = simulator.get_densities(LANE_CAPACITIES)
    wait_times = simulator.get_average_wait_times()
    
    emergency_lane = None
    if request.ambulance_detected or simulator.emergency_active:
        emergency_lane = request.ambulance_lane or simulator.emergency_lane or 'A'
        simulator.trigger_emergency(emergency_lane)
    
    timings = controller.calculate_optimal_timing(densities, emergency_lane)
    next_green_lane = controller.get_next_lane(densities)
    if emergency_lane:
        next_green_lane = emergency_lane
    
    reward = controller.calculate_reward(densities, wait_times, queue_lengths)
    controller.update_from_feedback(densities, next_green_lane, reward)
    
    return TrafficAnalysisResponse(
        densities=densities,
        signal_timings=timings,
        recommended_green_lane=next_green_lane,
        emergency_mode=emergency_lane is not None,
        queue_lengths=queue_lengths,
        timestamp=datetime.now().isoformat()
    )

@app.post("/emergency/trigger")
async def trigger_emergency(lane: str = "A"):
    if lane not in ['A', 'B', 'C', 'D']:
        raise HTTPException(status_code=400, detail="Invalid lane")
    result = simulator.trigger_emergency(lane)
    return result

@app.post("/emergency/clear")
async def clear_emergency():
    simulator.clear_emergency()
    return {"message": "Emergency mode cleared"}

@app.post("/mode/peak")
async def set_peak_mode():
    simulator.set_peak_hour()
    return {"message": "Peak hour mode activated"}

@app.post("/mode/normal")
async def set_normal_mode():
    simulator.set_normal_hour()
    return {"message": "Normal mode activated"}

@app.post("/mode/off")
async def set_off_mode():
    simulator.set_off_hour()
    return {"message": "Off-peak mode activated"}

@app.post("/reset")
async def reset_simulation():
    simulator.reset()
    return {"message": "Simulation reset"}

@app.get("/statistics")
async def get_statistics():
    stats = simulator.get_statistics()
    stats['average_wait_times'] = simulator.get_average_wait_times()
    return stats

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            queues = simulator.get_queue_lengths()
            densities = simulator.get_densities(LANE_CAPACITIES)
            green_lane = controller.current_green_lane
            if simulator.emergency_active:
                green_lane = simulator.emergency_lane
            
            simulator.step(green_lane, 2)
            
            await websocket.send_json({
                "type": "state_update",
                "queues": queues,
                "densities": densities,
                "current_green": green_lane,
                "emergency_active": simulator.emergency_active,
                "statistics": simulator.get_statistics(),
                "timestamp": time.time()
            })
            
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
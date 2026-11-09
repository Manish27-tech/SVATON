"""
Vehicle Detection Module using YOLOv8
"""

import cv2
from ultralytics import YOLO
import numpy as np

class VehicleDetector:
    def __init__(self, model_path='yolov8n.pt'):
        self.model = YOLO(model_path)
        self.vehicle_classes = {
            2: 'car',
            3: 'motorcycle',
            5: 'bus',
            7: 'truck'
        }
        self.ambulance_detected = False
        
    def detect_vehicles(self, frame):
        results = self.model(frame, verbose=False)
        detections = []
        
        for r in results:
            boxes = r.boxes
            if boxes is not None:
                for box in boxes:
                    cls_id = int(box.cls[0])
                    if cls_id in self.vehicle_classes:
                        detections.append({
                            'class': self.vehicle_classes[cls_id],
                            'confidence': float(box.conf[0]),
                            'bbox': box.xyxy[0].tolist()
                        })
        return detections
    
    def count_vehicles_by_lane(self, frame, lane_regions):
        all_detections = self.detect_vehicles(frame)
        lane_counts = {lane: 0 for lane in lane_regions}
        
        for detection in all_detections:
            bbox = detection['bbox']
            center_x = (bbox[0] + bbox[2]) / 2
            center_y = (bbox[1] + bbox[3]) / 2
            
            for lane, region in lane_regions.items():
                if self._point_in_rectangle(center_x, center_y, region):
                    lane_counts[lane] += 1
                    break
                    
        return lane_counts
    
    def detect_ambulance(self, frame):
        return self.ambulance_detected
    
    def set_ambulance_mode(self, status):
        self.ambulance_detected = status
        
    def _point_in_rectangle(self, x, y, rect):
        x1, y1, x2, y2 = rect
        return x1 <= x <= x2 and y1 <= y <= y2
    
    def get_traffic_density(self, vehicle_counts, lane_capacities):
        densities = {}
        for lane, count in vehicle_counts.items():
            capacity = lane_capacities.get(lane, 100)
            densities[lane] = min(count / capacity, 1.0)
        return densities
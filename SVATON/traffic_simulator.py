"""
Traffic Simulator - Simulates vehicle flow for demo purposes
"""

import random
import time
from collections import deque

class TrafficSimulator:
    def __init__(self):
        self.lanes = ['A', 'B', 'C', 'D']
        self.queues = {lane: 0 for lane in self.lanes}
        self.arrival_rates = {
            'A': 3,
            'B': 1.5,
            'C': 2,
            'D': 1
        }
        self.departure_rate = 2.5
        self.history = {lane: deque(maxlen=100) for lane in self.lanes}
        self.time = 0
        self.emergency_active = False
        self.emergency_lane = None
        self.waiting_times = {lane: [] for lane in self.lanes}
        self.total_vehicles_served = 0
        
    def step(self, green_lane, duration_seconds, steps_per_second=10):
        tick_duration = 1.0 / steps_per_second
        steps_to_run = int(duration_seconds * steps_per_second)
        
        for _ in range(steps_to_run):
            for lane in self.lanes:
                arrival_rate = self.arrival_rates[lane]
                if self.emergency_active and lane == self.emergency_lane:
                    arrival_rate = max(arrival_rate, 4)
                
                arrival_prob = arrival_rate * tick_duration
                if random.random() < arrival_prob:
                    self.queues[lane] += 1
                    
            if green_lane and self.queues[green_lane] > 0:
                departures = min(self.queues[green_lane], 
                               int(self.departure_rate * tick_duration))
                self.queues[green_lane] -= departures
                self.total_vehicles_served += departures
                
            self.time += tick_duration
            
        return self.queues.copy()
    
    def get_queue_lengths(self):
        return self.queues.copy()
    
    def get_densities(self, lane_capacities=None):
        if lane_capacities is None:
            lane_capacities = {'A': 50, 'B': 40, 'C': 45, 'D': 35}
        
        densities = {}
        for lane in self.lanes:
            capacity = lane_capacities[lane]
            densities[lane] = min(self.queues[lane] / capacity, 1.0)
        return densities
    
    def get_average_wait_times(self):
        avg_wait = {}
        for lane in self.lanes:
            if len(self.waiting_times[lane]) > 0:
                avg_wait[lane] = sum(self.waiting_times[lane]) / len(self.waiting_times[lane])
            else:
                avg_wait[lane] = 0
        return avg_wait
    
    def trigger_emergency(self, lane='A'):
        self.emergency_active = True
        self.emergency_lane = lane
        self.queues[lane] += 2
        return {
            'emergency_triggered': True,
            'lane': lane,
            'message': f'🚑 Ambulance detected on Lane {lane}!'
        }
    
    def clear_emergency(self):
        self.emergency_active = False
        self.emergency_lane = None
    
    def set_peak_hour(self):
        self.arrival_rates = {'A': 6, 'B': 4, 'C': 5, 'D': 3}
        
    def set_normal_hour(self):
        self.arrival_rates = {'A': 3, 'B': 1.5, 'C': 2, 'D': 1}
    
    def set_off_hour(self):
        self.arrival_rates = {'A': 1, 'B': 0.5, 'C': 0.8, 'D': 0.3}
    
    def reset(self):
        self.queues = {lane: 0 for lane in self.lanes}
        self.time = 0
        self.emergency_active = False
        self.emergency_lane = None
        self.waiting_times = {lane: [] for lane in self.lanes}
        self.total_vehicles_served = 0
    
    def get_statistics(self):
        total_waiting = sum(self.queues.values())
        avg_density = sum(self.get_densities().values()) / 4
        
        return {
            'total_vehicles_waiting': total_waiting,
            'average_density': round(avg_density, 2),
            'vehicles_served': self.total_vehicles_served,
            'simulation_time_seconds': round(self.time, 1),
            'emergency_active': self.emergency_active
        }
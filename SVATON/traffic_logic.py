"""
Traffic Signal Controller with Reinforcement Learning
"""

import numpy as np
from collections import deque
import json

class TrafficSignalController:
    def __init__(self, lanes=['A', 'B', 'C', 'D']):
        self.lanes = lanes
        self.signal_durations = {lane: 30 for lane in lanes}
        self.current_green_lane = lanes[0]
        self.time_remaining = 30
        self.history = {lane: deque(maxlen=20) for lane in lanes}
        self.q_table = {}
        self.alpha = 0.1
        self.gamma = 0.9
        self.epsilon = 0.1
        self.waiting_times = {lane: 0 for lane in lanes}
        
    def calculate_optimal_timing(self, densities, emergency_lane=None):
        if emergency_lane:
            timings = {lane: 5 for lane in self.lanes}
            timings[emergency_lane] = 60
            route = self._get_emergency_route(emergency_lane)
            for lane in route:
                timings[lane] = 45
            return timings
        
        total_density = sum(densities.values())
        if total_density == 0:
            return {lane: 20 for lane in self.lanes}
        
        timings = {}
        for lane in self.lanes:
            proportion = densities[lane] / total_density
            timings[lane] = max(10, min(90, int(proportion * 120)))
        
        return timings
    
    def get_next_lane(self, densities):
        state = self._get_state(densities)
        
        if np.random.random() < self.epsilon:
            return np.random.choice(self.lanes)
        else:
            best_lane = self.lanes[0]
            best_value = -float('inf')
            for lane in self.lanes:
                q_value = self._get_q_value(state, lane)
                if q_value > best_value:
                    best_value = q_value
                    best_lane = lane
            return best_lane
    
    def update_from_feedback(self, densities, chosen_lane, reward):
        state = self._get_state(densities)
        current_q = self._get_q_value(state, chosen_lane)
        
        new_q = current_q + self.alpha * (reward + self.gamma * self._get_max_future_q(state) - current_q)
        
        state_key = self._state_to_key(state)
        self.q_table[f"{state_key}_{chosen_lane}"] = new_q
        
    def calculate_reward(self, densities, waiting_times, queue_lengths):
        density_penalty = -sum(densities.values())
        wait_penalty = -sum(waiting_times.values()) / 100
        throughput_reward = sum(queue_lengths.values()) / 100
        return density_penalty + wait_penalty + throughput_reward
    
    def create_emergency_corridor(self, start_lane, destination_lane):
        route_order = []
        current = start_lane
        
        adjacency = {
            'A': ['B', 'C'],
            'B': ['A', 'D'],
            'C': ['A', 'D'],
            'D': ['B', 'C']
        }
        
        visited = set()
        while current != destination_lane and current not in visited:
            visited.add(current)
            route_order.append(current)
            for next_lane in adjacency.get(current, []):
                if next_lane not in visited:
                    current = next_lane
                    break
        
        route_order.append(destination_lane)
        return route_order
    
    def _get_state(self, densities):
        state = []
        for lane in self.lanes:
            if densities[lane] < 0.3:
                state.append(0)
            elif densities[lane] < 0.7:
                state.append(1)
            else:
                state.append(2)
        return tuple(state)
    
    def _state_to_key(self, state):
        return ''.join(map(str, state))
    
    def _get_q_value(self, state, action):
        state_key = self._state_to_key(state)
        return self.q_table.get(f"{state_key}_{action}", 0.0)
    
    def _get_max_future_q(self, state):
        state_key = self._state_to_key(state)
        max_q = -float('inf')
        for lane in self.lanes:
            q = self.q_table.get(f"{state_key}_{lane}", 0.0)
            max_q = max(max_q, q)
        return max_q if max_q != -float('inf') else 0.0
    
    def _get_emergency_route(self, start_lane):
        order = [start_lane]
        all_lanes = [l for l in self.lanes if l != start_lane]
        order.extend(all_lanes)
        return order
/**
 * SVATON - Phase 7: Complete React Dashboard
 * Hackathon Edition - Dijkstra's Algorithm for Optimal Path Finding
 * 
 * Algorithm: Dijkstra's Shortest Path with Vehicle Weight
 * - Each road has weight = number of vehicles (congestion)
 * - Finds path with MINIMUM total vehicles
 * - Explores ALL possible paths
 * - Shows algorithm steps and reasoning
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Activity, Zap, Play, Square, RotateCw, X } from 'lucide-react';

// ============================================================================
// CITY CONFIGURATION - 12 ROADS
// ============================================================================

const CITY_ROADS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

const ROAD_POSITIONS = {
  A: { x: 120, y: 80, label: 'A' },
  B: { x: 280, y: 60, label: 'B' },
  C: { x: 440, y: 80, label: 'C' },
  D: { x: 600, y: 80, label: 'D' },
  E: { x: 120, y: 220, label: 'E' },
  F: { x: 280, y: 180, label: 'F' },
  G: { x: 440, y: 180, label: 'G' },
  H: { x: 600, y: 220, label: 'H' },
  I: { x: 120, y: 360, label: 'I' },
  J: { x: 280, y: 340, label: 'J' },
  K: { x: 440, y: 360, label: 'K' },
  L: { x: 600, y: 360, label: 'L' }
};

const ROAD_CONNECTIONS = {
  A: ['B', 'E'],
  B: ['A', 'C', 'F'],
  C: ['B', 'D', 'G'],
  D: ['C', 'H'],
  E: ['A', 'F', 'I'],
  F: ['B', 'E', 'G', 'J'],
  G: ['C', 'F', 'H', 'K'],
  H: ['D', 'G', 'L'],
  I: ['E', 'J'],
  J: ['F', 'I', 'K'],
  K: ['G', 'J', 'L'],
  L: ['H', 'K']
};

// ============================================================================
// DIJKSTRA'S ALGORITHM IMPLEMENTATION
// ============================================================================

class DijkstraPathFinder {
  constructor(roadData, connections) {
    this.roadData = roadData;
    this.connections = connections;
    this.visited = new Set();
    this.distances = {};
    this.previous = {};
    this.unvisited = new Set();
    this.steps = [];
    this.paths = [];
  }

  // Get weight of a road (number of vehicles)
  getWeight(road) {
    return this.roadData[road]?.vehicles || 0;
  }

  // Get all neighbors of a road
  getNeighbors(road) {
    return this.connections[road] || [];
  }

  // Calculate total path cost
  calculatePathCost(path) {
    return path.reduce((sum, road) => sum + this.getWeight(road), 0);
  }

  // Find ALL possible paths using DFS
  findAllPaths(start, end) {
    const allPaths = [];
    const visited = new Set();

    const dfs = (current, target, path) => {
      if (current === target) {
        allPaths.push([...path]);
        return;
      }

      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          path.push(neighbor);
          dfs(neighbor, target, path);
          path.pop();
          visited.delete(neighbor);
        }
      }
    };

    visited.add(start);
    dfs(start, end, [start]);

    // Score each path by total vehicles
    const scoredPaths = allPaths.map(path => ({
      path,
      totalVehicles: this.calculatePathCost(path),
      length: path.length,
      roadDetails: path.map(road => ({
        road,
        vehicles: this.getWeight(road)
      }))
    }));

    // Sort by total vehicles (lowest first - least congested)
    scoredPaths.sort((a, b) => a.totalVehicles - b.totalVehicles);

    return scoredPaths;
  }

  // Find optimal path using Dijkstra's Algorithm
  findOptimalPath(start, end) {
    // Initialize distances
    CITY_ROADS.forEach(road => {
      this.distances[road] = Infinity;
      this.previous[road] = null;
      this.unvisited.add(road);
    });
    this.distances[start] = 0;
    this.steps = [];

    let step = 1;
    let current = start;

    while (this.unvisited.size > 0) {
      // Find node with smallest distance
      let minDist = Infinity;
      let minNode = null;
      for (const node of this.unvisited) {
        if (this.distances[node] < minDist) {
          minDist = this.distances[node];
          minNode = node;
        }
      }

      if (minNode === null || minDist === Infinity) break;

      current = minNode;
      this.unvisited.delete(current);
      this.visited.add(current);

      // Log step
      this.steps.push({
        step: step++,
        current: current,
        distance: this.distances[current],
        vehicles: this.getWeight(current),
        visited: [...this.visited],
        unvisited: [...this.unvisited]
      });

      // Check if we reached the end
      if (current === end) break;

      // Update distances to neighbors
      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (!this.visited.has(neighbor)) {
          const weight = this.getWeight(neighbor);
          const alt = this.distances[current] + weight;
          if (alt < this.distances[neighbor]) {
            this.distances[neighbor] = alt;
            this.previous[neighbor] = current;
          }
        }
      }
    }

    // Reconstruct the path
    const path = [];
    let node = end;
    while (node !== null) {
      path.unshift(node);
      node = this.previous[node];
    }

    // Find all paths for comparison
    const allPaths = this.findAllPaths(start, end);

    // Calculate total vehicles on the optimal path
    const totalVehicles = this.calculatePathCost(path);

    return {
      path,
      totalVehicles,
      length: path.length,
      distances: this.distances,
      previous: this.previous,
      steps: this.steps,
      allPaths: allPaths,
      roadDetails: path.map(road => ({
        road,
        vehicles: this.getWeight(road)
      }))
    };
  }

  // Get path comparison with details
  getPathComparison(start, end) {
    const result = this.findOptimalPath(start, end);
    return {
      optimalPath: result.path,
      optimalVehicles: result.totalVehicles,
      allPaths: result.allPaths.slice(0, 6).map(p => ({
        path: p.path,
        vehicles: p.totalVehicles,
        length: p.length,
        isOptimal: p.path.join(',') === result.path.join(',')
      })),
      steps: result.steps,
      algorithm: 'Dijkstra\'s Algorithm with Vehicle Weight'
    };
  }
}

// ============================================================================
// CUSTOM HOOKS - Simulation Data
// ============================================================================

const useSVATONSimulation = () => {
  const initializeRoadData = () => {
    const data = {};
    CITY_ROADS.forEach(road => {
      data[road] = {
        vehicles: Math.floor(Math.random() * 40) + 10,
        capacity: 100,
        density: +(Math.random() * 0.6 + 0.1).toFixed(2),
        waitTime: Math.floor(Math.random() * 30) + 15,
        flowRate: Math.floor(Math.random() * 15) + 5,
        signalState: 'normal'
      };
    });
    return data;
  };

  const [roadData, setRoadData] = useState(initializeRoadData);

  const calculateSignalTiming = (roadData, isEmergency = false, emergencyPath = [], resetRoads = []) => {
    const timings = {};
    const BASE_TIME_PER_VEHICLE = 2.5;
    
    CITY_ROADS.forEach(road => {
      const vehicles = roadData[road]?.vehicles || 0;
      const isInPath = isEmergency && emergencyPath?.includes(road);
      const isReset = isEmergency && resetRoads?.includes(road);
      
      if (isEmergency && isInPath) {
        timings[road] = {
          green: 120,
          current: 0,
          color: 'green',
          isEmergency: true,
          normalGreen: 60,
          status: '🟢 CORRIDOR',
          vehicles: vehicles
        };
      } else if (isEmergency && !isInPath) {
        timings[road] = {
          green: 0,
          current: 0,
          color: 'red',
          isEmergency: true,
          normalGreen: 60,
          status: '🔴 FROZEN',
          vehicles: vehicles
        };
      } else {
        let greenTime = 0;
        if (vehicles > 0) {
          greenTime = Math.round(vehicles * BASE_TIME_PER_VEHICLE);
          greenTime = Math.max(greenTime, 15);
          greenTime = Math.min(greenTime, 120);
        }
        
        timings[road] = {
          green: greenTime,
          current: 0,
          color: 'red',
          isEmergency: false,
          normalGreen: greenTime,
          status: vehicles === 0 ? '🔴 NO VEHICLES' : '🔄 NORMAL',
          vehicles: vehicles
        };
      }
    });
    
    return timings;
  };

  const [signalTiming, setSignalTiming] = useState(() => calculateSignalTiming(roadData));

  const [emergencyMode, setEmergencyMode] = useState(false);
  const [startRoad, setStartRoad] = useState('A');
  const [hospitalRoad, setHospitalRoad] = useState('L');
  
  const [ambulance, setAmbulance] = useState({ 
    active: false, 
    position: 0,
    path: ['A', 'B', 'C', 'G', 'K', 'L'],
    reasoning: '',
    selectedPath: '',
    score: 0,
    pathProgress: 0,
    isMoving: false,
    hasCompleted: false,
    currentRoadIndex: 0,
    passedRoads: [],
    resetRoads: [],
    segmentProgress: 0,
    pathComparison: [],
    algorithmSteps: [],
    dijkstraResult: null
  });

  const animationIntervalRef = useRef(null);
  const emergencyTimeoutRef = useRef(null);

  const calculateMetrics = (roadData) => {
    const values = Object.values(roadData);
    const avgWait = values.reduce((s, r) => s + r.waitTime, 0) / values.length;
    const totalVehicles = values.reduce((s, r) => s + r.vehicles, 0);
    const avgDensity = values.reduce((s, r) => s + r.density, 0) / values.length;
    
    const fuelWastage = +(avgDensity * 8 + 2).toFixed(1);
    const co2Emissions = +(fuelWastage * 1.2 + 1).toFixed(1);
    
    const congestionLevel = avgWait > 60 ? 'HIGH' : avgWait > 40 ? 'MODERATE' : 'LOW';
    const systemHealth = Math.max(20, Math.min(95, 95 - (avgDensity * 30)));
    
    return {
      avgWaitTime: Math.floor(avgWait),
      fuelWastage,
      co2Emissions,
      congestionLevel,
      systemHealth: Math.round(systemHealth),
      optimizationLevel: Math.round(85 - (avgDensity * 10)),
      totalVehicles,
      avgDensity: +avgDensity.toFixed(2)
    };
  };

  const [metrics, setMetrics] = useState(() => calculateMetrics(roadData));

  const [historicalData, setHistoricalData] = useState(
    Array.from({ length: 20 }, (_, i) => ({
      time: `${i}:00`,
      avgWait: Math.floor(Math.random() * 40) + 20,
      density: +(Math.random() * 0.8 + 0.2).toFixed(2)
    }))
  );

  const [predictions, setPredictions] = useState(
    Array.from({ length: 8 }, (_, i) => ({
      period: `+${(i + 1) * 5}m`,
      density: +(Math.random() * 1.2 + 0.3).toFixed(2),
      confidence: +(0.95 - i * 0.03).toFixed(2)
    }))
  );

  const [running, setRunning] = useState(true);

  // ============================================================
  // DIJKSTRA'S ALGORITHM PATH FINDING
  // ============================================================
  const findOptimalPath = (start, end, roadData) => {
    const finder = new DijkstraPathFinder(roadData, ROAD_CONNECTIONS);
    const result = finder.getPathComparison(start, end);
    
    // Build reasoning
    const reasoning = [];
    reasoning.push(`🧠 Dijkstra's Algorithm with Vehicle Weight`);
    reasoning.push(`📊 Total vehicles on optimal path: ${result.optimalVehicles}`);
    
    // Show path details
    const pathDetails = result.allPaths.find(p => p.isOptimal);
    if (pathDetails) {
      reasoning.push(`✅ Path: ${pathDetails.path.join(' → ')}`);
      reasoning.push(`🚗 Vehicle breakdown:`);
      pathDetails.path.forEach(road => {
        const vehicles = roadData[road]?.vehicles || 0;
        reasoning.push(`  ${road}: ${vehicles} vehicles`);
      });
    }
    
    // Show alternative paths
    const alternatives = result.allPaths.filter(p => !p.isOptimal);
    if (alternatives.length > 0) {
      reasoning.push(`📊 Alternative paths:`);
      alternatives.slice(0, 3).forEach((alt, idx) => {
        reasoning.push(`  ${idx + 1}. ${alt.path.join(' → ')} (${alt.vehicles} vehicles)`);
      });
    }

    return {
      selectedPath: result.optimalPath,
      score: result.optimalVehicles,
      reasoning: reasoning.join(' | '),
      routeName: `${result.optimalPath.join('→')} (${result.optimalVehicles} vehicles)`,
      alternatives: result.allPaths.filter(p => !p.isOptimal).slice(0, 3).map(p => ({
        path: p.path,
        score: p.vehicles,
        vehicles: p.vehicles,
        length: p.length
      })),
      roadDetails: result.optimalPath.map(road => ({
        road,
        vehicles: roadData[road]?.vehicles || 0
      })),
      totalVehicles: result.optimalVehicles,
      pathLength: result.optimalPath.length,
      pathComparison: result.allPaths.slice(0, 5).map(p => ({
        path: p.path.join(' → '),
        vehicles: p.vehicles,
        isBest: p.isOptimal
      })),
      algorithmSteps: result.steps,
      dijkstraResult: result
    };
  };

  const stopEmergency = () => {
    setEmergencyMode(false);
    setAmbulance({ 
      active: false, 
      position: 0,
      path: [startRoad, hospitalRoad],
      reasoning: '',
      selectedPath: '',
      score: 0,
      pathProgress: 0,
      isMoving: false,
      hasCompleted: false,
      currentRoadIndex: 0,
      passedRoads: [],
      resetRoads: [],
      segmentProgress: 0,
      pathComparison: [],
      algorithmSteps: [],
      dijkstraResult: null
    });
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    if (emergencyTimeoutRef.current) {
      clearTimeout(emergencyTimeoutRef.current);
      emergencyTimeoutRef.current = null;
    }
  };

  const startEmergency = () => {
    const optimalPath = findOptimalPath(startRoad, hospitalRoad, roadData);
    
    setEmergencyMode(true);
    setAmbulance({
      ...ambulance,
      active: true,
      position: 0,
      path: optimalPath.selectedPath,
      reasoning: optimalPath.reasoning,
      selectedPath: optimalPath.selectedPath.join(' → '),
      score: optimalPath.score,
      routeName: optimalPath.routeName,
      pathProgress: 0,
      isMoving: true,
      hasCompleted: false,
      currentRoadIndex: 0,
      passedRoads: [],
      resetRoads: [],
      segmentProgress: 0,
      pathComparison: optimalPath.pathComparison || [],
      algorithmSteps: optimalPath.algorithmSteps || [],
      dijkstraResult: optimalPath.dijkstraResult || null
    });

    if (emergencyTimeoutRef.current) {
      clearTimeout(emergencyTimeoutRef.current);
    }
    
    const totalSegments = optimalPath.selectedPath.length - 1;
    const totalTime = Math.max(8000, totalSegments * 2500);
    
    emergencyTimeoutRef.current = setTimeout(() => {
      setAmbulance(prev => {
        const allRoads = [...prev.path];
        return {
          ...prev,
          position: 100,
          pathProgress: 100,
          isMoving: false,
          hasCompleted: true,
          currentRoadIndex: prev.path.length - 1,
          passedRoads: allRoads,
          resetRoads: allRoads.slice(0, -1),
          segmentProgress: 100
        };
      });
      
      setTimeout(() => {
        stopEmergency();
      }, 3000);
    }, totalTime);
  };

  // Signal-aware vehicle simulation
  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      // Update road data with SIGNAL-AWARE logic
      setRoadData(prev => {
        const updated = { ...prev };
        CITY_ROADS.forEach(road => {
          const timing = signalTiming[road];
          const isGreen = timing?.color === 'green';
          const isRed = timing?.color === 'red';
          const currentVehicles = updated[road].vehicles;
          
          const arrivalRate = Math.floor(Math.random() * 4) + 1;
          
          if (isGreen) {
            // GREEN: Vehicles LEAVE
            const clearRate = Math.min(Math.floor(currentVehicles * 0.12) + 1, 6);
            const change = arrivalRate - clearRate;
            updated[road].vehicles = Math.max(0, currentVehicles + change);
          } else if (isRed) {
            // RED: Vehicles ACCUMULATE
            updated[road].vehicles = Math.min(150, currentVehicles + arrivalRate);
          } else {
            // YELLOW: Minimal change
            updated[road].vehicles = Math.max(0, currentVehicles + Math.floor(Math.random() * 2) - 1);
          }
          
          updated[road].density = +(updated[road].vehicles / updated[road].capacity).toFixed(2);
          updated[road].waitTime = Math.floor(updated[road].density * 80 + Math.random() * 20);
          updated[road].flowRate = Math.floor(Math.random() * 15) + 5;
        });
        return updated;
      });

      // Update signal timing
      setSignalTiming(prev => {
        const BASE_TIME_PER_VEHICLE = 2.5;
        const updated = { ...prev };
        
        if (ambulance.active) {
          const path = ambulance.path || [startRoad, hospitalRoad];
          const resetRoads = ambulance.resetRoads || [];
          
          CITY_ROADS.forEach(road => {
            const vehicles = roadData[road]?.vehicles || 0;
            const isInPath = path.includes(road);
            const isReset = resetRoads.includes(road);
            
            if (isInPath && !isReset) {
              updated[road] = {
                ...updated[road],
                green: 120,
                color: 'green',
                isEmergency: true,
                status: '🟢 CORRIDOR'
              };
            } else if (!isInPath && !isReset) {
              updated[road] = {
                ...updated[road],
                green: 0,
                color: 'red',
                isEmergency: true,
                status: '🔴 FROZEN'
              };
            } else {
              let greenTime = 0;
              if (vehicles > 0) {
                greenTime = Math.round(vehicles * BASE_TIME_PER_VEHICLE);
                greenTime = Math.max(greenTime, 15);
                greenTime = Math.min(greenTime, 120);
              }
              
              updated[road] = {
                ...updated[road],
                green: greenTime,
                isEmergency: false,
                status: vehicles === 0 ? '🔴 NO VEHICLES' : '↻ NORMAL'
              };
              
              if (updated[road].current < updated[road].green) {
                updated[road].current += 1;
                updated[road].color = updated[road].current < updated[road].green * 0.8 ? 'green' : 'yellow';
              } else {
                updated[road].current = 0;
                updated[road].color = 'red';
              }
            }
          });
        } else {
          CITY_ROADS.forEach(road => {
            const vehicles = roadData[road]?.vehicles || 0;
            let greenTime = 0;
            
            if (vehicles > 0) {
              greenTime = Math.round(vehicles * BASE_TIME_PER_VEHICLE);
              greenTime = Math.max(greenTime, 15);
              greenTime = Math.min(greenTime, 120);
            }
            
            updated[road] = {
              ...updated[road],
              green: greenTime,
              normalGreen: greenTime,
              isEmergency: false,
              status: vehicles === 0 ? '🔴 NO VEHICLES' : '🔄 NORMAL'
            };
            
            if (updated[road].current < updated[road].green) {
              updated[road].current += 1;
              updated[road].color = updated[road].current < updated[road].green * 0.8 ? 'green' : 'yellow';
            } else {
              updated[road].current = 0;
              updated[road].color = 'red';
            }
          });
        }
        
        return updated;
      });

      setMetrics(calculateMetrics(roadData));

      setHistoricalData(prev => {
        const newData = [...prev.slice(1)];
        const currentHour = new Date().getHours();
        const avgDensity = Object.values(roadData).reduce((s, r) => s + r.density, 0) / CITY_ROADS.length;
        const avgWait = Object.values(roadData).reduce((s, r) => s + r.waitTime, 0) / CITY_ROADS.length;
        newData.push({
          time: `${currentHour}:${String(new Date().getMinutes()).padStart(2, '0')}`,
          avgWait: Math.floor(avgWait),
          density: +avgDensity.toFixed(2)
        });
        return newData;
      });

      setPredictions(prev => {
        const avgDensity = Object.values(roadData).reduce((s, r) => s + r.density, 0) / CITY_ROADS.length;
        const newPredictions = [];
        for (let i = 0; i < 8; i++) {
          newPredictions.push({
            period: `+${(i + 1) * 5}m`,
            density: +(avgDensity + (i * 0.03)).toFixed(2),
            confidence: +(0.95 - i * 0.03).toFixed(2)
          });
        }
        return newPredictions;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [running, roadData, ambulance.active, ambulance.isMoving, ambulance.hasCompleted, startRoad, hospitalRoad, signalTiming]);

  // Continuous animation for ambulance movement
  useEffect(() => {
    if (ambulance.active && ambulance.isMoving && ambulance.path) {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
      
      animationIntervalRef.current = setInterval(() => {
        setAmbulance(prev => {
          if (!prev.isMoving || !prev.path) return prev;
          
          const maxProgress = 100;
          const newProgress = Math.min(prev.position + 0.8, maxProgress);
          
          const totalSegments = prev.path.length - 1;
          const progressRatio = newProgress / maxProgress;
          const totalProgress = progressRatio * totalSegments;
          const currentIndex = Math.min(Math.floor(totalProgress), totalSegments - 1);
          const segmentProgress = (totalProgress - currentIndex) * 100;
          
          const passedRoads = [];
          for (let i = 0; i <= currentIndex; i++) {
            if (i < prev.path.length) {
              passedRoads.push(prev.path[i]);
            }
          }
          
          const resetRoads = [];
          for (let i = 0; i < currentIndex; i++) {
            if (i < prev.path.length) {
              resetRoads.push(prev.path[i]);
            }
          }
          
          const isComplete = newProgress >= maxProgress;
          
          return {
            ...prev,
            position: newProgress,
            pathProgress: (newProgress / maxProgress) * 100,
            currentRoadIndex: currentIndex,
            passedRoads: passedRoads,
            resetRoads: resetRoads,
            segmentProgress: segmentProgress,
            isMoving: !isComplete,
            hasCompleted: isComplete
          };
        });
      }, 100);
    } else {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    }
    
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    };
  }, [ambulance.active, ambulance.isMoving]);

  return {
    roadData, signalTiming, emergencyMode, setEmergencyMode, ambulance, setAmbulance,
    metrics, historicalData, predictions, running, setRunning, findOptimalPath,
    stopEmergency, startEmergency, startRoad, setStartRoad, hospitalRoad, setHospitalRoad,
    CITY_ROADS, ROAD_POSITIONS, ROAD_CONNECTIONS
  };
};

// ============================================================================
// COMPONENTS - (Same as before with updated display)
// ============================================================================

const TrafficVisualization = ({ 
  roadData, signalTiming, ambulance, emergencyMode, 
  stopEmergency, startEmergency, startRoad, setStartRoad, 
  hospitalRoad, setHospitalRoad, CITY_ROADS, ROAD_POSITIONS,
  ROAD_CONNECTIONS
}) => {
  const getRoadPosition = (road) => {
    return ROAD_POSITIONS[road] || { x: 300, y: 250 };
  };

  const getAmbulancePosition = () => {
    if (!ambulance.active || !ambulance.path || ambulance.path.length < 2) {
      const startPos = getRoadPosition(startRoad);
      return { x: startPos.x, y: startPos.y, currentRoad: startRoad, nextRoad: ambulance.path?.[1] || hospitalRoad };
    }

    const path = ambulance.path;
    const totalSegments = path.length - 1;
    const progress = ambulance.position / 100;
    const totalProgress = progress * totalSegments;
    const currentSegment = Math.min(Math.floor(totalProgress), totalSegments - 1);
    const segmentFraction = totalProgress - currentSegment;

    const from = getRoadPosition(path[currentSegment]);
    const to = getRoadPosition(path[currentSegment + 1]);

    return {
      x: from.x + (to.x - from.x) * segmentFraction,
      y: from.y + (to.y - from.y) * segmentFraction,
      currentRoad: path[currentSegment],
      nextRoad: path[currentSegment + 1]
    };
  };

  const ambulancePos = getAmbulancePosition();
  const hasPassed = (road) => ambulance.active && ambulance.passedRoads?.includes(road);
  const isReset = (road) => ambulance.active && ambulance.resetRoads?.includes(road);
  const isInPath = (road) => ambulance.active && ambulance.path?.includes(road);

  const drawRoads = () => {
    const elements = [];
    const drawn = new Set();

    CITY_ROADS.forEach(road => {
      const connections = ROAD_CONNECTIONS[road] || [];
      const from = getRoadPosition(road);
      
      connections.forEach(neighbor => {
        const key = [road, neighbor].sort().join('-');
        if (!drawn.has(key)) {
          drawn.add(key);
          const to = getRoadPosition(neighbor);
          const isEmergencyPath = isInPath(road) && isInPath(neighbor);
          const isResetPath = isReset(road) && isReset(neighbor);
          const isPassedPath = hasPassed(road) && hasPassed(neighbor);
          
          let strokeColor = '#475569';
          let strokeWidth = 3;
          let opacity = 0.4;
          
          if (isEmergencyPath && !isResetPath && !isPassedPath) {
            strokeColor = '#22c55e';
            strokeWidth = 8;
            opacity = 0.7;
          } else if (isPassedPath && !isResetPath) {
            strokeColor = '#22c55e';
            strokeWidth = 5;
            opacity = 0.4;
          } else if (isResetPath) {
            strokeColor = '#64748b';
            strokeWidth = 3;
            opacity = 0.3;
          }
          
          elements.push(
            <line
              key={`road-${key}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              opacity={opacity}
            />
          );
        }
      });
    });

    return elements;
  };

  return (
    <div style={{ 
      background: 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(6, 182, 212, 0.2)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity style={{ width: '22px', height: '22px', color: '#22d3ee' }} />
          🏙️ City Grid - {CITY_ROADS.length} Roads
          {ambulance.active && (
            <span style={{ 
              fontSize: '12px', 
              color: '#22c55e', 
              background: 'rgba(34, 197, 94, 0.15)',
              padding: '4px 14px',
              borderRadius: '20px',
              border: '1px solid rgba(34, 197, 94, 0.3)'
            }}>
              🚑 Emergency Active
            </span>
          )}
          {ambulance.hasCompleted && (
            <span style={{ 
              fontSize: '12px', 
              color: '#fbbf24', 
              background: 'rgba(251, 191, 36, 0.15)',
              padding: '4px 14px',
              borderRadius: '20px',
              border: '1px solid rgba(251, 191, 36, 0.3)'
            }}>
              ✅ ARRIVED!
            </span>
          )}
        </h3>
        
        {ambulance.active && (
          <button
            onClick={stopEmergency}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '10px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              background: '#dc2626',
              color: 'white',
              fontSize: '13px'
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
            Stop Emergency
          </button>
        )}
      </div>

      {/* Controls - Select Start and Hospital */}
      {!ambulance.active && (
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          background: 'rgba(30, 41, 59, 0.4)',
          padding: '14px 18px',
          borderRadius: '12px',
          border: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>🚑 Start:</span>
            <select
              value={startRoad}
              onChange={(e) => setStartRoad(e.target.value)}
              style={{
                background: '#1e293b',
                color: '#22d3ee',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              {CITY_ROADS.map(road => (
                <option key={road} value={road}>Road {road}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>🏥 Hospital:</span>
            <select
              value={hospitalRoad}
              onChange={(e) => setHospitalRoad(e.target.value)}
              style={{
                background: '#1e293b',
                color: '#ef4444',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              {CITY_ROADS.map(road => (
                <option key={road} value={road}>Road {road}</option>
              ))}
            </select>
          </div>
          <div style={{ 
            color: '#64748b', 
            fontSize: '13px', 
            display: 'flex', 
            alignItems: 'center',
            background: 'rgba(30, 41, 59, 0.3)',
            padding: '4px 16px',
            borderRadius: '8px'
          }}>
            {startRoad} → {hospitalRoad}
          </div>
        </div>
      )}

      {/* Dijkstra's Algorithm Display */}
      {ambulance.active && ambulance.pathComparison && ambulance.pathComparison.length > 0 && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.06)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '12px',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: 'bold', color: '#22c55e', marginBottom: '4px' }}>
            🧠 Dijkstra's Algorithm - Optimal Path Selection
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            {ambulance.pathComparison.map((p, idx) => (
              <div key={idx} style={{ 
                display: 'inline-block', 
                marginRight: '16px',
                color: p.isBest ? '#22c55e' : '#64748b',
                fontWeight: p.isBest ? 'bold' : 'normal'
              }}>
                {p.isBest ? '✅' : '○'} {p.path} ({p.vehicles} vehicles)
              </div>
            ))}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
            Selected: {ambulance.selectedPath} • Total: {ambulance.pathComparison[0]?.vehicles || 0} vehicles
          </div>
        </div>
      )}

      {/* State Display */}
      {ambulance.active && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '14px',
          fontSize: '13px',
          color: '#67e8f9'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            🚦 Emergency: {ambulance.routeName}
            <span style={{ 
              fontSize: '11px', 
              background: 'rgba(251, 191, 36, 0.15)',
              padding: '2px 12px',
              borderRadius: '12px',
              color: '#fbbf24'
            }}>
              {ambulance.isMoving ? '🚀 Moving...' : ambulance.hasCompleted ? '✅ Arrived at Hospital!' : '⏹️ Stopped'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>📍 {ambulancePos.currentRoad} → {ambulancePos.nextRoad || '🏥 HOSPITAL'}</span>
            <span>🟢 Path: {ambulance.path?.join(' → ')}</span>
            <span>↻ Reset: {ambulance.resetRoads?.length > 0 ? ambulance.resetRoads.join(' → ') : 'None'}</span>
            <span>📊 Progress: {Math.round(ambulance.pathProgress || 0)}%</span>
          </div>
          <div style={{ 
            marginTop: '6px', 
            background: '#1e293b', 
            borderRadius: '8px', 
            height: '8px',
            overflow: 'hidden'
          }}>
            <div 
              style={{
                height: '100%',
                width: `${ambulance.pathProgress || 0}%`,
                background: 'linear-gradient(to right, #22c55e, #84cc16)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      )}

      {/* SVG Map */}
      <svg width="100%" height="520" viewBox="0 0 750 460" style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', border: '1px solid #334155' }}>
        {drawRoads()}

        {/* Hospital Building */}
        <g>
          <rect x={ROAD_POSITIONS[hospitalRoad].x - 30} y={ROAD_POSITIONS[hospitalRoad].y - 35} width="60" height="45" fill="#ef4444" rx="6" opacity="0.9" />
          <rect x={ROAD_POSITIONS[hospitalRoad].x - 20} y={ROAD_POSITIONS[hospitalRoad].y - 25} width="40" height="15" fill="#fca5a5" rx="2" opacity="0.6" />
          <text x={ROAD_POSITIONS[hospitalRoad].x} y={ROAD_POSITIONS[hospitalRoad].y - 5} fill="white" fontSize="14" textAnchor="middle" fontWeight="bold">🏥</text>
          <text x={ROAD_POSITIONS[hospitalRoad].x} y={ROAD_POSITIONS[hospitalRoad].y + 30} fill="#ef4444" fontSize="10" textAnchor="middle" fontWeight="bold">HOSPITAL</text>
          
          {ambulance.hasCompleted && (
            <text x={ROAD_POSITIONS[hospitalRoad].x} y={ROAD_POSITIONS[hospitalRoad].y - 45} fill="#fbbf24" fontSize="14" textAnchor="middle" fontWeight="bold">✅ ARRIVED!</text>
          )}
        </g>

        {/* Road nodes */}
        {CITY_ROADS.map((road) => {
          const pos = ROAD_POSITIONS[road];
          const data = roadData[road];
          const timing = signalTiming[road];
          const isPath = isInPath(road);
          const isPassed = hasPassed(road);
          const isResetRoad = isReset(road);
          const isStart = road === startRoad && ambulance.active;
          const isEnd = road === hospitalRoad && ambulance.active;
          const vehicles = data?.vehicles || 0;

          const signalColor = {
            red: '#ef4444',
            yellow: '#eab308',
            green: '#22c55e'
          }[timing?.color || 'red'];

          let statusLabel = '';
          let statusColor = '#94a3b8';
          let statusBg = 'transparent';
          
          if (isResetRoad) {
            statusLabel = '↻ NORMAL';
            statusColor = '#64748b';
            statusBg = 'rgba(100, 116, 139, 0.1)';
          } else if (isPassed && !isResetRoad) {
            statusLabel = '✅ PASSED';
            statusColor = '#22c55e';
            statusBg = 'rgba(34, 197, 94, 0.1)';
          } else if (isPath && ambulance.active) {
            if (isEnd && ambulance.hasCompleted) {
              statusLabel = '✅ ARRIVED';
              statusColor = '#fbbf24';
              statusBg = 'rgba(251, 191, 36, 0.15)';
            } else if (isEnd) {
              statusLabel = '🏥 DEST';
              statusColor = '#ef4444';
              statusBg = 'rgba(239, 68, 68, 0.1)';
            } else {
              statusLabel = '🟢 CORRIDOR';
              statusColor = '#22c55e';
              statusBg = 'rgba(34, 197, 94, 0.1)';
            }
          } else if (ambulance.active && !isPath) {
            statusLabel = '🔴 FROZEN';
            statusColor = '#ef4444';
            statusBg = 'rgba(239, 68, 68, 0.1)';
          } else if (vehicles === 0 && !ambulance.active) {
            statusLabel = '🔴 EMPTY';
            statusColor = '#64748b';
            statusBg = 'rgba(100, 116, 139, 0.05)';
          }

          return (
            <g key={road}>
              {/* Node glow */}
              {isPath && !isResetRoad && (
                <>
                  <circle cx={pos.x} cy={pos.y} r="28" fill="#22c55e" opacity={isPassed ? 0.05 : 0.15} />
                  <circle cx={pos.x} cy={pos.y} r="20" fill="#22c55e" opacity={isPassed ? 0.08 : 0.25} />
                </>
              )}

              {/* START marker */}
              {isStart && (
                <>
                  <text x={pos.x} y={pos.y - 40} fill="#22c55e" fontSize="20" textAnchor="middle">🚑</text>
                  <text x={pos.x} y={pos.y - 55} fill="#22c55e" fontSize="9" textAnchor="middle" fontWeight="bold">START</text>
                </>
              )}

              {/* Node circle */}
              <circle 
                cx={pos.x} 
                cy={pos.y} 
                r="20" 
                fill={isPath && !isResetRoad ? 'rgba(34, 197, 94, 0.15)' : isResetRoad ? 'rgba(100, 116, 139, 0.1)' : '#1e293b'} 
                stroke={isPath && !isResetRoad ? '#22c55e' : isResetRoad ? '#64748b' : '#475569'}
                strokeWidth="3"
              />
              
              {/* Signal indicator */}
              <circle cx={pos.x + 28} cy={pos.y - 12} r="10" fill={signalColor} opacity="0.95" stroke="#1e293b" strokeWidth="2" />
              
              {/* Signal label */}
              <text x={pos.x + 28} y={pos.y - 28} fill="#94a3b8" fontSize="8" textAnchor="middle">
                {timing?.green === 0 ? '🔴' : `${timing?.green || 0}s`}
              </text>
              
              {/* Road label */}
              <text 
                x={pos.x} 
                y={pos.y + 6} 
                fill={isPath && !isResetRoad ? '#22c55e' : isResetRoad ? '#64748b' : '#e2e8f0'} 
                fontSize="16" 
                fontWeight="bold" 
                textAnchor="middle"
              >
                {road}
              </text>
              
              {/* Vehicle count */}
              <text x={pos.x} y={pos.y + 28} fill="#94a3b8" fontSize="11" textAnchor="middle">
                {vehicles}veh
              </text>

              {/* Status badge */}
              {statusLabel && (
                <rect 
                  x={pos.x - 45} 
                  y={pos.y - 42} 
                  width="90" 
                  height="18" 
                  rx="9" 
                  fill={statusBg}
                  stroke={statusColor}
                  strokeWidth="1"
                  opacity="0.9"
                />
              )}
              {statusLabel && (
                <text x={pos.x} y={pos.y - 29} fill={statusColor} fontSize="9" textAnchor="middle" fontWeight="bold">
                  {statusLabel}
                </text>
              )}
              
              {/* Density bar */}
              <rect x={pos.x - 20} y={pos.y + 36} width="40" height="4" fill="#334155" rx="2" />
              <rect 
                x={pos.x - 20} 
                y={pos.y + 36} 
                width={Math.min(40, 40 * (data?.density || 0))} 
                fill={isResetRoad ? '#64748b' : (data?.density || 0) > 0.8 ? '#ef4444' : (data?.density || 0) > 0.5 ? '#f97316' : '#22c55e'} 
                height="4" 
                rx="2"
              />
            </g>
          );
        })}

        {/* Ambulance */}
        {ambulance.active && (
          <g>
            <circle cx={ambulancePos.x} cy={ambulancePos.y} r="28" fill="none" stroke="#ef4444" strokeWidth="3" opacity="0.3">
              <animate attributeName="r" from="18" to="38" dur="0.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.5" to="0" dur="0.6s" repeatCount="indefinite" />
            </circle>
            
            <rect x={ambulancePos.x - 16} y={ambulancePos.y - 18} width="32" height="36" fill="#ef4444" rx="6" />
            <rect x={ambulancePos.x - 12} y={ambulancePos.y - 12} width="10" height="24" fill="#dc2626" rx="2" />
            <rect x={ambulancePos.x + 2} y={ambulancePos.y - 12} width="10" height="24" fill="#dc2626" rx="2" />
            <rect x={ambulancePos.x + 4} y={ambulancePos.y - 8} width="6" height="6" fill="#60a5fa" rx="1" opacity="0.5" />
            
            <circle cx={ambulancePos.x - 10} cy={ambulancePos.y - 20} r="6" fill="#ef4444">
              <animate attributeName="fill" values="#ef4444;#fbbf24;#ef4444" dur="0.25s" repeatCount="indefinite" />
            </circle>
            <circle cx={ambulancePos.x + 10} cy={ambulancePos.y - 20} r="6" fill="#fbbf24">
              <animate attributeName="fill" values="#fbbf24;#ef4444;#fbbf24" dur="0.25s" repeatCount="indefinite" />
            </circle>
            
            <text x={ambulancePos.x} y={ambulancePos.y + 34} fill="#ef4444" fontSize="9" textAnchor="middle" fontWeight="bold">AMBULANCE</text>
            
            <text x={ambulancePos.x} y={ambulancePos.y - 40} fill="#22d3ee" fontSize="11" textAnchor="middle" fontWeight="bold">
              🚑 {ambulancePos.currentRoad} → {ambulancePos.nextRoad || '🏥 HOSPITAL'}
            </text>
            
            <rect x={ambulancePos.x - 35} y={ambulancePos.y - 55} width="70" height="6" fill="#334155" rx="3" />
            <rect 
              x={ambulancePos.x - 35} 
              y={ambulancePos.y - 55} 
              width={ambulance.pathProgress || 0} 
              height="6" 
              fill="#22c55e" 
              rx="3"
            />
          </g>
        )}

        {/* Legend */}
        <rect x="15" y="435" width="720" height="22" rx="4" fill="rgba(15, 23, 42, 0.7)" />
        <text x="25" y="450" fill="#cbd5e1" fontSize="11">🟢 Green Corridor | 🔴 Red (Frozen/Empty) | ✅ Passed | ↻ Reset Normal</text>
        <text x="350" y="450" fill="#cbd5e1" fontSize="11">🚑 Ambulance | 🏥 Hospital | {CITY_ROADS.length} Roads</text>
        
        {ambulance.active && (
          <text x="680" y="450" fill="#22c55e" fontSize="11" textAnchor="end" fontWeight="bold">
            {Math.round(ambulance.pathProgress || 0)}% • {ambulance.path?.join('→')}
          </text>
        )}
      </svg>

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button
          onClick={startEmergency}
          disabled={emergencyMode}
          style={{
            flex: 1,
            padding: '14px 24px',
            borderRadius: '12px',
            fontWeight: '700',
            background: emergencyMode ? '#475569' : 'linear-gradient(to right, #65a30d, #4d7c0f)',
            color: 'white',
            border: 'none',
            cursor: emergencyMode ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            opacity: emergencyMode ? 0.6 : 1,
            transition: 'all 0.3s',
            fontSize: '16px'
          }}
        >
          <span style={{ fontSize: '20px' }}>🚑</span>
          {emergencyMode ? '🚑 Emergency Active - Clearing Path' : `🚨 Dijkstra's Algorithm (${startRoad} → ${hospitalRoad})`}
        </button>
      </div>
      
      {emergencyMode ? (
        <div style={{
          marginTop: '10px',
          fontSize: '13px',
          color: '#22c55e',
          textAlign: 'center',
          background: 'rgba(34, 197, 94, 0.06)',
          padding: '8px 16px',
          borderRadius: '10px',
          border: '1px solid rgba(34, 197, 94, 0.15)'
        }}>
          🧠 Dijkstra's Algorithm: {ambulance.path?.join(' → ')} | 
          🔴 All non-path roads: RED | 
          {ambulance.isMoving ? ' 🚀 Moving to Hospital...' : ambulance.hasCompleted ? ' ✅ ARRIVED!' : ' ⏹️ Stopped'}
          <span style={{ marginLeft: '12px', color: '#fbbf24' }}>
            🚗 {ambulance.pathComparison?.[0]?.vehicles || 0} vehicles (optimal)
          </span>
        </div>
      ) : (
        <div style={{
          marginTop: '10px',
          fontSize: '11px',
          color: '#64748b',
          textAlign: 'center'
        }}>
          ⚡ Dijkstra's Algorithm finds path with MINIMUM vehicles • Explores ALL paths • Returns optimal route
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ROAD STATUS CARDS
// ============================================================================

const RoadStatusCards = ({ roadData, signalTiming, CITY_ROADS }) => {
  const totalVehicles = Object.values(roadData).reduce((sum, r) => sum + r.vehicles, 0);

  return (
    <div style={{
      background: '#1e293b',
      borderRadius: '16px',
      padding: '20px',
      border: '1px solid rgba(168, 85, 247, 0.15)',
      marginBottom: '16px'
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Zap style={{ width: '20px', height: '20px' }} />
        📊 All Roads Status
        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'normal' }}>
          (Total: {totalVehicles} vehicles • Dijkstra's Algorithm)
        </span>
      </h3>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
        gap: '12px' 
      }}>
        {CITY_ROADS.map((road) => {
          const data = roadData[road];
          const timing = signalTiming[road];
          const isEmergency = timing?.isEmergency || false;
          const isGreen = timing?.color === 'green';
          const vehicles = data?.vehicles || 0;
          const greenTime = timing?.green || 0;
          
          return (
            <div key={road} style={{ 
              background: isEmergency ? 
                (isGreen ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)') : 
                'rgba(30, 41, 59, 0.4)',
              borderRadius: '12px', 
              padding: '14px 16px', 
              border: `2px solid ${isEmergency ? 
                (isGreen ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)') : 
                'rgba(71, 85, 105, 0.2)'}`,
              transition: 'all 0.3s'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '20px', 
                  color: isEmergency ? 
                    (isGreen ? '#22c55e' : '#ef4444') : '#c084fc'
                }}>
                  Road {road}
                </div>
                <div style={{
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  background: isEmergency ? 
                    (isGreen ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)') : 
                    'rgba(30, 41, 59, 0.3)',
                  color: isEmergency ? 
                    (isGreen ? '#22c55e' : '#ef4444') : 
                    (vehicles === 0 ? '#64748b' : '#94a3b8')
                }}>
                  {isEmergency ? (isGreen ? '🟢 EMERG' : '🔴 FROZEN') : 
                   (vehicles === 0 ? '🔴 EMPTY' : '🔄 NORMAL')}
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Green:</span>
                <span style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  color: greenTime === 0 ? '#ef4444' : (isEmergency ? (isGreen ? '#22c55e' : '#ef4444') : '#22d3ee')
                }}>
                  {greenTime}s
                </span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  ({vehicles} veh)
                </span>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '4px 12px',
                fontSize: '13px'
              }}>
                <div style={{ color: '#94a3b8' }}>
                  🚗 <span style={{ color: '#e2e8f0' }}>{vehicles}</span>
                </div>
                <div style={{ color: '#94a3b8' }}>
                  📊 <span style={{ color: '#e2e8f0' }}>{Math.round((data?.density || 0) * 100)}%</span>
                </div>
                <div style={{ color: '#94a3b8' }}>
                  ⏱️ <span style={{ color: '#22d3ee' }}>{data?.waitTime || 0}s</span>
                </div>
                <div style={{ color: '#94a3b8' }}>
                  🔄 <span style={{ color: '#a3e635' }}>{data?.flowRate || 0}</span>
                </div>
              </div>

              <div style={{ marginTop: '8px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '10px', 
                  color: '#64748b',
                  marginBottom: '2px'
                }}>
                  <span>Signal Progress</span>
                  <span>{greenTime === 0 ? '🔴 RED' : `${timing?.current || 0}/${greenTime}s`}</span>
                </div>
                <div style={{ 
                  width: '100%', 
                  background: '#334155', 
                  borderRadius: '9999px', 
                  height: '6px',
                  overflow: 'hidden'
                }}>
                  <div
                    style={{
                      height: '6px',
                      borderRadius: '9999px',
                      transition: 'all 0.3s',
                      background: greenTime === 0 ? '#ef4444' :
                        isEmergency ? (isGreen ? 'linear-gradient(to right, #22c55e, #84cc16)' : '#ef4444') :
                        timing?.color === 'green' ? 'linear-gradient(to right, #84cc16, #22c55e)' :
                        timing?.color === 'yellow' ? 'linear-gradient(to right, #eab308, #f97316)' :
                        'linear-gradient(to right, #ef4444, #dc2626)',
                      width: greenTime === 0 ? '100%' : `${((timing?.current || 0) / greenTime) * 100}%`
                    }}
                  />
                </div>
              </div>

              <div style={{ 
                marginTop: '6px',
                fontSize: '10px',
                color: greenTime === 0 ? '#ef4444' : (isEmergency ? (isGreen ? '#22c55e' : '#ef4444') : '#64748b'),
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {timing?.status || 'NORMAL'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MetricsPanel = ({ metrics }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '12px' }}>
    <div style={{ background: 'rgba(30, 58, 138, 0.3)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', padding: '12px 16px' }}>
      <div style={{ color: '#60a5fa', fontSize: '10px', fontWeight: '600' }}>🚦 Congestion</div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#67e8f9' }}>{metrics.congestionLevel}</div>
      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{metrics.totalVehicles} vehicles</div>
    </div>
    <div style={{ background: 'rgba(54, 83, 20, 0.3)', border: '1px solid rgba(132, 204, 22, 0.2)', borderRadius: '12px', padding: '12px 16px' }}>
      <div style={{ color: '#a3e635', fontSize: '10px', fontWeight: '600' }}>⏱️ Avg Wait</div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#bef264' }}>{metrics.avgWaitTime}s</div>
      <div style={{ fontSize: '10px', color: '#94a3b8' }}>Density: {metrics.avgDensity}</div>
    </div>
    <div style={{ background: 'rgba(120, 53, 15, 0.3)', border: '1px solid rgba(251, 146, 60, 0.2)', borderRadius: '12px', padding: '12px 16px' }}>
      <div style={{ color: '#fb923c', fontSize: '10px', fontWeight: '600' }}>⛽ Fuel Waste</div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fdba74' }}>{metrics.fuelWastage}L/h</div>
      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{metrics.fuelWastage > 10 ? '⚠️ High' : '✅ Normal'}</div>
    </div>
    <div style={{ background: 'rgba(127, 29, 29, 0.3)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: '12px', padding: '12px 16px' }}>
      <div style={{ color: '#f87171', fontSize: '10px', fontWeight: '600' }}>🌍 CO₂</div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fca5a5' }}>{metrics.co2Emissions}kg/h</div>
      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{metrics.co2Emissions > 15 ? '⚠️ High' : '✅ Normal'}</div>
    </div>
  </div>
);

const AnalyticsCharts = ({ historicalData, predictions }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
    <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#818cf8' }}>📊 Historical Analytics</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={historicalData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
          <YAxis stroke="#94a3b8" fontSize={10} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
          <Legend />
          <Line type="monotone" dataKey="avgWait" stroke="#06b6d4" strokeWidth={2} name="Wait (s)" />
          <Line type="monotone" dataKey="density" stroke="#84cc16" strokeWidth={2} name="Density" />
        </LineChart>
      </ResponsiveContainer>
    </div>

    <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid rgba(251, 146, 60, 0.15)' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#fb923c' }}>🔮 Traffic Predictions</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={predictions}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="period" stroke="#94a3b8" fontSize={10} />
          <YAxis stroke="#94a3b8" fontSize={10} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
          <Area type="monotone" dataKey="density" fill="#fb923c" stroke="#fb923c" fillOpacity={0.3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

const SVATONDashboard = () => {
  const {
    roadData, signalTiming, emergencyMode, setEmergencyMode, ambulance, setAmbulance,
    metrics, historicalData, predictions, running, setRunning,
    stopEmergency, startEmergency, startRoad, setStartRoad, 
    hospitalRoad, setHospitalRoad, CITY_ROADS, ROAD_POSITIONS,
    ROAD_CONNECTIONS
  } = useSVATONSimulation();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #020617, #0f172a, #020617)',
      color: 'white',
      padding: '16px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h1 style={{
              fontSize: '36px',
              fontWeight: '900',
              background: 'linear-gradient(to right, #22d3ee, #60a5fa, #a3e635)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '4px'
            }}>
              SVATON
            </h1>
            <p style={{ color: '#67e8f9', fontSize: '14px', fontWeight: '300' }}>
              Smart Vision AI Traffic Optimization • {CITY_ROADS.length} Roads
            </p>
            <p style={{ color: '#64748b', fontSize: '11px' }}>
              ⚡ Dijkstra's Algorithm • Finds path with MINIMUM vehicles • Explores ALL paths
            </p>
          </div>
          <div style={{ 
            background: 'rgba(34, 211, 238, 0.08)', 
            padding: '4px 12px', 
            borderRadius: '8px',
            border: '1px solid rgba(34, 211, 238, 0.1)'
          }}>
            <span style={{ color: '#22d3ee', fontSize: '12px' }}>
              {running ? '🟢 Live' : '⏸️ Paused'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setRunning(!running)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              background: running ? '#dc2626' : '#0891b2',
              color: 'white',
              fontSize: '12px'
            }}
          >
            {running ? <Square style={{ width: '14px', height: '14px' }} /> : <Play style={{ width: '14px', height: '14px' }} />}
            {running ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              background: '#334155',
              color: 'white',
              fontSize: '12px'
            }}
          >
            <RotateCw style={{ width: '14px', height: '14px' }} />
            Reset
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <MetricsPanel metrics={metrics} />

        <div style={{ marginBottom: '16px' }}>
          <TrafficVisualization
            roadData={roadData}
            signalTiming={signalTiming}
            ambulance={ambulance}
            emergencyMode={emergencyMode}
            startEmergency={startEmergency}
            stopEmergency={stopEmergency}
            startRoad={startRoad}
            setStartRoad={setStartRoad}
            hospitalRoad={hospitalRoad}
            setHospitalRoad={setHospitalRoad}
            CITY_ROADS={CITY_ROADS}
            ROAD_POSITIONS={ROAD_POSITIONS}
            ROAD_CONNECTIONS={ROAD_CONNECTIONS}
          />
        </div>

        <RoadStatusCards roadData={roadData} signalTiming={signalTiming} CITY_ROADS={CITY_ROADS} />

        <AnalyticsCharts historicalData={historicalData} predictions={predictions} />

        <div style={{
          marginTop: '12px',
          padding: '12px 16px',
          background: 'rgba(30, 41, 59, 0.25)',
          borderRadius: '12px',
          border: '1px solid #334155',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '8px'
        }}>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '9px' }}>System Health</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#22d3ee' }}>{metrics.systemHealth}%</div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '9px' }}>Optimization</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#a3e635' }}>{metrics.optimizationLevel}%</div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '9px' }}>Emergency</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: emergencyMode ? '#ef4444' : '#22c55e' }}>
              {emergencyMode ? '🚑 ACTIVE' : '✅ STANDBY'}
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '9px' }}>Avg Density</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24' }}>{metrics.avgDensity}</div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '9px' }}>Total Vehicles</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#22d3ee' }}>{metrics.totalVehicles}</div>
          </div>
        </div>

        <div style={{
          marginTop: '12px',
          padding: '10px',
          textAlign: 'center',
          borderTop: '1px solid #334155',
          color: '#64748b',
          fontSize: '10px'
        }}>
          🏆 Dijkstra's Algorithm • Explores ALL paths • Weight = Vehicles • Returns MINIMUM congestion path • Signal-Aware Simulation
        </div>
      </div>
    </div>
  );
};

export default SVATONDashboard;
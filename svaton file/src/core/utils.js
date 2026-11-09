/**
 * SVATON - Phase 1: Utility Functions
 * Common helper functions used across all modules
 */

import {
  VEHICLE_WEIGHTS,
  DENSITY_LEVELS,
  DENSITY_THRESHOLDS,
  DENSITY_COLORS,
  METRICS_CONFIG,
  ROADS
} from './types.js';

// ============================================================================
// MATHEMATICAL UTILITIES
// ============================================================================

/**
 * Round number to specified decimal places
 * @param {number} value
 * @param {number} decimals
 * @returns {number}
 */
export function roundTo(value, decimals = 2) {
  if (typeof value !== 'number') return 0;
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Clamp value between min and max
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 * @param {number} start
 * @param {number} end
 * @param {number} t - Value between 0 and 1
 * @returns {number}
 */
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Calculate percentage
 * @param {number} value
 * @param {number} total
 * @returns {number} Percentage 0-100
 */
export function getPercentage(value, total) {
  return total === 0 ? 0 : roundTo((value / total) * 100, 2);
}

/**
 * Calculate weighted average
 * @param {Array} values
 * @param {Array} weights
 * @returns {number}
 */
export function weightedAverage(values, weights) {
  if (values.length !== weights.length) {
    throw new Error('Values and weights arrays must have same length');
  }
  
  const sum = values.reduce((acc, val, i) => acc + val * weights[i], 0);
  const weightSum = weights.reduce((acc, w) => acc + w, 0);
  
  return weightSum === 0 ? 0 : roundTo(sum / weightSum, 2);
}

// ============================================================================
// TIME UTILITIES
// ============================================================================

/**
 * Get current timestamp in ISO format
 * @returns {string}
 */
export function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Parse ISO timestamp to Date object
 * @param {string} timestamp
 * @returns {Date}
 */
export function parseTimestamp(timestamp) {
  return new Date(timestamp);
}

/**
 * Get time difference in milliseconds
 * @param {string} startTime - ISO timestamp
 * @param {string} endTime - ISO timestamp
 * @returns {number} Milliseconds
 */
export function getTimeDifference(startTime, endTime) {
  return new Date(endTime).getTime() - new Date(startTime).getTime();
}

/**
 * Convert milliseconds to seconds
 * @param {number} ms
 * @returns {number}
 */
export function msToSeconds(ms) {
  return roundTo(ms / 1000, 2);
}

/**
 * Format time as HH:MM:SS
 * @param {Date} date
 * @returns {string}
 */
export function formatTime(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// ============================================================================
// TRAFFIC CALCULATION UTILITIES
// ============================================================================

/**
 * Calculate weighted vehicle count (accounting for vehicle types)
 * @param {Object} vehicleCount - { cars: x, bikes: y, buses: z, ... }
 * @returns {number} Weighted vehicle count
 */
export function calculateWeightedVehicleCount(vehicleCount) {
  if (!vehicleCount || typeof vehicleCount !== 'object') return 0;
  
  return Object.entries(vehicleCount).reduce((total, [type, count]) => {
    const weight = VEHICLE_WEIGHTS[type] || 1;
    return total + (count * weight);
  }, 0);
}

/**
 * Calculate traffic density
 * @param {number} vehicleCount - Total vehicles on road
 * @param {number} capacity - Lane capacity
 * @returns {number} Density score (vehicles/capacity)
 */
export function calculateDensity(vehicleCount, capacity) {
  if (capacity <= 0) {
    console.warn('Invalid capacity:', capacity);
    return 0;
  }
  return roundTo(vehicleCount / capacity, 2);
}

/**
 * Calculate density level from score
 * @param {number} density
 * @returns {Object} { level, color, severity }
 */
export function getDensityInfo(density) {
  let level, severity;
  
  if (density < DENSITY_THRESHOLDS.LOW) {
    level = DENSITY_LEVELS.LOW;
    severity = 1;
  } else if (density < DENSITY_THRESHOLDS.NORMAL) {
    level = DENSITY_LEVELS.NORMAL;
    severity = 2;
  } else if (density < DENSITY_THRESHOLDS.MODERATE) {
    level = DENSITY_LEVELS.MODERATE;
    severity = 3;
  } else if (density < DENSITY_THRESHOLDS.HIGH) {
    level = DENSITY_LEVELS.HIGH;
    severity = 4;
  } else {
    level = DENSITY_LEVELS.CRITICAL;
    severity = 5;
  }
  
  return {
    level,
    color: DENSITY_COLORS[level],
    severity,
    density: roundTo(density, 2)
  };
}

/**
 * Calculate estimated wait time based on density
 * @param {number} density
 * @param {number} baseWaitTime - Base wait time in seconds
 * @returns {number} Estimated wait time in seconds
 */
export function estimateWaitTime(density, baseWaitTime = 30) {
  // Wait time increases exponentially with density
  const multiplier = Math.pow(density + 1, 1.5);
  return roundTo(baseWaitTime * multiplier, 0);
}

/**
 * Calculate fuel wastage from idling
 * @param {number} idleTimeMinutes
 * @returns {number} Liters wasted
 */
export function calculateFuelWastage(idleTimeMinutes) {
  return roundTo(idleTimeMinutes * METRICS_CONFIG.FUEL_CONSUMPTION_RATE, 2);
}

/**
 * Calculate CO2 emissions from idling
 * @param {number} idleTimeMinutes
 * @returns {number} Kilograms of CO2
 */
export function calculateCO2Emissions(idleTimeMinutes) {
  return roundTo(idleTimeMinutes * METRICS_CONFIG.CO2_EMISSION_RATE, 2);
}

/**
 * Calculate average wait time across all roads
 * @param {Object} roadData - { roadId: { waitTime: x, ... }, ... }
 * @returns {number} Average in seconds
 */
export function calculateAverageWaitTime(roadData) {
  const waitTimes = Object.values(roadData)
    .map(data => data.waitTime || 0);
  
  if (waitTimes.length === 0) return 0;
  
  const sum = waitTimes.reduce((acc, val) => acc + val, 0);
  return roundTo(sum / waitTimes.length, 0);
}

/**
 * Calculate overall congestion level
 * @param {Object} densityData - { roadId: { densityScore: x, ... }, ... }
 * @returns {string} LOW, NORMAL, MODERATE, HIGH, or CRITICAL
 */
export function calculateOverallCongestion(densityData) {
  const scores = Object.values(densityData)
    .map(data => data.densityScore || 0);
  
  if (scores.length === 0) return DENSITY_LEVELS.NORMAL;
  
  const average = scores.reduce((acc, val) => acc + val, 0) / scores.length;
  return getDensityInfo(average).level;
}

// ============================================================================
// SIGNAL CALCULATION UTILITIES
// ============================================================================

/**
 * Calculate proportional signal timing based on densities
 * @param {Object} densityScores - { roadId: score, ... }
 * @param {number} cycleTotalTime - Total cycle time in seconds
 * @param {number} minGreen - Minimum green time
 * @returns {Object} Signal timing for each road
 */
export function calculateProportionalTiming(densityScores, cycleTotalTime = 180, minGreen = 20) {
  const timings = {};
  
  // Calculate total density
  const totalDensity = Object.values(densityScores)
    .reduce((sum, score) => sum + Math.max(score, 0.1), 0);
  
  // Allocate time proportionally
  Object.entries(densityScores).forEach(([road, density]) => {
    const proportion = Math.max(density, 0.1) / totalDensity;
    let greenTime = Math.floor(cycleTotalTime * proportion);
    
    // Ensure minimum green time
    greenTime = Math.max(greenTime, minGreen);
    
    timings[road] = {
      greenTime,
      redTime: cycleTotalTime - greenTime,
      road
    };
  });
  
  return timings;
}

/**
 * Optimize signal timing using Reinforcement Learning principles
 * @param {Object} roadData - Current road metrics
 * @param {Object} previousTimings - Previous signal timings
 * @param {number} learningRate - Learning rate (0-1)
 * @returns {Object} Optimized timings
 */
export function optimizeSignalTiming(roadData, previousTimings, learningRate = 0.1) {
  const optimized = {};
  
  Object.keys(roadData).forEach(road => {
    const data = roadData[road];
    const previous = previousTimings[road] || { greenTime: 60 };
    
    // Reward metric: vehicles per second of green time (throughput)
    const throughput = data.vehicles / (previous.greenTime || 60);
    
    // Adjust green time based on throughput
    const adjustment = throughput > 1 ? 1.05 : 0.95; // Increase if good throughput
    let newGreenTime = Math.round(previous.greenTime * (1 + learningRate * (adjustment - 1)));
    
    // Clamp between min and max
    newGreenTime = clamp(newGreenTime, 20, 150);
    
    optimized[road] = {
      ...previous,
      greenTime: newGreenTime,
      throughput: roundTo(throughput, 2)
    };
  });
  
  return optimized;
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate detection result
 * @param {Object} detection
 * @returns {Object} { valid: boolean, errors: Array }
 */
export function validateDetection(detection) {
  const errors = [];
  
  if (!detection.roadId || !ROADS.includes(detection.roadId)) {
    errors.push('Invalid or missing roadId');
  }
  
  if (!detection.vehicles || typeof detection.vehicles !== 'object') {
    errors.push('Invalid vehicles object');
  }
  
  if (typeof detection.confidence !== 'number' || detection.confidence < 0 || detection.confidence > 1) {
    errors.push('Invalid confidence score');
  }
  
  if (!detection.timestamp) {
    errors.push('Missing timestamp');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate density data
 * @param {Object} density
 * @returns {Object} { valid: boolean, errors: Array }
 */
export function validateDensity(density) {
  const errors = [];
  
  if (typeof density.densityScore !== 'number' || density.densityScore < 0) {
    errors.push('Invalid density score');
  }
  
  if (typeof density.vehicleCount !== 'number' || density.vehicleCount < 0) {
    errors.push('Invalid vehicle count');
  }
  
  if (typeof density.laneCapacity !== 'number' || density.laneCapacity <= 0) {
    errors.push('Invalid lane capacity');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// DATA TRANSFORMATION UTILITIES
// ============================================================================

/**
 * Convert road data to array format for charting
 * @param {Object} roadData - { roadId: { ...data }, ... }
 * @returns {Array} Array of formatted data
 */
export function roadDataToArray(roadData) {
  return Object.entries(roadData).map(([roadId, data]) => ({
    road: roadId,
    ...data
  }));
}

// ============================================================================
// LOGGING & DEBUGGING UTILITIES
// ============================================================================

/**
 * Format log message with timestamp and level
 * @param {string} level - DEBUG, INFO, WARN, ERROR
 * @param {string} message
 * @param {*} data
 * @returns {string}
 */
export function formatLog(level, message, data = null) {
  const timestamp = formatTime();
  const log = `[${timestamp}] [${level}] ${message}`;
  return data ? `${log}\n${JSON.stringify(data, null, 2)}` : log;
}

/**
 * Log with different levels
 */
export const Logger = {
  debug: (msg, data) => console.log(formatLog('DEBUG', msg, data)),
  info: (msg, data) => console.log(formatLog('INFO', msg, data)),
  warn: (msg, data) => console.warn(formatLog('WARN', msg, data)),
  error: (msg, data) => console.error(formatLog('ERROR', msg, data))
};

export default {
  roundTo,
  clamp,
  lerp,
  getPercentage,
  weightedAverage,
  getCurrentTimestamp,
  parseTimestamp,
  getTimeDifference,
  msToSeconds,
  formatTime,
  calculateDensity,
  calculateWeightedVehicleCount,
  getDensityInfo,
  estimateWaitTime,
  calculateFuelWastage,
  calculateCO2Emissions,
  calculateAverageWaitTime,
  calculateOverallCongestion,
  calculateProportionalTiming,
  optimizeSignalTiming,
  validateDetection,
  validateDensity,
  roadDataToArray,
  Logger
};
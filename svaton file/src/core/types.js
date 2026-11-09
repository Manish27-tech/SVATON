/**
 * SVATON - Smart Vision AI Traffic Optimization Network
 * Phase 1: Type Definitions & Constants
 * 
 * Defines all data structures, enums, and constants used across the system
 */

// ============================================================================
// VEHICLE TYPES
// ============================================================================

export const VEHICLE_TYPES = {
  CAR: 'car',
  BIKE: 'bike',
  BUS: 'bus',
  TRUCK: 'truck',
  AUTO: 'auto',
  AMBULANCE: 'ambulance',
  POLICE: 'police'
};

// Vehicle weight for density calculation (larger vehicles take more space)
export const VEHICLE_WEIGHTS = {
  car: 1.0,
  bike: 0.3,
  bus: 3.0,
  truck: 2.5,
  auto: 0.8,
  ambulance: 1.2,
  police: 1.0
};

// ============================================================================
// TRAFFIC DENSITY LEVELS
// ============================================================================

export const DENSITY_LEVELS = {
  LOW: 'LOW',           // < 0.5
  NORMAL: 'NORMAL',     // 0.5 - 0.8
  MODERATE: 'MODERATE', // 0.8 - 1.2
  HIGH: 'HIGH',         // 1.2 - 1.8
  CRITICAL: 'CRITICAL'  // > 1.8
};

export const DENSITY_THRESHOLDS = {
  LOW: 0.5,
  NORMAL: 0.8,
  MODERATE: 1.2,
  HIGH: 1.8
};

// Color coding for visualization
export const DENSITY_COLORS = {
  LOW: '#22c55e',      // Green
  NORMAL: '#3b82f6',   // Blue
  MODERATE: '#eab308', // Yellow
  HIGH: '#f97316',     // Orange
  CRITICAL: '#ef4444'  // Red
};

// ============================================================================
// TRAFFIC SIGNAL STATES
// ============================================================================

export const SIGNAL_STATES = {
  RED: 'RED',
  YELLOW: 'YELLOW',
  GREEN: 'GREEN'
};

export const SIGNAL_COLORS = {
  RED: '#ef4444',
  YELLOW: '#eab308',
  GREEN: '#22c55e'
};

// ============================================================================
// ROAD/JUNCTION CONFIGURATION
// ============================================================================

export const ROADS = ['A', 'B', 'C', 'D'];

export const ROAD_DIRECTIONS = {
  A: 'Left',
  B: 'Top',
  C: 'Right',
  D: 'Bottom'
};

// Default lane configuration
export const DEFAULT_LANE_CONFIG = {
  A: { lanes: 2, capacity: 100 },
  B: { lanes: 3, capacity: 150 },
  C: { lanes: 2, capacity: 100 },
  D: { lanes: 2, capacity: 100 }
};

// ============================================================================
// SIGNAL TIMING CONFIGURATION
// ============================================================================

export const SIGNAL_CONFIG = {
  CYCLE_TIME: 180,           // Total cycle time in seconds
  MIN_GREEN: 20,             // Minimum green time per road
  MAX_GREEN: 150,            // Maximum green time per road
  YELLOW_TIME: 3,            // Yellow light duration
  UPDATE_INTERVAL: 500,      // Update frequency in ms
  OPTIMIZATION_INTERVAL: 30  // Recalculate every 30 seconds
};

// ============================================================================
// EMERGENCY/AMBULANCE CONFIGURATION
// ============================================================================

export const EMERGENCY_CONFIG = {
  PRIORITY_LEVEL: 99,        // Highest priority
  EMERGENCY_GREEN_TIME: 100, // Green time for emergency corridor
  EMERGENCY_RED_TIME: 120,   // Red time for cross traffic
  DETECTION_RADIUS: 500,     // Detection radius in meters
  SPEED_LIMIT: 60            // km/h (17 m/s)
};

// ============================================================================
// PREDICTION CONFIGURATION
// ============================================================================

export const PREDICTION_CONFIG = {
  FORECAST_WINDOW: 60,       // 60 minutes ahead
  PREDICTION_INTERVAL: 300,  // Update every 5 minutes
  HISTORICAL_DATA_MONTHS: 12, // Use 12 months of historical data
  LSTM_CONFIDENCE_THRESHOLD: 0.82 // 82% minimum confidence
};

// ============================================================================
// SYSTEM METRICS & CALCULATIONS
// ============================================================================

export const METRICS_CONFIG = {
  FUEL_CONSUMPTION_RATE: 0.15,     // Liters per minute of idling
  CO2_EMISSION_RATE: 0.25,         // kg per minute of idling
  AVERAGE_VEHICLE_LENGTH: 4.5,     // meters
  VEHICLE_SPACING: 1.0,            // meters between vehicles
  TRAFFIC_SPEED_FREE_FLOW: 60,     // km/h
  TRAFFIC_SPEED_CONGESTED: 10      // km/h
};

// ============================================================================
// API/SYSTEM CONFIGURATION
// ============================================================================

export const SYSTEM_CONFIG = {
  API_TIMEOUT: 5000,              // 5 seconds
  DETECTION_CONFIDENCE: 0.95,     // 95% minimum confidence
  RESPONSE_TIME_TARGET: 100,      // 100ms target API response
  UPTIME_SLA: 99.99,              // 99.99% uptime target
  DATA_RETENTION_DAYS: 7          // Keep raw video 7 days
};

// ============================================================================
// UTILITY FUNCTIONS FOR TYPE VALIDATION
// ============================================================================

/**
 * Validate if a value is a valid road ID
 * @param {*} value
 * @returns {boolean}
 */
export function isValidRoad(value) {
  return ROADS.includes(value);
}

/**
 * Validate if a value is a valid vehicle type
 * @param {*} value
 * @returns {boolean}
 */
export function isValidVehicleType(value) {
  return Object.values(VEHICLE_TYPES).includes(value);
}

/**
 * Validate if a value is a valid density level
 * @param {*} value
 * @returns {boolean}
 */
export function isValidDensityLevel(value) {
  return Object.values(DENSITY_LEVELS).includes(value);
}

/**
 * Get density level from density score
 * @param {number} density
 * @returns {string} Density level
 */
export function getDensityLevel(density) {
  if (density < DENSITY_THRESHOLDS.LOW) return DENSITY_LEVELS.LOW;
  if (density < DENSITY_THRESHOLDS.NORMAL) return DENSITY_LEVELS.NORMAL;
  if (density < DENSITY_THRESHOLDS.MODERATE) return DENSITY_LEVELS.MODERATE;
  if (density < DENSITY_THRESHOLDS.HIGH) return DENSITY_LEVELS.HIGH;
  return DENSITY_LEVELS.CRITICAL;
}

/**
 * Get color for density level
 * @param {string} level
 * @returns {string} Hex color code
 */
export function getColorForDensity(level) {
  return DENSITY_COLORS[level] || DENSITY_COLORS.NORMAL;
}

/**
 * Get current timestamp in ISO format
 * @returns {string}
 */
export function getCurrentTimestamp() {
  return new Date().toISOString();
}

export default {
  VEHICLE_TYPES,
  VEHICLE_WEIGHTS,
  DENSITY_LEVELS,
  DENSITY_THRESHOLDS,
  DENSITY_COLORS,
  SIGNAL_STATES,
  SIGNAL_COLORS,
  ROADS,
  ROAD_DIRECTIONS,
  DEFAULT_LANE_CONFIG,
  SIGNAL_CONFIG,
  EMERGENCY_CONFIG,
  PREDICTION_CONFIG,
  METRICS_CONFIG,
  SYSTEM_CONFIG,
  isValidRoad,
  isValidVehicleType,
  isValidDensityLevel,
  getDensityLevel,
  getColorForDensity,
  getCurrentTimestamp
};
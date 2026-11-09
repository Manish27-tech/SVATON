/**
 * SVATON - Phase 2: Vehicle Detection Module
 * Simulates YOLOv11 real-time vehicle detection from CCTV feeds
 * 
 * In production, this would connect to:
 * - Actual CCTV camera feeds
 * - YOLOv11 model inference
 * - GPU-accelerated processing
 */

import {
  VEHICLE_TYPES,
  VEHICLE_WEIGHTS,
  ROADS,
  SYSTEM_CONFIG,
  getCurrentTimestamp,
  msToSeconds
} from '../core/types.js';

import { Logger, validateDetection } from '../core/utils.js';

// ============================================================================
// DETECTION CLASS
// ============================================================================

/**
 * VehicleDetector - Simulates YOLOv11 detection
 * 
 * In production:
 * - Connects to CCTV camera streams (RTSP/HLS)
 * - Runs YOLOv11 inference on GPU
 * - Processes 30 FPS at <100ms latency
 * - Sends results to backend via gRPC/WebSocket
 */
class VehicleDetector {
  constructor(config = {}) {
    this.config = {
      confidence: SYSTEM_CONFIG.DETECTION_CONFIDENCE || 0.95,
      roadId: null,
      updateInterval: 500, // ms
      simulationMode: true, // For demo/testing
      ...config
    };

    this.isRunning = false;
    this.lastDetection = null;
    this.detectionHistory = [];
    this.detectionStats = this.initializeStats();
  }

  /**
   * Initialize detection statistics
   */
  initializeStats() {
    return {
      totalDetections: 0,
      totalVehicles: 0,
      averageConfidence: 0,
      detectionRate: 0, // FPS equivalent
      lastUpdateTime: null
    };
  }

  /**
   * Simulate real-time vehicle detection
   * 
   * In production, this would:
   * 1. Capture frame from CCTV
   * 2. Preprocess (normalize, resize to 640x640)
   * 3. Run YOLOv11 inference
   * 4. Post-process (NMS - Non-Maximum Suppression)
   * 5. Return detections with confidence scores
   * 
   * @returns {Object} Detection result
   */
  detect() {
    const startTime = performance.now();

    // Simulate vehicle detection (would be real YOLO output)
    const vehicles = this.generateDetectionData();

    // Validate confidence threshold
    const filteredVehicles = this.filterByConfidence(vehicles);

    const processingTime = performance.now() - startTime;

    const detection = {
      timestamp: getCurrentTimestamp(),
      roadId: this.config.roadId,
      vehicles: this.aggregateVehicles(filteredVehicles),
      totalVehicles: filteredVehicles.length,
      confidence: this.calculateAverageConfidence(filteredVehicles),
      processingTimeMs: Math.round(processingTime),
      details: {
        framesProcessed: 1,
        modelVersion: 'YOLOv11-nano',
        gpuMemory: '256MB',
        batchSize: 1
      }
    };

    // Validate detection
    const validation = validateDetection(detection);
    if (!validation.valid) {
      Logger.warn('Invalid detection', validation.errors);
      return null;
    }

    this.updateStats(detection);
    this.lastDetection = detection;
    this.detectionHistory.push(detection);

    // Keep only last 100 detections in history
    if (this.detectionHistory.length > 100) {
      this.detectionHistory.shift();
    }

    return detection;
  }

  /**
   * Generate simulated detection data
   * In production, this would be YOLOv11 model output
   * 
   * @private
   * @returns {Array} Array of detected vehicles with confidence
   */
  generateDetectionData() {
    const baseCount = {
      [VEHICLE_TYPES.CAR]: Math.floor(Math.random() * 60) + 20,
      [VEHICLE_TYPES.BIKE]: Math.floor(Math.random() * 80) + 30,
      [VEHICLE_TYPES.BUS]: Math.floor(Math.random() * 10) + 2,
      [VEHICLE_TYPES.TRUCK]: Math.floor(Math.random() * 6) + 1,
      [VEHICLE_TYPES.AUTO]: Math.floor(Math.random() * 15) + 5,
      [VEHICLE_TYPES.AMBULANCE]: Math.random() < 0.05 ? 1 : 0, // 5% chance
      [VEHICLE_TYPES.POLICE]: Math.random() < 0.03 ? 1 : 0 // 3% chance
    };

    // Convert counts to individual detections with confidence
    const detections = [];
    Object.entries(baseCount).forEach(([type, count]) => {
      for (let i = 0; i < count; i++) {
        detections.push({
          type,
          confidence: 0.93 + Math.random() * 0.07, // 93-100% confidence
          bbox: [Math.random() * 640, Math.random() * 480, Math.random() * 100, Math.random() * 100],
          trackingId: `${type}_${i}_${Date.now()}`
        });
      }
    });

    return detections;
  }

  /**
   * Filter detections by confidence threshold
   * 
   * In production: Non-Maximum Suppression (NMS)
   * - Removes duplicate detections
   * - Suppresses overlapping bounding boxes
   * - Keeps highest confidence detection per object
   * 
   * @private
   * @param {Array} detections
   * @returns {Array} Filtered detections
   */
  filterByConfidence(detections) {
    return detections.filter(detection => detection.confidence >= this.config.confidence);
  }

  /**
   * Aggregate vehicles by type
   * @private
   * @param {Array} detections
   * @returns {Object} Vehicle counts by type
   */
  aggregateVehicles(detections) {
    const aggregated = {};

    // Initialize all vehicle types
    Object.values(VEHICLE_TYPES).forEach(type => {
      aggregated[type] = 0;
    });

    // Count each type
    detections.forEach(detection => {
      aggregated[detection.type] = (aggregated[detection.type] || 0) + 1;
    });

    return aggregated;
  }

  /**
   * Calculate average confidence across all detections
   * @private
   * @param {Array} detections
   * @returns {number} Average confidence 0-1
   */
  calculateAverageConfidence(detections) {
    if (detections.length === 0) return 0;

    const sum = detections.reduce((acc, det) => acc + det.confidence, 0);
    return Math.round((sum / detections.length) * 10000) / 10000;
  }

  /**
   * Update detection statistics
   * @private
   * @param {Object} detection
   */
  updateStats(detection) {
    this.detectionStats.totalDetections++;
    this.detectionStats.totalVehicles += detection.totalVehicles;
    this.detectionStats.averageConfidence =
      (this.detectionStats.averageConfidence *
        (this.detectionStats.totalDetections - 1) +
        detection.confidence) /
      this.detectionStats.totalDetections;

    const now = Date.now();
    if (this.detectionStats.lastUpdateTime) {
      const timeDiff = (now - this.detectionStats.lastUpdateTime) / 1000;
      this.detectionStats.detectionRate = Math.round(1 / timeDiff * 10) / 10; // FPS
    }
    this.detectionStats.lastUpdateTime = now;
  }

  /**
   * Get detection statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.detectionStats,
      averageConfidence: Math.round(this.detectionStats.averageConfidence * 10000) / 10000
    };
  }

  /**
   * Get detection history
   * @param {number} limit - Number of latest detections
   * @returns {Array}
   */
  getHistory(limit = 10) {
    return this.detectionHistory.slice(-limit);
  }

  /**
   * Start continuous detection (for streaming)
   * @param {Function} callback - Called with each detection
   */
  startDetection(callback) {
    if (this.isRunning) {
      Logger.warn('Detection already running');
      return;
    }

    this.isRunning = true;
    Logger.info('Starting vehicle detection', { roadId: this.config.roadId });

    this.detectionInterval = setInterval(() => {
      const detection = this.detect();
      if (detection && callback) {
        callback(detection);
      }
    }, this.config.updateInterval);
  }

  /**
   * Stop continuous detection
   */
  stopDetection() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.isRunning = false;
      Logger.info('Stopped vehicle detection');
    }
  }

  /**
   * Reset detector
   */
  reset() {
    this.stopDetection();
    this.detectionHistory = [];
    this.detectionStats = this.initializeStats();
    this.lastDetection = null;
  }
}

// ============================================================================
// MULTI-ROAD DETECTION MANAGER
// ============================================================================

/**
 * DetectionManager - Manages detection across multiple roads
 * 
 * Coordinates:
 * - Multiple camera feeds
 * - Parallel YOLOv11 inference
 * - Load balancing across GPUs
 * - Result aggregation
 */
class DetectionManager {
  constructor(config = {}) {
    this.detectors = {};
    this.config = config;
    this.allDetections = {};

    // Initialize detector for each road
    ROADS.forEach(road => {
      this.detectors[road] = new VehicleDetector({
        roadId: road,
        ...config
      });
    });
  }

  /**
   * Perform detection on all roads
   * @returns {Object} Detections for all roads
   */
  detectAll() {
    const allDetections = {};

    ROADS.forEach(road => {
      const detection = this.detectors[road].detect();
      if (detection) {
        allDetections[road] = detection;
      }
    });

    this.allDetections = allDetections;
    return allDetections;
  }

  /**
   * Get detection for specific road
   * @param {string} roadId
   * @returns {Object}
   */
  getDetection(roadId) {
    return this.detectors[roadId]?.lastDetection || null;
  }

  /**
   * Get all detections
   * @returns {Object}
   */
  getAllDetections() {
    return this.allDetections;
  }

  /**
   * Get detector stats
   * @returns {Object} Stats for each detector
   */
  getStats() {
    const stats = {};
    ROADS.forEach(road => {
      stats[road] = this.detectors[road].getStats();
    });
    return stats;
  }

  /**
   * Start continuous detection on all roads
   * @param {Function} onUpdate - Called when any road detects
   */
  startDetectionAll(onUpdate) {
    ROADS.forEach(road => {
      this.detectors[road].startDetection((detection) => {
        this.allDetections[road] = detection;
        if (onUpdate) {
          onUpdate(road, detection);
        }
      });
    });

    Logger.info('Detection started on all roads');
  }

  /**
   * Stop detection on all roads
   */
  stopDetectionAll() {
    ROADS.forEach(road => {
      this.detectors[road].stopDetection();
    });
    Logger.info('Detection stopped on all roads');
  }

  /**
   * Reset all detectors
   */
  resetAll() {
    ROADS.forEach(road => {
      this.detectors[road].reset();
    });
    this.allDetections = {};
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { VehicleDetector, DetectionManager };

export default {
  VehicleDetector,
  DetectionManager
};
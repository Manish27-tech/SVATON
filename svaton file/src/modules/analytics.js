/**
 * SVATON - Phase 3: Traffic Analytics Module
 * Analyzes vehicle detection data to calculate traffic density and metrics
 * 
 * Calculations:
 * - Vehicle density (vehicles per lane capacity)
 * - Wait time estimation
 * - Flow rates
 * - Congestion levels
 */

import {
  ROADS,
  DENSITY_LEVELS,
  DENSITY_THRESHOLDS,
  DEFAULT_LANE_CONFIG,
  METRICS_CONFIG,
  getCurrentTimestamp
} from '../core/types.js';

import {
  roundTo,
  calculateDensity,
  calculateWeightedVehicleCount,
  estimateWaitTime,
  getDensityInfo,
  calculateFuelWastage,
  calculateCO2Emissions,
  calculateAverageWaitTime,
  calculateOverallCongestion,
  Logger
} from '../core/utils.js';

// ============================================================================
// TRAFFIC ANALYZER CLASS
// ============================================================================

/**
 * TrafficAnalyzer - Analyzes traffic patterns and calculates metrics
 * 
 * Processes detection data to produce:
 * - Real-time density scores
 * - Traffic flow metrics
 * - Environmental impact estimates
 * - Predictive indicators
 */
class TrafficAnalyzer {
  constructor(config = {}) {
    this.config = {
      laneConfig: DEFAULT_LANE_CONFIG,
      baseWaitTime: 30,
      updateInterval: 1000, // ms
      ...config
    };

    this.roadData = {};
    this.analyticsHistory = [];
    this.currentAnalytics = null;

    // Initialize road data structure
    ROADS.forEach(road => {
      this.roadData[road] = {
        roadId: road,
        vehicles: 0,
        density: 0,
        densityLevel: DENSITY_LEVELS.LOW,
        waitTime: 0,
        flowRate: 0,
        fuelWastage: 0,
        co2Emissions: 0,
        timestamp: null
      };
    });
  }

  /**
   * Analyze detection data and calculate all metrics
   * 
   * Process:
   * 1. Validate input data
   * 2. Calculate weighted vehicle counts
   * 3. Compute density scores
   * 4. Estimate wait times
   * 5. Calculate environmental impact
   * 6. Update road data
   * 
   * @param {Object} detectionData - Detection results for each road
   * @returns {Object} Analysis results
   */
  analyze(detectionData) {
    const analysisStartTime = performance.now();

    // Validate input
    if (!detectionData || typeof detectionData !== 'object') {
      Logger.error('Invalid detection data for analysis');
      return null;
    }

    const analysis = {
      timestamp: getCurrentTimestamp(),
      roads: {},
      system: {}
    };

    // Analyze each road
    Object.entries(detectionData).forEach(([roadId, detection]) => {
      const roadAnalysis = this.analyzeRoad(roadId, detection);
      if (roadAnalysis) {
        analysis.roads[roadId] = roadAnalysis;
        this.roadData[roadId] = roadAnalysis;
      }
    });

    // Calculate system-wide metrics
    analysis.system = this.calculateSystemMetrics(analysis.roads);

    // Add processing metadata
    analysis.processingTimeMs = Math.round(performance.now() - analysisStartTime);

    // Update history
    this.currentAnalytics = analysis;
    this.analyticsHistory.push(analysis);

    // Keep only last 100 analyses
    if (this.analyticsHistory.length > 100) {
      this.analyticsHistory.shift();
    }

    Logger.info('Traffic analysis completed', { roadsAnalyzed: Object.keys(analysis.roads).length });

    return analysis;
  }

  /**
   * Analyze a single road
   * @private
   * @param {string} roadId
   * @param {Object} detection
   * @returns {Object} Road analysis
   */
  analyzeRoad(roadId, detection) {
    if (!detection) {
      return null;
    }

    // Calculate weighted vehicle count
    const weightedCount = calculateWeightedVehicleCount(detection.vehicles);

    // Get lane configuration
    const laneConfig = this.config.laneConfig[roadId];
    if (!laneConfig) {
      Logger.warn(`No lane config for road ${roadId}`);
      return null;
    }

    // Calculate density
    const density = calculateDensity(weightedCount, laneConfig.capacity);
    const densityInfo = getDensityInfo(density);

    // Calculate wait time
    const waitTime = estimateWaitTime(density, this.config.baseWaitTime);

    // Calculate flow rate (vehicles per minute)
    const flowRate = detection.totalVehicles / (this.config.updateInterval / 60000);

    // Calculate environmental impact
    const idleTimeMinutes = waitTime / 60;
    const fuelWastage = calculateFuelWastage(idleTimeMinutes);
    const co2Emissions = calculateCO2Emissions(idleTimeMinutes);

    return {
      roadId,
      timestamp: getCurrentTimestamp(),
      // Vehicle metrics
      totalVehicles: detection.totalVehicles,
      vehicleBreakdown: detection.vehicles,
      weightedVehicleCount: roundTo(weightedCount, 2),
      // Density metrics
      laneCapacity: laneConfig.capacity,
      lanes: laneConfig.lanes,
      densityScore: densityInfo.density,
      densityLevel: densityInfo.level,
      densitySeverity: densityInfo.severity,
      densityColor: densityInfo.color,
      // Traffic flow metrics
      waitTime: roundTo(waitTime, 0),
      flowRate: roundTo(flowRate, 2),
      estimatedClearTime: this.estimateClearTime(weightedCount, laneConfig.capacity),
      // Environmental impact
      idleTimeMinutes: roundTo(idleTimeMinutes, 2),
      fuelWastage: roundTo(fuelWastage, 2),
      co2Emissions: roundTo(co2Emissions, 2),
      // Detection metadata
      detectionConfidence: detection.confidence,
      processingTimeMs: detection.processingTimeMs
    };
  }

  /**
   * Estimate time to clear congestion
   * @private
   * @param {number} vehicleCount
   * @param {number} capacity
   * @returns {number} Estimated clear time in seconds
   */
  estimateClearTime(vehicleCount, capacity) {
    if (vehicleCount <= capacity) {
      return 0; // No congestion
    }

    // Assume vehicles clear at rate of 1 vehicle per 3 seconds
    const congestionVehicles = vehicleCount - capacity;
    const clearRate = 20; // vehicles per minute
    const clearTimeSeconds = (congestionVehicles / clearRate) * 60;

    return Math.round(clearTimeSeconds);
  }

  /**
   * Calculate system-wide metrics
   * @private
   * @param {Object} roadsAnalysis
   * @returns {Object} System metrics
   */
  calculateSystemMetrics(roadsAnalysis) {
    const roads = Object.values(roadsAnalysis);

    if (roads.length === 0) {
      return this.getEmptySystemMetrics();
    }

    // Calculate averages and totals
    const totalVehicles = roads.reduce((sum, r) => sum + r.totalVehicles, 0);
    const avgDensity = roundTo(
      roads.reduce((sum, r) => sum + r.densityScore, 0) / roads.length,
      2
    );
    const avgWaitTime = roundTo(
      roads.reduce((sum, r) => sum + r.waitTime, 0) / roads.length,
      0
    );
    const avgFlowRate = roundTo(
      roads.reduce((sum, r) => sum + r.flowRate, 0) / roads.length,
      2
    );
    const totalFuelWastage = roundTo(
      roads.reduce((sum, r) => sum + r.fuelWastage, 0),
      2
    );
    const totalCO2Emissions = roundTo(
      roads.reduce((sum, r) => sum + r.co2Emissions, 0),
      2
    );

    // Count roads by density level
    const densityCounts = {
      [DENSITY_LEVELS.LOW]: 0,
      [DENSITY_LEVELS.NORMAL]: 0,
      [DENSITY_LEVELS.MODERATE]: 0,
      [DENSITY_LEVELS.HIGH]: 0,
      [DENSITY_LEVELS.CRITICAL]: 0
    };

    roads.forEach(road => {
      densityCounts[road.densityLevel]++;
    });

    // Determine overall system status
    const overallCongestion = this.determineOverallCongestion(densityCounts);

    // Calculate optimization potential
    const optimizationPotential = this.calculateOptimizationPotential(avgDensity);

    return {
      timestamp: getCurrentTimestamp(),
      // Aggregate metrics
      totalVehicles,
      averageDensity: avgDensity,
      averageWaitTime: avgWaitTime,
      averageFlowRate: avgFlowRate,
      // Environmental impact
      totalFuelWastage,
      totalCO2Emissions,
      // Status counts
      densityCounts,
      roadsInCongestion: densityCounts[DENSITY_LEVELS.HIGH] + densityCounts[DENSITY_LEVELS.CRITICAL],
      // System status
      overallCongestion,
      systemHealth: this.calculateSystemHealth(densityCounts),
      optimizationPotential,
      // Recommendations
      recommendations: this.generateRecommendations(overallCongestion, densityCounts)
    };
  }

  /**
   * Determine overall congestion level
   * @private
   * @param {Object} densityCounts
   * @returns {string}
   */
  determineOverallCongestion(densityCounts) {
    if (densityCounts[DENSITY_LEVELS.CRITICAL] > 0) {
      return DENSITY_LEVELS.CRITICAL;
    }
    if (densityCounts[DENSITY_LEVELS.HIGH] >= 2) {
      return DENSITY_LEVELS.HIGH;
    }
    if (densityCounts[DENSITY_LEVELS.MODERATE] >= 2) {
      return DENSITY_LEVELS.MODERATE;
    }
    if (densityCounts[DENSITY_LEVELS.NORMAL] >= 2) {
      return DENSITY_LEVELS.NORMAL;
    }
    return DENSITY_LEVELS.LOW;
  }

  /**
   * Calculate system health score (0-100)
   * @private
   * @param {Object} densityCounts
   * @returns {number}
   */
  calculateSystemHealth(densityCounts) {
    const totalRoads = ROADS.length;
    const healthyRoads = densityCounts[DENSITY_LEVELS.LOW] + densityCounts[DENSITY_LEVELS.NORMAL];
    return Math.round((healthyRoads / totalRoads) * 100);
  }

  /**
   * Calculate optimization potential (how much can be improved)
   * @private
   * @param {number} avgDensity
   * @returns {number} 0-100
   */
  calculateOptimizationPotential(avgDensity) {
    // Higher density = more potential for optimization
    const potential = Math.min(avgDensity * 20, 100);
    return Math.round(potential);
  }

  /**
   * Generate actionable recommendations
   * @private
   * @param {string} congestion
   * @param {Object} densityCounts
   * @returns {Array}
   */
  generateRecommendations(congestion, densityCounts) {
    const recommendations = [];

    if (congestion === DENSITY_LEVELS.CRITICAL) {
      recommendations.push('CRITICAL: Deploy additional traffic control');
      recommendations.push('Activate alternate route advisories');
      recommendations.push('Prepare emergency response teams');
    } else if (congestion === DENSITY_LEVELS.HIGH) {
      recommendations.push('Adjust signal timing for congested roads');
      recommendations.push('Monitor for deterioration');
      recommendations.push('Prepare resources for potential escalation');
    } else if (congestion === DENSITY_LEVELS.MODERATE) {
      recommendations.push('Continue monitoring');
      recommendations.push('Be ready to adjust signals');
    }

    if (densityCounts[DENSITY_LEVELS.CRITICAL] > 0) {
      recommendations.push('Handle emergency vehicles with priority');
    }

    return recommendations;
  }

  /**
   * Get empty system metrics (for initialization)
   * @private
   * @returns {Object}
   */
  getEmptySystemMetrics() {
    return {
      timestamp: getCurrentTimestamp(),
      totalVehicles: 0,
      averageDensity: 0,
      averageWaitTime: 0,
      averageFlowRate: 0,
      totalFuelWastage: 0,
      totalCO2Emissions: 0,
      densityCounts: {
        [DENSITY_LEVELS.LOW]: 0,
        [DENSITY_LEVELS.NORMAL]: 0,
        [DENSITY_LEVELS.MODERATE]: 0,
        [DENSITY_LEVELS.HIGH]: 0,
        [DENSITY_LEVELS.CRITICAL]: 0
      },
      roadsInCongestion: 0,
      overallCongestion: DENSITY_LEVELS.NORMAL,
      systemHealth: 100,
      optimizationPotential: 0,
      recommendations: []
    };
  }

  /**
   * Get current analysis
   * @returns {Object}
   */
  getCurrentAnalysis() {
    return this.currentAnalytics;
  }

  /**
   * Get road data
   * @param {string} roadId - Optional, specific road
   * @returns {Object}
   */
  getRoadData(roadId = null) {
    if (roadId) {
      return this.roadData[roadId];
    }
    return this.roadData;
  }

  /**
   * Get analytics history
   * @param {number} limit
   * @returns {Array}
   */
  getHistory(limit = 20) {
    return this.analyticsHistory.slice(-limit);
  }

  /**
   * Reset analyzer
   */
  reset() {
    ROADS.forEach(road => {
      this.roadData[road] = {
        roadId: road,
        vehicles: 0,
        density: 0,
        densityLevel: DENSITY_LEVELS.LOW,
        waitTime: 0,
        flowRate: 0,
        fuelWastage: 0,
        co2Emissions: 0,
        timestamp: null
      };
    });
    this.analyticsHistory = [];
    this.currentAnalytics = null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { TrafficAnalyzer };

export default {
  TrafficAnalyzer
};
/**
 * SVATON - Phase 6: Traffic Prediction Module
 * LSTM-based traffic prediction for 30-60 minute forecasts
 * 
 * Features:
 * - Time series forecasting
 * - Seasonality detection
 * - Anomaly handling
 * - Confidence scoring
 * 
 * In production:
 * - TensorFlow.js for LSTM inference
 * - Pre-trained models on 12+ months data
 * - Monthly retraining
 * - Real-time prediction serving
 */

import {
  PREDICTION_CONFIG,
  ROADS,
  DENSITY_LEVELS,
  getCurrentTimestamp
} from '../core/types.js';

import {
  roundTo,
  Logger
} from '../core/utils.js';

// ============================================================================
// TIME SERIES DATA HANDLER
// ============================================================================

/**
 * TimeSeriesData - Manages historical traffic data
 */
class TimeSeriesData {
  constructor(config = {}) {
    this.config = {
      windowSize: 24, // Last 24 hours
      forecastHorizon: 8, // 8 future periods
      ...config
    };

    this.historicalData = {};
    this.maxDataPoints = PREDICTION_CONFIG.HISTORICAL_DATA_MONTHS * 30 * 24; // ~1 year

    // Initialize data storage for each road
    ROADS.forEach(road => {
      this.historicalData[road] = [];
    });
  }

  /**
   * Add new data point to historical data
   * @param {string} roadId
   * @param {Object} data - { density, waitTime, flowRate, timestamp }
   */
  addDataPoint(roadId, data) {
    if (!this.historicalData[roadId]) {
      this.historicalData[roadId] = [];
    }

    this.historicalData[roadId].push({
      ...data,
      timestamp: data.timestamp || getCurrentTimestamp()
    });

    // Keep only recent data
    if (this.historicalData[roadId].length > this.maxDataPoints) {
      this.historicalData[roadId].shift();
    }
  }

  /**
   * Get historical data window
   * @param {string} roadId
   * @param {number} windowSize
   * @returns {Array}
   */
  getDataWindow(roadId, windowSize = this.config.windowSize) {
    const data = this.historicalData[roadId] || [];
    return data.slice(-windowSize);
  }

  /**
   * Get all data for road
   * @param {string} roadId
   * @returns {Array}
   */
  getAllData(roadId) {
    return this.historicalData[roadId] || [];
  }

  /**
   * Get data statistics
   * @param {string} roadId
   * @returns {Object}
   */
  getStatistics(roadId) {
    const data = this.historicalData[roadId] || [];

    if (data.length === 0) {
      return null;
    }

    const densities = data.map(d => d.density || 0);
    const mean = densities.reduce((a, b) => a + b) / densities.length;
    const variance = densities.reduce((a, b) => a + Math.pow(b - mean, 2)) / densities.length;
    const stdDev = Math.sqrt(variance);

    return {
      count: data.length,
      mean: roundTo(mean, 2),
      stdDev: roundTo(stdDev, 2),
      min: roundTo(Math.min(...densities), 2),
      max: roundTo(Math.max(...densities), 2),
      lastUpdate: data[data.length - 1].timestamp
    };
  }
}

// ============================================================================
// LSTM PREDICTOR (Simplified)
// ============================================================================

/**
 * LSTMPredictor - Simplified LSTM-like prediction
 * 
 * In production:
 * - TensorFlow.js with actual LSTM layers
 * - 3x LSTM cells (128 units each)
 * - Dropout for regularization
 * - GPU acceleration
 * 
 * This simplified version uses:
 * - Moving average
 * - Trend analysis
 * - Seasonal decomposition
 * - Ensemble methods
 */
class LSTMPredictor {
  constructor(timeSeriesData, config = {}) {
    this.timeSeriesData = timeSeriesData;
    this.config = {
      windowSize: 24,
      forecastHorizon: 8,
      confidenceThreshold: PREDICTION_CONFIG.LSTM_CONFIDENCE_THRESHOLD,
      ...config
    };

    this.predictions = {};
    this.confidenceScores = {};
  }

  /**
   * Predict traffic for next periods
   * 
   * Ensemble approach:
   * 1. Exponential moving average
   * 2. Linear regression trend
   * 3. Seasonal pattern (hour-of-day, day-of-week)
   * 4. Combine with weighted average
   * 
   * @param {string} roadId
   * @param {number} steps - Number of periods to forecast
   * @returns {Array} Predictions with confidence
   */
  predict(roadId, steps = this.config.forecastHorizon) {
    const window = this.timeSeriesData.getDataWindow(roadId, this.config.windowSize);

    if (window.length < 5) {
      Logger.warn(`Insufficient data for prediction on road ${roadId}`);
      return this.getDefaultPrediction(steps);
    }

    const densities = window.map(d => d.density || 0);

    // Method 1: Exponential Moving Average
    const emaForecast = this.exponentialMovingAverage(densities, steps);

    // Method 2: Linear Trend
    const trendForecast = this.linearTrendForecast(densities, steps);

    // Method 3: Seasonal Pattern
    const seasonalForecast = this.seasonalForecast(window, steps);

    // Ensemble: Combine predictions
    const ensembleForecast = this.ensemblePredict([emaForecast, trendForecast, seasonalForecast]);

    // Calculate confidence
    const confidence = this.calculateConfidence(window, ensembleForecast);

    const predictions = [];
    for (let i = 0; i < steps; i++) {
      predictions.push({
        period: i + 1,
        predictedDensity: roundTo(ensembleForecast[i], 2),
        confidence: roundTo(confidence, 3),
        densityLevel: this.getDensityLevel(ensembleForecast[i])
      });
    }

    this.predictions[roadId] = predictions;
    this.confidenceScores[roadId] = confidence;

    return predictions;
  }

  /**
   * Exponential Moving Average forecast
   * @private
   * @param {Array} values
   * @param {number} steps
   * @returns {Array}
   */
  exponentialMovingAverage(values, steps) {
    const alpha = 0.3; // Smoothing factor
    let ema = values[values.length - 1];
    const forecast = [];

    for (let i = 0; i < steps; i++) {
      forecast.push(ema);
      // In real EMA, next value would come from data; we assume plateau
    }

    return forecast;
  }

  /**
   * Linear trend forecast
   * @private
   * @param {Array} values
   * @param {number} steps
   * @returns {Array}
   */
  linearTrendForecast(values, steps) {
    if (values.length < 2) {
      return Array(steps).fill(values[values.length - 1]);
    }

    // Calculate slope
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = values.length;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Forecast using linear equation: y = slope*x + intercept
    const forecast = [];
    for (let i = 0; i < steps; i++) {
      const y = slope * (n + i) + intercept;
      forecast.push(Math.max(0, y)); // No negative density
    }

    return forecast;
  }

  /**
   * Seasonal forecast (hour-of-day pattern)
   * @private
   * @param {Array} window
   * @param {number} steps
   * @returns {Array}
   */
  seasonalForecast(window, steps) {
    const forecast = [];

    // Group by hour (simplified - assumes 1 data point per hour)
    const hourlyAverage = this.calculateHourlyAverage(window);

    // Get current hour
    const currentDate = new Date(window[window.length - 1].timestamp);
    let currentHour = currentDate.getHours();

    for (let i = 0; i < steps; i++) {
      const nextHour = (currentHour + i + 1) % 24;
      forecast.push(hourlyAverage[nextHour] || 0);
    }

    return forecast;
  }

  /**
   * Calculate hourly average pattern
   * @private
   * @param {Array} window
   * @returns {Array}
   */
  calculateHourlyAverage(window) {
    const hourlyData = Array(24).fill(null).map(() => []);

    window.forEach(dataPoint => {
      const date = new Date(dataPoint.timestamp);
      const hour = date.getHours();
      hourlyData[hour].push(dataPoint.density || 0);
    });

    const hourlyAverage = Array(24).fill(0);
    for (let hour = 0; hour < 24; hour++) {
      if (hourlyData[hour].length > 0) {
        hourlyAverage[hour] = hourlyData[hour].reduce((a, b) => a + b) / hourlyData[hour].length;
      }
    }

    return hourlyAverage;
  }

  /**
   * Ensemble prediction (weighted average of methods)
   * @private
   * @param {Array<Array>} forecasts
   * @returns {Array}
   */
  ensemblePredict(forecasts) {
    const weights = [0.4, 0.35, 0.25]; // EMA, Trend, Seasonal weights
    const ensemble = [];

    for (let i = 0; i < forecasts[0].length; i++) {
      let value = 0;

      forecasts.forEach((forecast, j) => {
        value += forecast[i] * weights[j];
      });

      ensemble.push(value);
    }

    return ensemble;
  }

  /**
   * Calculate prediction confidence
   * @private
   * @param {Array} historical
   * @param {Array} forecast
   * @returns {number} Confidence 0-1
   */
  calculateConfidence(historical, forecast) {
    // Confidence based on data consistency
    const densities = historical.map(d => d.density || 0);

    // Calculate variance (lower variance = higher confidence)
    const mean = densities.reduce((a, b) => a + b) / densities.length;
    const variance = densities.reduce((a, b) => a + Math.pow(b - mean, 2)) / densities.length;
    const stdDev = Math.sqrt(variance);

    // Confidence inverse to coefficient of variation
    const cv = mean > 0 ? stdDev / mean : 0;
    const confidence = Math.max(0.5, Math.min(0.99, 1 - cv * 0.2));

    return confidence;
  }

  /**
   * Get density level from density score
   * @private
   * @param {number} density
   * @returns {string}
   */
  getDensityLevel(density) {
    if (density < 0.5) return DENSITY_LEVELS.LOW;
    if (density < 0.8) return DENSITY_LEVELS.NORMAL;
    if (density < 1.2) return DENSITY_LEVELS.MODERATE;
    if (density < 1.8) return DENSITY_LEVELS.HIGH;
    return DENSITY_LEVELS.CRITICAL;
  }

  /**
   * Get default prediction (when insufficient data)
   * @private
   * @param {number} steps
   * @returns {Array}
   */
  getDefaultPrediction(steps) {
    return Array(steps).fill(0).map((_, i) => ({
      period: i + 1,
      predictedDensity: 0.5,
      confidence: 0.3,
      densityLevel: DENSITY_LEVELS.NORMAL
    }));
  }

  /**
   * Get predictions for road
   * @param {string} roadId
   * @returns {Array}
   */
  getPredictions(roadId) {
    return this.predictions[roadId] || [];
  }

  /**
   * Get confidence score for road
   * @param {string} roadId
   * @returns {number}
   */
  getConfidence(roadId) {
    return this.confidenceScores[roadId] || 0;
  }
}

// ============================================================================
// PREDICTION MANAGER
// ============================================================================

/**
 * PredictionManager - Orchestrates prediction system
 */
class PredictionManager {
  constructor(config = {}) {
    this.config = {
      updateInterval: PREDICTION_CONFIG.PREDICTION_INTERVAL,
      forecastWindow: PREDICTION_CONFIG.FORECAST_WINDOW / 60, // Convert to periods (5-min)
      ...config
    };

    this.timeSeriesData = new TimeSeriesData(config);
    this.predictor = new LSTMPredictor(this.timeSeriesData, config);
    this.predictionHistory = {};
    this.lastUpdate = null;

    // Initialize history for each road
    ROADS.forEach(road => {
      this.predictionHistory[road] = [];
    });
  }

  /**
   * Update with new traffic data
   * @param {Object} roadData
   */
  updateData(roadData) {
    ROADS.forEach(road => {
      const data = roadData[road];

      if (data) {
        this.timeSeriesData.addDataPoint(road, {
          density: data.densityScore || 0,
          waitTime: data.waitTime || 0,
          flowRate: data.flowRate || 0,
          timestamp: data.timestamp || getCurrentTimestamp()
        });
      }
    });

    this.lastUpdate = getCurrentTimestamp();
  }

  /**
   * Generate predictions for all roads
   * @returns {Object} Predictions for each road
   */
  generatePredictions() {
    const allPredictions = {};

    ROADS.forEach(road => {
      const predictions = this.predictor.predict(road, 8); // 8 periods ahead
      allPredictions[road] = {
        road,
        predictions,
        confidence: this.predictor.getConfidence(road),
        generatedAt: getCurrentTimestamp()
      };

      // Store in history
      this.predictionHistory[road].push({
        timestamp: getCurrentTimestamp(),
        predictions
      });

      // Keep only last 100 prediction sets
      if (this.predictionHistory[road].length > 100) {
        this.predictionHistory[road].shift();
      }
    });

    return allPredictions;
  }

  /**
   * Get recommendations based on predictions
   * @param {Object} predictions
   * @returns {Array} Actionable recommendations
   */
  generateRecommendations(predictions) {
    const recommendations = [];

    Object.entries(predictions).forEach(([road, data]) => {
      const forecast = data.predictions;

      // Check for predicted congestion
      const criticalPredictions = forecast.filter(p => p.densityLevel === DENSITY_LEVELS.CRITICAL);

      if (criticalPredictions.length > 0) {
        const timeToCongest = criticalPredictions[0].period * 5; // minutes
        recommendations.push({
          severity: 'CRITICAL',
          message: `Road ${road}: Critical congestion predicted in ${timeToCongest} minutes`,
          action: 'DEPLOY_TRAFFIC_CONTROL',
          road: road
        });
      }

      // Check for high congestion
      const highPredictions = forecast.filter(p => p.densityLevel === DENSITY_LEVELS.HIGH);

      if (highPredictions.length > 2) {
        recommendations.push({
          severity: 'HIGH',
          message: `Road ${road}: High congestion expected for extended period`,
          action: 'PREPARE_ALTERNATE_ROUTES',
          road: road
        });
      }
    });

    return recommendations;
  }

  /**
   * Get all current predictions
   * @returns {Object}
   */
  getAllPredictions() {
    return this.predictor.predictions;
  }

  /**
   * Get prediction history for road
   * @param {string} roadId
   * @param {number} limit
   * @returns {Array}
   */
  getHistory(roadId, limit = 20) {
    return this.predictionHistory[roadId]?.slice(-limit) || [];
  }

  /**
   * Get system statistics
   * @returns {Object}
   */
  getStats() {
    const stats = {};

    ROADS.forEach(road => {
      stats[road] = this.timeSeriesData.getStatistics(road);
    });

    return {
      lastUpdate: this.lastUpdate,
      roadStatistics: stats,
      predictions: this.predictor.predictions
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  TimeSeriesData,
  LSTMPredictor,
  PredictionManager
};

export default {
  TimeSeriesData,
  LSTMPredictor,
  PredictionManager
};
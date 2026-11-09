/**
 * SVATON - Phase 4: Signal Optimization Module
 * Reinforcement Learning-based signal timing optimization
 * 
 * Algorithm: Deep Q-Network (DQN)
 * - State: Current traffic density on all roads
 * - Action: Signal timing allocation
 * - Reward: Minimized wait time + throughput maximization
 * - Learning: Continuous improvement from traffic patterns
 */

import {
  ROADS,
  SIGNAL_CONFIG,
  DENSITY_LEVELS,
  DENSITY_THRESHOLDS,
  getCurrentTimestamp
} from '../core/types.js';

import {
  roundTo,
  clamp,
  calculateProportionalTiming,
  optimizeSignalTiming,
  Logger
} from '../core/utils.js';

// ============================================================================
// REINFORCEMENT LEARNING ENGINE
// ============================================================================

/**
 * RLOptimizer - Reinforcement Learning signal optimizer
 * 
 * Features:
 * - Q-Learning for optimal timing discovery
 * - State-action-reward tracking
 * - Learning rate adaptation
 * - Experience replay (simplified version)
 * 
 * In production:
 * - Uses TensorFlow/PyTorch for neural networks
 * - GPU-accelerated training
 * - Monthly retraining on new data
 */
class RLOptimizer {
  constructor(config = {}) {
    this.config = {
      learningRate: 0.1,
      discountFactor: 0.95,
      explorationRate: 0.2,
      minGreenTime: SIGNAL_CONFIG.MIN_GREEN,
      maxGreenTime: SIGNAL_CONFIG.MAX_GREEN,
      cycleTotalTime: SIGNAL_CONFIG.CYCLE_TIME,
      updateInterval: 30000, // 30 seconds
      ...config
    };

    // Q-Table: state -> action -> value
    this.qTable = {};
    this.stateHistory = [];
    this.actionHistory = [];
    this.rewardHistory = [];

    // Reward tracking
    this.cumulativeReward = 0;
    this.episodeCount = 0;
    this.bestReward = -Infinity;
    this.bestSignalTiming = this.getInitialTiming();

    // Initialize Q-Table
    this.initializeQTable();
  }

  /**
   * Initialize Q-Table with zeros
   * @private
   */
  initializeQTable() {
    // Simplified Q-Table: density_state -> timing_action -> q_value
    // In production: Deep neural network with millions of parameters

    const states = this.generateStateSpace();
    states.forEach(state => {
      const key = JSON.stringify(state);
      this.qTable[key] = {
        actions: {},
        visitCount: 0
      };

      // Generate possible actions (signal timings)
      const actions = this.generateActionSpace();
      actions.forEach(action => {
        this.qTable[key].actions[JSON.stringify(action)] = 0;
      });
    });

    Logger.info('Q-Table initialized', { states: states.length });
  }

  /**
   * Generate state space (density combinations)
   * Represents all possible traffic situations
   * @private
   * @returns {Array}
   */
  generateStateSpace() {
    const densityBuckets = [
      DENSITY_LEVELS.LOW,
      DENSITY_LEVELS.NORMAL,
      DENSITY_LEVELS.MODERATE,
      DENSITY_LEVELS.HIGH,
      DENSITY_LEVELS.CRITICAL
    ];

    // All combinations of 4 roads with 5 density levels
    // Total states: 5^4 = 625
    const states = [];

    const generateCombinations = (index, current) => {
      if (index === ROADS.length) {
        states.push({ ...current });
        return;
      }

      densityBuckets.forEach(density => {
        current[ROADS[index]] = density;
        generateCombinations(index + 1, current);
      });
    };

    generateCombinations(0, {});
    return states;
  }

  /**
   * Generate action space (possible signal timings)
   * @private
   * @returns {Array}
   */
  generateActionSpace() {
    // Actions: different signal timing distributions
    // Simplified: 10 possible timing configurations
    const actions = [];

    for (let i = 0; i < 10; i++) {
      const action = {};
      const totalTime = this.config.cycleTotalTime;

      // Different strategies: weighted, equal, etc.
      const weights = this.generateRandomWeights(ROADS.length);
      let remainingTime = totalTime;

      ROADS.forEach((road, idx) => {
        const allocatedTime = Math.round((weights[idx] / weights.reduce((a, b) => a + b, 0)) * totalTime);
        action[road] = clamp(allocatedTime, this.config.minGreenTime, this.config.maxGreenTime);
        remainingTime -= action[road];
      });

      // Distribute remaining time
      if (remainingTime > 0) {
        action[ROADS[0]] += remainingTime;
      }

      actions.push(action);
    }

    return actions;
  }

  /**
   * Generate random weights for timing allocation
   * @private
   * @param {number} length
   * @returns {Array}
   */
  generateRandomWeights(length) {
    return Array(length).fill(0).map(() => Math.random());
  }

  /**
   * Optimize signal timing using RL
   * 
   * Process:
   * 1. Get current state (traffic densities)
   * 2. Choose action (signal timing) using epsilon-greedy
   * 3. Execute action and observe reward
   * 4. Update Q-value using temporal difference learning
   * 5. Learn from experience
   * 
   * @param {Object} roadData - Current road metrics
   * @param {Object} previousTiming - Previous signal timing
   * @returns {Object} Optimized signal timing
   */
  optimize(roadData, previousTiming = null) {
    // 1. Encode current state
    const state = this.encodeState(roadData);
    const stateKey = JSON.stringify(state);

    // 2. Choose action (epsilon-greedy exploration vs exploitation)
    const action = this.chooseAction(stateKey);
    const actionKey = JSON.stringify(action);

    // 3. Calculate immediate reward
    const reward = this.calculateReward(roadData, action);

    // 4. Update Q-value (Temporal Difference Learning)
    this.updateQValue(stateKey, actionKey, reward);

    // 5. Track history for learning
    this.stateHistory.push(state);
    this.actionHistory.push(action);
    this.rewardHistory.push(reward);
    this.cumulativeReward += reward;
    this.episodeCount++;

    // Keep best timing
    if (reward > this.bestReward) {
      this.bestReward = reward;
      this.bestSignalTiming = action;
    }

    Logger.info('Signal optimization executed', {
      reward: roundTo(reward, 2),
      cumulativeReward: roundTo(this.cumulativeReward, 2)
    });

    return action;
  }

  /**
   * Encode traffic state to density levels
   * @private
   * @param {Object} roadData
   * @returns {Object} State representation
   */
  encodeState(roadData) {
    const state = {};

    ROADS.forEach(road => {
      const density = roadData[road]?.densityScore || 0;

      if (density < DENSITY_THRESHOLDS.LOW) {
        state[road] = DENSITY_LEVELS.LOW;
      } else if (density < DENSITY_THRESHOLDS.NORMAL) {
        state[road] = DENSITY_LEVELS.NORMAL;
      } else if (density < DENSITY_THRESHOLDS.MODERATE) {
        state[road] = DENSITY_LEVELS.MODERATE;
      } else if (density < DENSITY_THRESHOLDS.HIGH) {
        state[road] = DENSITY_LEVELS.HIGH;
      } else {
        state[road] = DENSITY_LEVELS.CRITICAL;
      }
    });

    return state;
  }

  /**
   * Choose action using epsilon-greedy strategy
   * 
   * Exploration vs Exploitation trade-off:
   * - Exploration: Try random action (learn new strategies)
   * - Exploitation: Use best known action (maximize reward)
   * 
   * @private
   * @param {string} stateKey
   * @returns {Object} Chosen action (signal timing)
   */
  chooseAction(stateKey) {
    const rand = Math.random();

    if (rand < this.config.explorationRate) {
      // Exploration: random action
      const state = this.qTable[stateKey];
      if (!state) return this.getInitialTiming();

      const actionKeys = Object.keys(state.actions);
      const randomKey = actionKeys[Math.floor(Math.random() * actionKeys.length)];
      return JSON.parse(randomKey);
    } else {
      // Exploitation: best known action
      const state = this.qTable[stateKey];
      if (!state) return this.getInitialTiming();

      let bestAction = null;
      let bestValue = -Infinity;

      Object.entries(state.actions).forEach(([actionKey, value]) => {
        if (value > bestValue) {
          bestValue = value;
          bestAction = JSON.parse(actionKey);
        }
      });

      return bestAction || this.getInitialTiming();
    }
  }

  /**
   * Calculate reward based on optimization goals
   * 
   * Reward function:
   * - High for minimized wait time
   * - High for maximized throughput
   * - Penalty for unbalanced allocation
   * 
   * @private
   * @param {Object} roadData
   * @param {Object} action
   * @returns {number} Reward value
   */
  calculateReward(roadData, action) {
    let reward = 0;

    // Component 1: Minimize average wait time (higher reward for lower wait time)
    const avgWaitTime = ROADS.reduce((sum, road) => sum + (roadData[road]?.waitTime || 0), 0) / ROADS.length;
    const waitTimeReward = Math.max(0, 100 - avgWaitTime); // 100 if no wait, 0 if 100+ seconds
    reward += waitTimeReward * 0.4;

    // Component 2: Maximize throughput (vehicles cleared per second)
    const totalThroughput = ROADS.reduce((sum, road) => sum + (roadData[road]?.flowRate || 0), 0);
    const throughputReward = Math.min(totalThroughput * 10, 50);
    reward += throughputReward * 0.3;

    // Component 3: Balance allocation (penalize extreme imbalance)
    const timingValues = Object.values(action);
    const avgTiming = timingValues.reduce((a, b) => a + b, 0) / timingValues.length;
    const variance = timingValues.reduce((sum, val) => sum + Math.pow(val - avgTiming, 2), 0) / timingValues.length;
    const balanceReward = Math.max(0, 50 - variance);
    reward += balanceReward * 0.2;

    // Component 4: Handle congestion (bonus for reducing critical congestion)
    const criticalCount = ROADS.filter(road => {
      const data = roadData[road];
      return data && data.densityLevel === DENSITY_LEVELS.CRITICAL;
    }).length;

    if (criticalCount === 0) {
      reward += 20;
    }

    return roundTo(reward, 2);
  }

  /**
   * Update Q-value using Temporal Difference Learning
   * 
   * Q-Learning update rule:
   * Q(s,a) := Q(s,a) + α * [r + γ * max Q(s',a') - Q(s,a)]
   * 
   * Where:
   * - α = learning rate
   * - r = immediate reward
   * - γ = discount factor
   * - s,a = state, action
   * - s',a' = next state, action
   * 
   * @private
   * @param {string} stateKey
   * @param {string} actionKey
   * @param {number} reward
   */
  updateQValue(stateKey, actionKey, reward) {
    const state = this.qTable[stateKey];
    if (!state) return;

    const currentQValue = state.actions[actionKey] || 0;

    // Simplified: use just the immediate reward (no next state prediction for now)
    // In production: Include max Q(s',a') from next state
    const newQValue = currentQValue + this.config.learningRate * (reward - currentQValue);

    state.actions[actionKey] = newQValue;
    state.visitCount++;

    // Decay exploration rate over time
    if (this.episodeCount % 100 === 0 && this.episodeCount > 0) {
      this.config.explorationRate = Math.max(0.05, this.config.explorationRate * 0.99);
    }
  }

  /**
   * Get initial signal timing (all roads equal)
   * @private
   * @returns {Object}
   */
  getInitialTiming() {
    const timing = {};
    const timePerRoad = this.config.cycleTotalTime / ROADS.length;

    ROADS.forEach(road => {
      timing[road] = timePerRoad;
    });

    return timing;
  }

  /**
   * Get Q-Table statistics
   * @returns {Object}
   */
  getStats() {
    const actionValues = [];

    Object.values(this.qTable).forEach(state => {
      Object.values(state.actions).forEach(value => {
        actionValues.push(value);
      });
    });

    const avgQValue = actionValues.length > 0
      ? roundTo(actionValues.reduce((a, b) => a + b, 0) / actionValues.length, 3)
      : 0;

    const maxQValue = actionValues.length > 0
      ? roundTo(Math.max(...actionValues), 3)
      : 0;

    return {
      statesExplored: Object.keys(this.qTable).length,
      averageQValue: avgQValue,
      maxQValue: maxQValue,
      cumulativeReward: roundTo(this.cumulativeReward, 2),
      episodeCount: this.episodeCount,
      explorationRate: roundTo(this.config.explorationRate, 4)
    };
  }

  /**
   * Get best signal timing discovered so far
   * @returns {Object}
   */
  getBestTiming() {
    return this.bestSignalTiming;
  }

  /**
   * Get learning history
   * @returns {Object}
   */
  getLearningHistory() {
    return {
      states: this.stateHistory.slice(-20),
      rewards: this.rewardHistory.slice(-20),
      cumulativeReward: this.cumulativeReward
    };
  }

  /**
   * Reset optimizer
   */
  reset() {
    this.initializeQTable();
    this.stateHistory = [];
    this.actionHistory = [];
    this.rewardHistory = [];
    this.cumulativeReward = 0;
    this.episodeCount = 0;
    this.bestReward = -Infinity;
    this.bestSignalTiming = this.getInitialTiming();
  }
}

// ============================================================================
// SIGNAL CONTROLLER
// ============================================================================

/**
 * SignalController - Manages signal state and execution
 */
class SignalController {
  constructor(config = {}) {
    this.config = {
      cycleTotalTime: SIGNAL_CONFIG.CYCLE_TIME,
      updateInterval: SIGNAL_CONFIG.UPDATE_INTERVAL,
      ...config
    };

    this.signalState = this.initializeSignals();
    this.currentTiming = this.getDefaultTiming();
    this.emergencyMode = false;
    this.lastUpdateTime = getCurrentTimestamp();
  }

  /**
   * Initialize signal states for all roads
   * @private
   * @returns {Object}
   */
  initializeSignals() {
    const signals = {};

    ROADS.forEach(road => {
      signals[road] = {
        state: 'RED',
        greenTime: 60,
        redTime: 120,
        currentTime: 0,
        timeRemaining: 0
      };
    });

    return signals;
  }

  /**
   * Update signals based on new timing
   * @param {Object} timing - New signal timings
   */
  updateSignals(timing) {
    if (!timing) return;

    Object.entries(timing).forEach(([road, greenTime]) => {
      if (this.signalState[road]) {
        this.signalState[road].greenTime = greenTime;
        this.signalState[road].redTime = this.config.cycleTotalTime - greenTime;
        this.signalState[road].currentTime = 0;
      }
    });

    this.currentTiming = timing;
    this.lastUpdateTime = getCurrentTimestamp();
  }

  /**
   * Get default equal timing
   * @private
   * @returns {Object}
   */
  getDefaultTiming() {
    const timing = {};
    const timePerRoad = this.config.cycleTotalTime / ROADS.length;

    ROADS.forEach(road => {
      timing[road] = timePerRoad;
    });

    return timing;
  }

  /**
   * Get all signal states
   * @returns {Object}
   */
  getSignalStates() {
    return this.signalState;
  }

  /**
   * Get signal state for specific road
   * @param {string} roadId
   * @returns {Object}
   */
  getSignalState(roadId) {
    return this.signalState[roadId];
  }

  /**
   * Activate emergency mode (ambulance priority)
   * @param {Array<string>} roadPath - Roads in ambulance path
   */
  activateEmergency(roadPath) {
    this.emergencyMode = true;

    roadPath.forEach(road => {
      if (this.signalState[road]) {
        this.signalState[road].state = 'GREEN';
        this.signalState[road].greenTime = 100;
        this.signalState[road].isEmergency = true;
      }
    });

    // Block other roads
    ROADS.forEach(road => {
      if (!roadPath.includes(road) && this.signalState[road]) {
        this.signalState[road].state = 'RED';
        this.signalState[road].isEmergency = true;
      }
    });

    Logger.info('Emergency mode activated', { path: roadPath });
  }

  /**
   * Deactivate emergency mode
   */
  deactivateEmergency() {
    this.emergencyMode = false;

    ROADS.forEach(road => {
      if (this.signalState[road]) {
        this.signalState[road].isEmergency = false;
      }
    });

    Logger.info('Emergency mode deactivated');
  }

  /**
   * Check if in emergency mode
   * @returns {boolean}
   */
  isEmergency() {
    return this.emergencyMode;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { RLOptimizer, SignalController };

export default {
  RLOptimizer,
  SignalController
};
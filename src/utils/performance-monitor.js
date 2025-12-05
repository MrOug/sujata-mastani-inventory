/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      slow: 1000,
      verySlow: 3000
    };
  }

  startTimer(label) {
    this.metrics.set(label, {
      start: performance.now(),
      end: null,
      duration: null
    });
  }

  endTimer(label) {
    const metric = this.metrics.get(label);
    if (!metric) {
      console.warn(`No timer found for: ${label}`);
      return null;
    }

    metric.end = performance.now();
    metric.duration = metric.end - metric.start;

    if (metric.duration > this.thresholds.verySlow) {
      console.warn(`⚠️ VERY SLOW: ${label} took ${metric.duration.toFixed(2)}ms`);
    } else if (metric.duration > this.thresholds.slow) {
      console.log(`⏱️ Slow: ${label} took ${metric.duration.toFixed(2)}ms`);
    }

    return metric.duration;
  }

  async measureAsync(label, fn) {
    this.startTimer(label);
    try {
      return await fn();
    } finally {
      this.endTimer(label);
    }
  }

  clear() {
    this.metrics.clear();
  }
}

export const perfMonitor = new PerformanceMonitor();

export const getMemoryInfo = () => {
  if (performance.memory) {
    return {
      usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
      totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
      usagePercent: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(2) + '%'
    };
  }
  return null;
};

export const getNetworkSpeed = () => {
  if (!navigator.connection) return 'unknown';
  
  const connection = navigator.connection;
  return {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink + ' Mbps',
    rtt: connection.rtt + ' ms',
    isFast: connection.effectiveType === '4g',
    isSlow: ['slow-2g', '2g'].includes(connection.effectiveType)
  };
};

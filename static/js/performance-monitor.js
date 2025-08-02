class AstralisPerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.isEnabled = this.shouldEnable();
        this.init();
    }

    shouldEnable() {
        return window.location.hostname !== 'localhost' && 
               !navigator.doNotTrack && 
               'performance' in window;
    }

    init() {
        if (!this.isEnabled) return;

        if (document.readyState === 'complete') {
            this.collectMetrics();
        } else {
            window.addEventListener('load', () => this.collectMetrics());
        }

        if ('PerformanceObserver' in window) {
            this.observeLongTasks();
            this.observeLargestContentfulPaint();
            this.observeFirstInputDelay();
        }

        // Log results after 3 seconds
        setTimeout(() => this.reportMetrics(), 3000);
    }

    collectMetrics() {
        if (!window.performance || !window.performance.timing) return;

        const timing = window.performance.timing;
        const navigation = window.performance.getEntriesByType('navigation')[0];

        this.metrics = {
            // Core Web Vitals approximation
            domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
            fullPageLoad: timing.loadEventEnd - timing.navigationStart,
            firstByte: timing.responseStart - timing.navigationStart,
            domInteractive: timing.domInteractive - timing.navigationStart,
            
            // Resource loading
            resourcesLoaded: performance.getEntriesByType('resource').length,
            totalTransferSize: this.calculateTotalTransferSize(),
            
            // Browser info
            userAgent: navigator.userAgent.substring(0, 100),
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            connection: this.getConnectionInfo(),
            
            // Page info
            url: window.location.pathname,
            timestamp: new Date().toISOString(),
            referrer: document.referrer || 'direct'
        };

        if (navigation) {
            this.metrics.transferSize = navigation.transferSize || 0;
            this.metrics.encodedBodySize = navigation.encodedBodySize || 0;
        }
    }

    calculateTotalTransferSize() {
        const resources = performance.getEntriesByType('resource');
        return resources.reduce((total, resource) => {
            return total + (resource.transferSize || 0);
        }, 0);
    }

    getConnectionInfo() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            return {
                effectiveType: conn.effectiveType || 'unknown',
                downlink: conn.downlink || 0,
                rtt: conn.rtt || 0
            };
        }
        return 'unknown';
    }

    observeLongTasks() {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > 50) {
                        this.logPerformanceIssue('Long Task', {
                            duration: entry.duration,
                            startTime: entry.startTime
                        });
                    }
                }
            });
            observer.observe({ entryTypes: ['longtask'] });
        } catch (e) {
        }
    }

    observeLargestContentfulPaint() {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.metrics.largestContentfulPaint = entry.startTime;
                }
            });
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
            // Not supported
        }
    }

    observeFirstInputDelay() {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
                }
            });
            observer.observe({ entryTypes: ['first-input'] });
        } catch (e) {
            // Not supported
        }
    }

    logPerformanceIssue(type, data) {
        if (console && console.warn) {
            console.warn(`[Astralis Performance] ${type}:`, data);
        }
    }

    reportMetrics() {
        if (!this.isEnabled || !this.metrics.fullPageLoad) return;

        // Simple performance grading
        const grade = this.calculatePerformanceGrade();
        
        if (window.location.search.includes('debug=performance')) {
            console.group('Astralis Performance Report');
            console.log('Metrics:', this.metrics);
            console.log('Grade:', grade);
            console.log('Suggestions:', this.getPerformanceSuggestions());
            console.groupEnd();
        }

        if (localStorage) {
            try {
                const perfHistory = JSON.parse(localStorage.getItem('astralis_perf') || '[]');
                perfHistory.push({ ...this.metrics, grade });
                // Keep only last 10 entries
                localStorage.setItem('astralis_perf', JSON.stringify(perfHistory.slice(-10)));
            } catch (e) {
                // localStorage not available or full
            }
        }
    }

    calculatePerformanceGrade() {
        const { fullPageLoad, firstByte, largestContentfulPaint } = this.metrics;
        
        let score = 100;
        
        if (fullPageLoad > 3000) score -= 20;
        else if (fullPageLoad > 2000) score -= 10;
        
        if (firstByte > 800) score -= 15;
        else if (firstByte > 400) score -= 5;
        
        if (largestContentfulPaint > 2500) score -= 15;
        else if (largestContentfulPaint > 1200) score -= 5;

        if (score >= 90) return 'A+';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        return 'D';
    }

    getPerformanceSuggestions() {
        const suggestions = [];
        const { fullPageLoad, firstByte, totalTransferSize } = this.metrics;
        
        if (fullPageLoad > 3000) {
            suggestions.push('Consider optimizing images and reducing bundle size');
        }
        
        if (firstByte > 800) {
            suggestions.push('Server response time could be improved');
        }
        
        if (totalTransferSize > 1000000) {
            suggestions.push('Total page size is large, consider lazy loading');
        }
        
        return suggestions.length ? suggestions : ['Performance looks good.'];
    }

    getMetrics() {
        return this.metrics;
    }

    getPerformanceHistory() {
        if (!localStorage) return [];
        try {
            return JSON.parse(localStorage.getItem('astralis_perf') || '[]');
        } catch (e) {
            return [];
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.AstralisPerf = new AstralisPerformanceMonitor();
});

window.showAstralisPerf = () => {
    if (window.AstralisPerf) {
        console.group('Current Astralis Performance');
        console.log('Current Metrics:', window.AstralisPerf.getMetrics());
        console.log('History:', window.AstralisPerf.getPerformanceHistory());
        console.groupEnd();
    }
};

/**
 * Analytics Service Wrapper
 * We use this to abstract the underlying analytics provider (e.g. PostHog) 
 * so we can easily swap it out, mock it, or disable it in dev/offline mode.
 */

class AnalyticsService {
  constructor() {
    this.isInitialized = false;
    this.isOffline = !navigator.onLine;
    this.queue = [];
    
    // Listen for online events to flush offline queue
    window.addEventListener('online', () => {
      this.isOffline = false;
      this.flushQueue();
    });
    window.addEventListener('offline', () => {
      this.isOffline = true;
    });
  }

  // Called when the window object has posthog injected via script tag
  init() {
    if (window.posthog) {
      this.isInitialized = true;
      console.log('📊 Analytics tracking initialized.');
      this.track('App Initialized', { 
         userAgent: navigator.userAgent,
         isPwa: window.matchMedia('(display-mode: standalone)').matches 
      });
    } else {
      console.warn('PostHog not found on window object. Tracking disabled.');
    }
  }

  identify(userId, traits = {}) {
    if (!this.isInitialized || this.isOffline) return;
    try {
      window.posthog.identify(userId, traits);
    } catch (err) {
      console.warn('Analytics Identity Error:', err.message);
    }
  }

  track(eventName, properties = {}) {
    if (this.isOffline) {
      this.queue.push({ eventName, properties, timestamp: Date.now() });
      return;
    }

    if (!this.isInitialized) {
      // If we call track before init finishes loading, queue it
      this.queue.push({ eventName, properties, timestamp: Date.now() });
      return;
    }

    try {
      window.posthog.capture(eventName, properties);
      
      // In dev mode, log to console so we know what's firing
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.groupCollapsed(`📝 Tracked: ${eventName}`);
        console.log(properties);
        console.groupEnd();
      }
    } catch (err) {
      console.warn('Analytics Track Error:', err.message);
    }
  }
  
  flushQueue() {
    if (!this.isInitialized || this.queue.length === 0) return;
    console.log(`Flushing ${this.queue.length} tracked events...`);
    
    // De-queue and track
    while(this.queue.length > 0) {
      const event = this.queue.shift();
      try {
        window.posthog.capture(event.eventName, { 
           ...event.properties, 
           $timestamp: new Date(event.timestamp).toISOString() 
        });
      } catch (err) {}
    }
  }
}

// Export singleton instance
const Analytics = new AnalyticsService();
export default Analytics;

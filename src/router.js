// Simple Router for SPA Navigation
// Handles module routing without page reloads

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = '/';
  }

  init() {
    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.route) {
        this.navigate(e.state.route, false);
      }
    });

    console.log('✅ Router initialized');
  }

  register(path, handler) {
    this.routes.set(path, handler);
  }

  navigate(path, pushState = true) {
    const handler = this.routes.get(path);
    
    if (!handler) {
      console.warn('Route not found:', path);
      return;
    }

    // Update history
    if (pushState) {
      window.history.pushState({ route: path }, '', path);
    }

    // Execute route handler
    handler();
    this.currentRoute = path;
  }

  getCurrentRoute() {
    return this.currentRoute;
  }
}

const router = new Router();

export function initRouter() {
  router.init();
  
  // Register routes
  router.register('/', () => console.log('Dashboard'));
  router.register('/pocketbooks', () => console.log('PocketBooks'));
  router.register('/poolstock', () => console.log('PoolStock'));
  router.register('/smartshift', () => console.log('SmartShift'));
  router.register('/trustcircle', () => console.log('TrustCircle'));
  router.register('/pocketwallet', () => console.log('PocketWallet'));
}

export default router;

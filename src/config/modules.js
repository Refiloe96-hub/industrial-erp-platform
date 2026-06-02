// Module configuration constants — shared between main.js and dashboardPage.js
// Kept in a separate file to avoid circular imports.

export const MODULE_ACCESS = {
  manufacturer: ['dashboard', 'pocketbooks', 'poolstock', 'smartshift', 'trustcircle', 'pocketwallet', 'reports', 'settings', 'customers'],
  warehouse:    ['dashboard', 'pocketbooks', 'poolstock', 'smartshift', 'trustcircle', 'pocketwallet', 'reports', 'settings', 'customers'],
  trader:       ['dashboard', 'sales', 'pocketbooks', 'poolstock', 'trustcircle', 'pocketwallet', 'reports', 'settings', 'customers'],
  shopowner:    ['dashboard', 'sales', 'pocketbooks', 'poolstock', 'trustcircle', 'pocketwallet', 'reports', 'settings', 'customers'],
};

export const MODULE_INFO = {
  dashboard:    { icon: 'ph-duotone ph-chart-bar',    label: 'Dashboard',    badge: null },
  sales:        { icon: 'ph-duotone ph-shopping-cart', label: 'Sales',        badge: 'POS' },
  pocketbooks:  { icon: 'ph-duotone ph-wallet',        label: 'PocketBooks',  badge: 'Ledger' },
  poolstock:    { icon: 'ph-duotone ph-package',       label: 'PoolStock',    badge: 'Inventory' },
  smartshift:   { icon: 'ph-duotone ph-gear',          label: 'SmartShift',   badge: 'MES' },
  trustcircle:  { icon: 'ph-duotone ph-users-three',   label: 'TrustCircle',  badge: 'Syndicates' },
  pocketwallet: { icon: 'ph-duotone ph-credit-card',   label: 'PocketWallet', badge: 'Payments' },
  reports:      { icon: 'ph-duotone ph-trend-up',      label: 'Reports',      badge: 'Analytics' },
  settings:     { icon: 'ph-duotone ph-gear-six',      label: 'Settings',     badge: null },
  customers:    { icon: 'ph-duotone ph-user-list',     label: 'Customers',    badge: null },
};

export const BUSINESS_LABELS = {
  manufacturer: 'Manufacturing Operations',
  warehouse:    'Warehouse Management',
  trader:       'Trading & Distribution',
  shopowner:    'Shop Management',
};

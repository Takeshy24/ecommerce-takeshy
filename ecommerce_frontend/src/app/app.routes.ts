import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/components/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'catalog',
    loadComponent: () =>
      import('./features/catalog/components/product-list/product-list').then(
        (m) => m.ProductListComponent
      ),
    canActivate: [roleGuard],
    data: { roles: ['cliente', 'admin'] },
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./features/cart/components/cart-view/cart-view').then(
        (m) => m.CartViewComponent
      ),
    canActivate: [roleGuard],
    data: { roles: ['cliente', 'admin'] },
  },
  {
    path: 'orders',
    loadComponent: () =>
      import('./features/orders/components/order-history/order-history').then(
        (m) => m.OrderHistoryComponent
      ),
    canActivate: [roleGuard],
    data: { roles: ['cliente', 'admin'] },
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/components/admin-shell/admin-shell').then(
        (m) => m.AdminShellComponent
      ),
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    children: [
      { path: '', redirectTo: 'estadisticas', pathMatch: 'full' },
      {
        path: 'estadisticas',
        loadComponent: () =>
          import('./features/admin/components/dashboard/dashboard').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./features/admin/components/product-management/product-management').then(
            (m) => m.ProductManagementComponent
          ),
      },
      {
        path: 'pedidos',
        loadComponent: () =>
          import('./features/admin/components/orders-management/orders-management').then(
            (m) => m.OrdersManagementComponent
          ),
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./features/admin/components/report-center/report-center').then(
            (m) => m.ReportCenterComponent
          ),
      },
    ],
  },
  { path: '', redirectTo: 'catalog', pathMatch: 'full' },
  { path: '**', redirectTo: 'catalog' },
];
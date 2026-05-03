import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../../../core/services/auth.service';

interface NavItem {
  icon: string;
  label: string;
  link: string;
}

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
  ],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly navItems: NavItem[] = [
    { icon: 'insights', label: 'Estadísticas', link: '/admin/estadisticas' },
    { icon: 'inventory_2', label: 'Productos', link: '/admin/productos' },
    { icon: 'shopping_bag', label: 'Pedidos', link: '/admin/pedidos' },
    { icon: 'picture_as_pdf', label: 'Reportes', link: '/admin/reportes' },
  ];

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

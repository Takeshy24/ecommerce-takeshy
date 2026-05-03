import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, LoginCredentials } from '../../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  credentials: LoginCredentials = { email: '', password: '' };
  hidePassword = true;

  onLogin() {
    this.authService.login(this.credentials).subscribe({
      next: () => {
        const role = this.authService.getUserRole();
        if (role === 'admin') {
          this.router.navigate(['/admin']);
          return;
        }

        this.router.navigate(['/catalog']);
      },
      error: () => alert('Error: Usuario o contraseña incorrectos'),
    });
  }
}
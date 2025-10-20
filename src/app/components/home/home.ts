import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService, UserProfile } from '../../services/supabase.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  profile: UserProfile | null = null; 
  loading = true; 

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.cargarPerfil();
  }

  async cargarPerfil() {
    try {
      const user = this.supabaseService.currentUserValue;
      if (user) {
        this.profile = await this.supabaseService.getProfile(user.id);
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
    } finally {
      this.loading = false;
    }
  }

  async cerrarSesion() {
    await this.supabaseService.signOut();
    this.router.navigate(['/login']);
  }

  irAUsuarios() {
    this.router.navigate(['/usuarios']);
  }

  getRoleText(): string {
    switch(this.profile?.role) {
      case 'admin': return 'Administrador';
      case 'paciente': return 'Paciente';
      case 'especialista': return 'Especialista';
      default: return '';
    }
  }
}
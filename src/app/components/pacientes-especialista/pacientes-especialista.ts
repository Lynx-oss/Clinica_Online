import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { SupabaseService, UserProfile } from '../../services/supabase.service';

interface PacienteConTurnos extends UserProfile {
  turnos: Array<{
    fecha: string;
    especialidad: string;
  }>;
}

@Component({
  selector: 'app-pacientes-especialista',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pacientes-especialista.html',
  styleUrl: './pacientes-especialista.css',
  animations: [
    trigger('slideUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('0.5s ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.4s ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class PacientesEspecialistaComponent implements OnInit {
  pacientes: PacienteConTurnos[] = [];
  loading = true;
  currentUser: UserProfile | null = null;
  especialistaId: string | null = null;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.verificarEspecialista();
    if (this.especialistaId) {
      await this.cargarPacientes();
    }
  }

  async verificarEspecialista() {
    const user = this.supabaseService.currentUserValue;
    if (user) {
      this.currentUser = await this.supabaseService.getProfile(user.id);
      if (this.currentUser?.role === 'especialista' && this.currentUser.approved) {
        this.especialistaId = user.id;
      } else {
        this.router.navigate(['/home']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  async cargarPacientes() {
    if (!this.especialistaId) return;

    this.loading = true;
    try {
      const { data, error } = await this.supabaseService.getPacientesAtendidos(this.especialistaId);
      
      if (error) {
        console.error('Error cargando pacientes:', error);
        return;
      }

      this.pacientes = data || [];
    } catch (error) {
      console.error('Error:', error);
    } finally {
      this.loading = false;
    }
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-AR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }

  verHistoriaClinica(pacienteId: string) {
    // TODO: Implementar vista de historia clínica
      console.log('Ver historia clínica de:', pacienteId);

      this.router.navigate(['/historia-clinica-paciente', pacienteId]);

  
  }

  volver() {
    this.router.navigate(['/home']);
  }
}


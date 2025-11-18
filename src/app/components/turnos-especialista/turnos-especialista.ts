import { Component, OnInit } from '@angular/core';
import Swal, { SweetAlertResult } from 'sweetalert2';
import { SupabaseService, UserProfile } from '../../services/supabase.service';
import { TurnoConDetalles, Turno } from '../../models/turno'; 
import { FormsModule } from '@angular/forms';
import { DatePipe, UpperCasePipe, NgIf, NgFor } from '@angular/common';
import { Router } from '@angular/router'; 

export interface TurnoDetalle extends TurnoConDetalles {
    especialidad_nombre: string;
    paciente_nombre: string;
    especialista_nombre: string;
}

@Component({
  selector: 'app-turnos-especialista',
  standalone: true,
  imports: [FormsModule, DatePipe, UpperCasePipe, NgIf, NgFor], 
  templateUrl: './turnos-especialista.html',
  styleUrl: './turnos-especialista.css'
})
export class TurnosEspecialista implements OnInit {
  public turnosOriginales: TurnoDetalle[] = []; 
  public turnosFiltrados: TurnoDetalle[] = []; 
  
  public textoFiltro: string = '';
  public especialistaId: string | null = null; 
  public loading: boolean = true; 
  
  // 2. Inyectar Router
  constructor(
    private supabaseService: SupabaseService, 
    private router: Router
  ) {}

  async ngOnInit() {
    this.loading = true;
    
    const user = this.supabaseService.currentUserValue;
    
    if (user) {
      const profile: UserProfile | null = await this.supabaseService.getProfile(user.id);
      
      if (profile?.role === 'especialista') {
        this.especialistaId = user.id;
        await this.cargarTurnos();
      } else {
        console.error("ERROR: Acceso denegado. Rol:", profile?.role);
        Swal.fire('Acceso Denegado', 'Debes ser un especialista para ver esta sección.', 'error');
        this.loading = false;
      }
    } else {
      console.error("ERROR: Usuario no logueado.");
      Swal.fire('Acceso Denegado', 'Debes iniciar sesión para ver esta sección.', 'error');
      this.loading = false;
    }
  }


  async cargarTurnos() {
    if (!this.especialistaId) {
      this.loading = false;
      return;
    }

    this.loading = true;

    const { data, error } = await this.supabaseService.getTurnosEspecialista(this.especialistaId);

    if (!error && data) {
      this.turnosOriginales = data as TurnoDetalle[];
      this.filtrarTurnos(); 
    } else {
      console.error('Error al cargar turnos:', error);
      Swal.fire('Error', 'No se pudieron cargar los turnos.', 'error');
    }
    this.loading = false;
  }

  
  filtrarTurnos() {
    if (!this.textoFiltro) {
      this.turnosFiltrados = this.turnosOriginales;
      return;
    }

    const filtro = this.textoFiltro.toLowerCase().trim();

    this.turnosFiltrados = this.turnosOriginales.filter(turno => {
      const coincideEspecialidad = turno.especialidad_nombre.toLowerCase().includes(filtro);
      const coincidePaciente = turno.paciente_nombre.toLowerCase().includes(filtro);
        
      return coincideEspecialidad || coincidePaciente;
    });
  }


  puedeCancelar(turno: TurnoDetalle): boolean {
    return turno.estado === 'pendiente';
  }

  puedeRechazar(turno: TurnoDetalle): boolean {
    return turno.estado === 'pendiente';
  }

  puedeAceptar(turno: TurnoDetalle): boolean {
    return turno.estado === 'pendiente';
  }

  puedeFinalizar(turno: TurnoDetalle): boolean {
    return turno.estado === 'aceptado';
  }

  puedeVerResena(turno: TurnoDetalle): boolean {
    return !!(turno.comentario_cancelacion || turno.comentario_rechazo || turno.resena_especialista || turno.comentario_calificacion);
  }
  

  async onAceptar(turno: TurnoDetalle) {
    if (!turno.id) return;
    try {
      await this.supabaseService.aceptarTurno(turno.id);
      Swal.fire('Aceptado', 'El turno ha sido aceptado con éxito.', 'success');
      await this.cargarTurnos(); 
    } catch (e) {
      Swal.fire('Error', 'No se pudo aceptar el turno.', 'error');
    }
  }

  async onFinalizar(turno: TurnoDetalle) {
    if (!turno.id) return;
    const res: SweetAlertResult = await Swal.fire({
      title: 'Finalizar Turno',
      input: 'textarea',
      inputLabel: 'Reseña, Comentario y Diagnóstico realizado',
      inputPlaceholder: 'Escriba aquí el diagnóstico...',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => !value ? 'Debe dejar una reseña/diagnóstico.' : null
    });

    if (res.isConfirmed && res.value) {
      try {
        await this.supabaseService.finalizarTurno(turno.id, res.value);
        Swal.fire('Finalizado', 'Turno finalizado y reseña guardada.', 'success');
        await this.cargarTurnos();
      } catch (e) {
        Swal.fire('Error', 'No se pudo finalizar el turno.', 'error');
      }
    }
  }
  
  async onRechazar(turno: TurnoDetalle) {
    if (!turno.id) return;
    await this.handleActionWithComment(
      turno, 
      'Rechazar Turno', 
      'Motivo del rechazo', 
      (id, comentario) => this.supabaseService.rechazarTurno(id, comentario),
      'Turno rechazado con éxito.'
    );
  }

  async onCancelar(turno: TurnoDetalle) {
    if (!turno.id || !this.especialistaId) return;

    const responsableId = this.especialistaId; 
    await this.handleActionWithComment(
      turno, 
      'Cancelar Turno', 
      'Motivo de la cancelación', 
      (id, comentario) => this.supabaseService.cancelarTurno(id, comentario, responsableId),
      'Turno cancelado con éxito.'
    );
  }
  
  private async handleActionWithComment(
    turno: TurnoDetalle, 
    title: string, 
    inputLabel: string, 
    serviceCall: (id: number, comment: string) => Promise<any>,
    successMessage: string
  ) {
    const res: SweetAlertResult = await Swal.fire({
      title: title,
      input: 'textarea',
      inputLabel: inputLabel,
      inputPlaceholder: `Escriba aquí el ${inputLabel.toLowerCase()}...`,
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => !value ? `Debe especificar el ${inputLabel.toLowerCase()}.` : null
    });

    if (res.isConfirmed && res.value) {
      try {
        if (turno.id) {
            await serviceCall(turno.id, res.value);
            Swal.fire('Éxito', successMessage, 'success');
            await this.cargarTurnos(); 
        }
      } catch (e) {
        console.error("Error en la acción:", e);
        Swal.fire('Error', `No se pudo ${title.toLowerCase()}.`, 'error');
      }
    }
  }
  
  onVerResena(turno: TurnoDetalle) {
    const mensaje = `
      ${turno.resena_especialista ? `<h4>Diagnóstico / Reseña del Especialista:</h4><p>${turno.resena_especialista}</p>` : ''}
      ${turno.comentario_calificacion ? `<h4>Comentario del Paciente:</h4><p>Calificación: <strong>${turno.calificacion_atencion || 'N/A'}</strong></p><p>${turno.comentario_calificacion}</p>` : ''}
      ${turno.comentario_cancelacion ? `<h4>Motivo de Cancelación:</h4><p>${turno.comentario_cancelacion}</p>` : ''}
      ${turno.comentario_rechazo ? `<h4>Motivo de Rechazo:</h4><p>${turno.comentario_rechazo}</p>` : ''}
    `;
    
    Swal.fire({
      title: 'Detalles del Turno',
      html: mensaje,
      icon: 'info',
      confirmButtonText: 'Cerrar'
    });
  }

  volverHome() {
    this.router.navigate(['/home']); 
  }
}
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
  selector: 'app-turnos-administrador',
  standalone: true,
  imports: [FormsModule, DatePipe, UpperCasePipe, NgIf, NgFor], 
  templateUrl: './turnos-administrador.html', 
  styleUrl: './turnos-administrador.css' 
})
export class TurnosAdministradorComponent implements OnInit {
  
  public turnosOriginales: TurnoDetalle[] = []; 
  public turnosFiltrados: TurnoDetalle[] = []; 
  
  public textoFiltro: string = '';
  public adminId: string | null = null; 
  public loading: boolean = true; 
  
  constructor(private supabaseService: SupabaseService, private router: Router) {
    console.log('🔧 TurnosAdministradorComponent: Constructor ejecutado');
    setTimeout(() => {
      console.log(' Componente cargado - verificando...');
    }, 100);
  }

  async ngOnInit() {
    console.log(' TurnosAdministradorComponent: ngOnInit iniciado');
    this.loading = true;
    
    try {
      const user = this.supabaseService.currentUserValue;
      console.log('👤 Usuario actual:', user ? user.id : 'null');
      
      if (!user) {
        console.error(" ERROR: Usuario no logueado.");
        Swal.fire('Acceso Denegado', 'Debes iniciar sesión para ver esta sección.', 'error');
        this.loading = false;
        return;
      }

      const profile: UserProfile | null = await this.supabaseService.getProfile(user.id);
      console.log(' Perfil del usuario:', profile ? { id: profile.id, role: profile.role, nombre: profile.nombre } : 'null');
      
      if (profile?.role !== 'admin') {
        console.error(" ERROR: Acceso denegado. Rol:", profile?.role);
        Swal.fire('Acceso Denegado', 'Debes ser Administrador para ver esta sección.', 'error');
        this.loading = false;
        return;
      }

      console.log(' Usuario es administrador, cargando turnos...');
      this.adminId = user.id;
      await this.cargarTurnos();
      
    } catch (error: any) {
      console.error(' Error en ngOnInit:', error);
      Swal.fire('Error', 'Ocurrió un error al inicializar el componente.', 'error');
      this.loading = false;
    }
  }

  
  async cargarTurnos() {
    console.log(' cargarTurnos() llamado');
    this.loading = true;

    try {
      console.log('⏳ Llamando a getTurnosClinica()...');
      const { data, error } = await this.supabaseService.getTurnosClinica(); 
      console.log(' Respuesta recibida:', { 
        tieneData: !!data, 
        cantidadData: data?.length || 0, 
        tieneError: !!error,
        error: error 
      });

      if (error) {
        console.error(' Error al cargar turnos:', error);
        console.error('Detalles del error:', JSON.stringify(error, null, 2));
        Swal.fire('Error', `No se pudieron cargar los turnos de la clínica: ${error.message || JSON.stringify(error)}`, 'error');
        this.turnosOriginales = [];
        this.turnosFiltrados = [];
        return;
      }

      if (data && data.length > 0) {
        console.log(` Cargados ${data.length} turnos para el administrador`);
        console.log(' Primer turno:', JSON.stringify(data[0], null, 2));
        this.turnosOriginales = data as TurnoDetalle[];
        this.filtrarTurnos();
        console.log(`🔍 Después de filtrar: ${this.turnosFiltrados.length} turnos visibles`);
      } else {
        console.log('ℹ No hay turnos registrados en la clínica');
        this.turnosOriginales = [];
        this.turnosFiltrados = [];
      }
    } catch (error: any) {
      console.error(' Excepción al cargar turnos:', error);
      console.error('Stack trace:', error.stack);
      Swal.fire('Error', `Ocurrió un error inesperado al cargar los turnos: ${error.message || error}`, 'error');
      this.turnosOriginales = [];
      this.turnosFiltrados = [];
    } finally {
      this.loading = false;
      console.log(' cargarTurnos() finalizado. Loading:', this.loading);
    }
  }

  
  filtrarTurnos() {
    if (!this.textoFiltro) {
      this.turnosFiltrados = this.turnosOriginales;
      return;
    }

    const filtro = this.textoFiltro.toLowerCase().trim();

    this.turnosFiltrados = this.turnosOriginales.filter(turno => {
      const coincideEspecialidad = turno.especialidad_nombre.toLowerCase().includes(filtro);
      const coincideEspecialista = turno.especialista_nombre.toLowerCase().includes(filtro);
        
      return coincideEspecialidad || coincideEspecialista;
    });
  }


  puedeCancelar(turno: TurnoDetalle): boolean {
    return !['aceptado', 'realizado', 'rechazado'].includes(turno.estado); 
  }
  
  puedeVerResena(turno: TurnoDetalle): boolean {
    return !!(turno.comentario_cancelacion || turno.comentario_rechazo || turno.resena_especialista || turno.comentario_calificacion);
  }


  async onCancelar(turno: TurnoDetalle) {
    if (!turno.id || !this.adminId) return;

    const responsableId = this.adminId; 
    
    await this.handleActionWithComment(
      turno, 
      'Cancelar Turno (Admin)', 
      'Motivo de la cancelación', 
      (id, comentario) => this.supabaseService.cancelarTurno(id, comentario, responsableId),
      'Turno cancelado con éxito por el Administrador.'
    );
  }
  
  
  private async handleActionWithComment(
    turno: TurnoDetalle, 
    title: string, 
    inputLabel: string, 
    serviceCall: (id: number, comment: string, responsibleId: string) => Promise<any>, // Se añade responsibleId
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
        if (turno.id && this.adminId) {
            await serviceCall(turno.id, res.value, this.adminId); 
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

  volverHome(){
    this.router.navigate(['/home']);
  }



}
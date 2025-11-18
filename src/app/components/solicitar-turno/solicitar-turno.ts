import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { SupabaseService, UserProfile } from '../../services/supabase.service';

// Interfaces corregidas
interface Especialidad {
  id: number;
  nombre: string;
}

interface EspecialistaConEspecialidades {
  id: string;
  nombre: string;
  apellido: string;
  imagen_perfil_1: string;
  especialidades: Especialidad[]; 
}

@Component({
  selector: 'app-solicitar-turno',
  imports: [CommonModule],
  templateUrl: './solicitar-turno.html',
  styleUrl: './solicitar-turno.css'
})
export class SolicitarTurno implements OnInit {
  currentUser: UserProfile | null = null;
  isAdmin = false;

  especialistas: EspecialistaConEspecialidades[] = [];
  especialistaSeleccionado: EspecialistaConEspecialidades | null = null;

  especialidadSeleccionada: Especialidad | null = null;  

  fechasDisponibles: Date[] = [];
  fechaSeleccionada: Date | null = null;

  horariosDisponibles: string[] = [];
  horarioSeleccionado: string | null = null;

  pacientes: UserProfile[] = [];
  pacienteSeleccionado: UserProfile | null = null;

  loading = false;
  paso = 1;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.cargarUsuarioActual();
    await this.cargarEspecialistas();

    if (this.isAdmin) {
      await this.cargarPacientes();
    }
  }

  async cargarUsuarioActual() {
    const user = this.supabaseService.currentUserValue;
    if (user) {
      this.currentUser = await this.supabaseService.getProfile(user.id);
      this.isAdmin = this.currentUser?.role === 'admin';
    }
  }

  async cargarEspecialistas() {
    this.loading = true;

    try {
      const { data: especialidadesData, error: errorEsp } = 
        await this.supabaseService.getEspecialidades();

      if (errorEsp) throw errorEsp;

      const especialidadesMap = new Map<string, Especialidad>();
      
      if (especialidadesData) {
        especialidadesData.forEach((esp: any) => {
          especialidadesMap.set(esp.nombre, {
            id: esp.id,
            nombre: esp.nombre
          });
        });
      }

      const usuarios = await this.supabaseService.getAllProfiles();

      const especialistasData = usuarios.filter(
        (u: UserProfile) => u.role === 'especialista' && u.approved
      );

      this.especialistas = especialistasData.map((esp: UserProfile) => {
        let publicUrl = '';

        if (esp.imagen_perfil_1) {
          const { data } = this.supabaseService.getPublicUrl(esp.imagen_perfil_1);
          publicUrl = data?.publicUrl || '';
        }

        const especialidadesDelEsp: Especialidad[] = [];
        
        if (esp.especialidad) {
          const espObj = especialidadesMap.get(esp.especialidad);
          if (espObj) {
            especialidadesDelEsp.push(espObj);
          }
        }

        return {
          id: esp.id,
          nombre: esp.nombre,
          apellido: esp.apellido,
          imagen_perfil_1: publicUrl,
          especialidades: especialidadesDelEsp
        };
      });

    } catch (error) {
      console.error('Error cargando especialistas:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los especialistas',
        confirmButtonColor: '#0077b6'
      });
    } finally {
      this.loading = false;
    }
  }

  async cargarPacientes() {
    try {
      const usuarios = await this.supabaseService.getAllProfiles();
      this.pacientes = usuarios.filter((u: UserProfile) => u.role === 'paciente');
    } catch (error) {
      console.error('Error cargando pacientes:', error);
    }
  }

  seleccionarEspecialista(especialista: EspecialistaConEspecialidades) {
    this.especialistaSeleccionado = especialista;
    this.especialidadSeleccionada = null;
    this.fechaSeleccionada = null;
    this.horarioSeleccionado = null;
    this.paso = 2;
  }

  seleccionarEspecialidad(especialidad: Especialidad) {  
    this.especialidadSeleccionada = especialidad;
    this.fechaSeleccionada = null;
    this.horarioSeleccionado = null;
    this.generarFechasDisponibles();
    this.paso = 3;
  }
  
  

  generarFechasDisponibles() {
    this.fechasDisponibles = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (let i = 0; i < 15; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i);
      this.fechasDisponibles.push(fecha);
    }
  }

  async seleccionarFecha(fecha: Date) {
    this.fechaSeleccionada = fecha;
    this.horarioSeleccionado = null;
    await this.cargarHorariosDisponibles();
    this.paso = 4;
  }

  async cargarHorariosDisponibles() {
  if (!this.especialistaSeleccionado || !this.especialidadSeleccionada || !this.fechaSeleccionada) {
    return;
  }

  this.loading = true;

  try {
    const fechaStr = this.fechaSeleccionada.toISOString().split('T')[0];

    console.log('Buscando horarios para:', {
      especialista: this.especialistaSeleccionado.id,
      especialidad: this.especialidadSeleccionada.id,  
      fecha: fechaStr
    });

    const { data, error } = await this.supabaseService.getHorariosDisponibles(
      this.especialistaSeleccionado.id,
      this.especialidadSeleccionada.id,  
      fechaStr
    );

    console.log('Respuesta de horarios:', { data, error });

    if (error) {
      console.error('Error del service:', error);
      throw error;
    }

    this.horariosDisponibles = data || [];

    if (this.horariosDisponibles.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin horarios',
        text: 'No hay horarios disponibles para esta fecha',
        confirmButtonColor: '#0077b6'
      });
    }

  } catch (error: any) {
    console.error('Error cargando horarios:', error);
    console.error('Stack trace:', error.stack);
    
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message || 'No se pudieron cargar los horarios disponibles',
      confirmButtonColor: '#0077b6'
    });
  } finally {
    this.loading = false;
  }
}
  seleccionarHorario(horario: string) {
    this.horarioSeleccionado = horario;
  }

  seleccionarPaciente(paciente: UserProfile) {
    this.pacienteSeleccionado = paciente;
  }

  async confirmarTurno() {
    if (this.isAdmin && !this.pacienteSeleccionado) {
      Swal.fire({
        icon: 'warning',
        title: 'Selecciona un paciente',
        text: 'Debes seleccionar el paciente para el turno',
        confirmButtonColor: '#0077b6'
      });
      return;
    }

    if (!this.especialistaSeleccionado || !this.especialidadSeleccionada || 
        !this.fechaSeleccionada || !this.horarioSeleccionado) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Por favor completa todos los pasos',
        confirmButtonColor: '#0077b6'
      });
      return;
    }

    this.loading = true;

    try {
      const pacienteId = this.isAdmin 
        ? this.pacienteSeleccionado!.id 
        : this.currentUser!.id;

      const turnoData = {
        paciente_id: pacienteId,
        especialista_id: this.especialistaSeleccionado.id,
        especialidad_id: this.especialidadSeleccionada.id,  
        fecha: this.fechaSeleccionada.toISOString().split('T')[0],
        hora: this.horarioSeleccionado,
        duracion: 30,
        estado: 'pendiente'
      };

      const { data, error } = await this.supabaseService.crearTurno(turnoData);

      if (error) throw error;

      this.loading = false;

      await Swal.fire({
        icon: 'success',
        title: 'Turno Solicitado',
        html: `
          <p><strong>Especialista:</strong> ${this.especialistaSeleccionado.nombre} ${this.especialistaSeleccionado.apellido}</p>
          <p><strong>Especialidad:</strong> ${this.especialidadSeleccionada.nombre}</p>
          <p><strong>Fecha:</strong> ${this.formatearFecha(this.fechaSeleccionada)}</p>
          <p><strong>Hora:</strong> ${this.horarioSeleccionado}</p>
          <br>
          <p>El turno quedará pendiente hasta que el especialista lo acepte.</p>
        `,
        confirmButtonColor: '#0077b6'
      });

      this.limpiarSeleccion();
      this.router.navigate(['/mis-turnos']);

    } catch (error: any) {
      console.error('Error creando turno:', error);
      this.loading = false;
      
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo crear el turno',
        confirmButtonColor: '#0077b6'
      });
    }
  }

  limpiarSeleccion() {
    this.especialistaSeleccionado = null;
    this.especialidadSeleccionada = null;
    this.fechaSeleccionada = null;
    this.horarioSeleccionado = null;
    this.pacienteSeleccionado = null;
    this.paso = 1;
  }

  volver() {
  switch (this.paso) {
    case 4:
      this.horarioSeleccionado = null;
      this.paso--;
      break;
    case 3:
      this.fechaSeleccionada = null;
      this.paso--;
      break;
    case 2:
      this.especialidadSeleccionada = null;
      this.paso--;
      break;
    case 1:
      this.limpiarSeleccion();
      this.router.navigate(['/home']);
      break;
  }
}

  formatearFecha(fecha: Date | null): string {
    if (!fecha) return '';
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    return `${dias[fecha.getDay()]} ${fecha.getDate()} de ${meses[fecha.getMonth()]}`;
  }

  formatearFechaCorta(fecha: Date | null): string {
    if (!fecha) return '';
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return `${dias[fecha.getDay()]} ${fecha.getDate()}`;
  }

  esFechaSeleccionada(fecha: Date | null): boolean {
    return this.fechaSeleccionada !== null && 
           fecha?.toDateString() === this.fechaSeleccionada.toDateString();
  }
}
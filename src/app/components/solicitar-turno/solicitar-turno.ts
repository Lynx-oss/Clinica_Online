import { Component, OnInit } from '@angular/core';
import { CommonModule} from '@angular/common';
import { Router} from '@angular/router'
import Swal from 'sweetalert2';
import { SupabaseService, UserProfile } from '../../services/supabase.service';
import { Turno, EspecialistaConEspecialidades } from '../../models/turno';
@Component({
  selector: 'app-solicitar-turno',
  imports: [CommonModule],
  templateUrl: './solicitar-turno.html',
  styleUrl: './solicitar-turno.css'
})
export class SolicitarTurno implements OnInit {
  currentUser: UserProfile | null = null;
  isAdmin = false;

  especialista: EspecialistaConEspecialidades[]= []
  especialistaSeleccionado: EspecialistaConEspecialidades | null = null;

  especialidadSeleccionada: string | null = null;

  fechaDisponibles: Date[] = [];
  fechaSeleccionada: Date | null = null;

  horariosDisponibles: string[] = []
  horariosSeleccionado: string | null = null;

  pacientes: UserProfile[] = [];
  pacienteSeleccionado: UserProfile | null = null;

  loading = false;
  paso = 1;

  constructor(private supabaseService: SupabaseService, private router: Router){

  }

  async ngOnInit() {
    await this.cargarUsuarioActual();
    await this.cargarEspecialista();

    if(this.isAdmin){
      await this.cargarPacientes();
    }
  }

  async cargarUsuarioActual(){
    const user = this.supabaseService.currentUserValue;
    if(user){
      this.currentUser = await this.supabaseService.getProfile(user.id)
      this.isAdmin = this.currentUser?.role === 'admin'
    }
  }

  async cargarEspecialista(){
    this.loading = true;
    try{
      const usuarios = await this.supabaseService.getAllProfiles();

      const especialistasData = usuarios.filter(
        (u: UserProfile) => u.role === 'especialista' && u.approved
      );
      
      this.especialista = especialistasData.map((esp: UserProfile) => ({
        id: esp.id,
        nombre: esp.nombre,
        apellido: esp.apellido,
        imagen_perfil_1: esp.imagen_perfil_1 || '',
        especialidades: esp.especialidad ? [esp.especialidad] : []
      }));
  } catch (error){
    console.error('Error cargando especialista: ', error);
    Swal.fire({
      icon: 'error',
      title: 'error',
      text: 'no se pudieron cargar las especialistas',
      confirmButtonColor: '#0077b6'
    })
  } finally {
    this.loading = false;
  }
}

  async cargarPacientes(){
    try {
      const usuarios = await this.supabaseService.getAllProfiles();
      this.pacientes = usuarios.filter((u: UserProfile) => u.role === 'paciente');
    } catch (error){
      console.error('Error cargando pacientes: ', error);
    }
  }

  seleccionarEspecialista(especialista: EspecialistaConEspecialidades) {
    this.especialistaSeleccionado = especialista;
    this.especialidadSeleccionada = null;
    this.fechaSeleccionada = null;
    this.horariosSeleccionado = null;
    this.paso = 2;
  }

  seleccionarEspecialidad(especialidad: string){
    this.especialidadSeleccionada = especialidad;
    this.fechaSeleccionada = null;
    this.horariosSeleccionado = null;
    this.generarFechasDisponibles();
    this.paso = 3;
  }

  generarFechasDisponibles() {
    this.fechaDisponibles = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (let i = 0; i < 15; i++){
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i)
      this.fechaDisponibles.push(fecha)
    }
  }

  async seleccionarFecha(fecha: Date){
    this.fechaSeleccionada = fecha;
    this.horariosSeleccionado = null;
    await this.cargarHorarioDisponibles();
    this.paso = 4;
  }

  async cargarHorarioDisponibles(){
    if(!this.especialistaSeleccionado || !this.especialidadSeleccionada || this.fechaSeleccionada){
      return;
    }

    this.loading = true;
    try {
      const fechaStr = this.fechaSeleccionada!.toISOString().split('T')[0]

      const { data, error} = await this.supabaseService.getHorariosDisponibles(
        this.especialidadSeleccionada,
        this.especialidadSeleccionada,
        fechaStr
      )

      if (error) throw error;
      
      if(this.horariosDisponibles.length === 0){
        Swal.fire({
          icon: 'info',
          title: 'sin horarios',
          text: 'no hay horarios disponibles para esta fecha',
          confirmButtonColor: '#0077b6'
        })
      }
    } catch (error) {
      console.error(' Error cargando horarios: ', error);
      Swal.fire({
        icon: 'error',
        title: 'error',
        text: 'no se pudieron cargar los horarios disponibles',
        confirmButtonColor: '#0077b6'
      });
    } finally {
      this.loading = false;
    }
  }


  seleccionarHorario(horario: string){
    this.horariosSeleccionado = horario;
  }

  seleccionarPaciente(paciente: UserProfile){
    this.pacienteSeleccionado = paciente;
  }

  async confirmarTurno() {
    if (this.isAdmin && !this.pacienteSeleccionado){
      Swal.fire({
        icon: 'warning',
        title: 'Selecciona un paciente',
        text: 'debes seleccionar el paciente para el turno',
        confirmButtonColor: '#0077b6'
      })
      return;
    }
    
    if(!this.especialistaSeleccionado || !this.especialidadSeleccionada || !this.fechaSeleccionada || !this.horariosSeleccionado){
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Por favor completa toods los pasos',
        confirmButtonColor: '#0077b6'
      })
      return;
    }

    this.loading = true;

    try{
      const pacienteID = this.isAdmin ? this.pacienteSeleccionado!.id : this.currentUser!.id;

      const turnoData = {
        paciente_id: pacienteID,
        especialista_id: this.especialistaSeleccionado.id,
        especialidad: this.especialidadSeleccionada,
        fecha: this.fechaSeleccionada.toISOString().split('T')[0],
        hora: this.horariosSeleccionado,
        duracion: 30,
        estado: 'pendiente',
        encuesta_completada: false
      }

      const {data, error} = await this.supabaseService.crearTurno(turnoData)

      if(error) throw error;

      await Swal.fire({
        icon: 'success',
        title: 'Turno Solicitado',
          html: `
          <p><strong>Especialista:</strong> ${this.especialistaSeleccionado.nombre} ${this.especialistaSeleccionado.apellido}</p>
          <p><strong>Especialidad:</strong> ${this.especialidadSeleccionada}</p>
          <p><strong>Fecha:</strong> ${this.formatearFecha(this.fechaSeleccionada)}</p>
          <p><strong>Hora:</strong> ${this.horariosSeleccionado}</p>
          <br>
          <p>El turno quedara pendiente hasta que el especialista lo acepte.</p>
        `,
        confirmButtonColor: '#0077b6'
      })

      this.limpiarSeleccion();
      this.router.navigate(['/mis-turnos']);
    } catch (error: any) {
      console.error ('error creando turno: ', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'no se pudo crear el turno',
        confirmButtonColor: '#0077b6'
      })
    } finally {
      this.loading = false;
    }
  }

  limpiarSeleccion() {
    this.especialistaSeleccionado = null;
    this.especialidadSeleccionada = null;
    this.fechaSeleccionada = null;
    this.horariosSeleccionado = null;
    this.pacienteSeleccionado = null;
    this.paso = 1;
  }

  volver() {
    if(this.paso > 1){
      this.paso--;
    } if(this.paso === 1){
      this.especialistaSeleccionado = null;
    } else if (this.paso === 2){
      this.especialidadSeleccionada = null;
    } else if (this.paso === 3) {
      this.fechaSeleccionada = null;
    } else {
      this.router.navigate(['/home'])
    }
  }

  formatearFecha(fecha: Date | null): string {
    if(!fecha) return '';
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

    return  `${dias[fecha.getDay()]} ${fecha.getDate()} de ${meses[fecha.getMonth()]}`;

  }

  formatearFechaCorta(fecha: Date | null): string {
    if(!fecha) return '';
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return `${dias[fecha.getDay()]} ${fecha.getDate()}`;
  }
  
    esFechaSeleccionada(fecha: Date | null): boolean {
      return this.fechaSeleccionada !== null && fecha?.toDateString() === this.fechaSeleccionada.toDateString();
   
  }
}
  



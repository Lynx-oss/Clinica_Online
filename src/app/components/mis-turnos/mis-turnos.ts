import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { SupabaseService, UserProfile } from '../../services/supabase.service';
import { TurnoConDetalles} from '../../models/turno';
@Component({
  selector: 'app-mis-turnos',
  imports: [CommonModule],
  templateUrl: './mis-turnos.html',
  styleUrl: './mis-turnos.css'
})
export class MisTurnos implements OnInit{
  currentUser: UserProfile | null = null;
  turnos: TurnoConDetalles[] = [];
  turnosFiltrados: TurnoConDetalles[] = [];
  loading = false;

  filtroEstado: string = 'todos';
  filtroEspecialidad: string = 'todas';
  especialidadesDisponibles: string[] = [];

  constructor(private supabaseService: SupabaseService, private router: Router){}

  async ngOnInit() {
    await this.cargarUsuarioActual();
    await this.cargarTurnos();
  }

  async cargarUsuarioActual(){
    const user = this.supabaseService.currentUserValue;
    if(user){
      this.currentUser = await this.supabaseService.getProfile(user.id)
    }
  }

  async cargarTurnos() {
    if(!this.currentUser) return;

    this.loading = true;
    try {
      const { data, error} = await this.supabaseService.getTurnosPaciente(this.currentUser.id)

      if (error) throw error;

      this.turnos = (data as TurnoConDetalles[] ) || []

      this.especialidadesDisponibles = [...new Set(this.turnos.map(t => t.especialidad))]

      this.aplicarFiltros();
    } catch ( error ) {
      console.error('Error cargando turnos: ', error)
      Swal.fire({
        icon: 'error',
        title: 'error',
        text: 'No se pudieron cargar los turnos',
        confirmButtonColor: '#0077b6'
      })
    } finally {
      this.loading = false;
    }
  }

  aplicarFiltros(){
    this.turnosFiltrados = this.turnos.filter(turno => {
      const cumpleFiltroEstado = this.filtroEstado === 'todos' || turno.estado === this.filtroEstado;
      const cumpleFiltroESpecialidad = this.filtroEspecialidad === 'todas' || turno.estado === this.filtroEspecialidad

      return cumpleFiltroEstado && cumpleFiltroESpecialidad;
    })
  }

  cambiarFiltroEstado(estado : string) {
    this.filtroEstado = estado;
    this.aplicarFiltros();
  }

  cambiarFiltroEspecialidad(especialidad: string){
    this.filtroEspecialidad = especialidad;
    this.aplicarFiltros();
  }

  async cancelarTurno(turno: TurnoConDetalles){
    const result = await Swal.fire({
      title: 'Cancelar Turno ?',
      html: `
        <p><strong>Especialista:</strong> ${turno.especialista?.nombre} ${turno.especialista?.apellido}</p>
        <p><strong>Fecha:</strong> ${this.formatearFecha(turno.fecha)}</p>
        <p><strong>Hora:</strong> ${turno.hora}</p>
        <br>
        <p>Por favor, indica el motivo de la cancelación:</p>
      `,
      input: 'textarea',
      inputPlaceholder: 'Motivo de cancelación...',
      inputAttributes: {
        'aria-label': 'Motivo de cancelación'
      },
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No, volver',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => {
        if (!value) {
        return 'debes ingresar un motivo';
        }
        return null;
      }
    })

    if(result.isConfirmed && result.value){
      this.loading = true;
      try {
        const {error} = await this.supabaseService.cancelarTurno(turno.id!, result.value);

        if (error) throw error;

        await Swal.fire({
          icon: 'success',
          title: 'Turno cancelado',
          text: 'El turno ha sido cancelado exitosamente',
          confirmButtonColor: '#0077b6'
        })

        await this.cargarTurnos
      } catch (error) {
        console.error('Error cancelando turno: ' , error)
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cancelar el turno',
          confirmButtonColor: '#0077b6'
        });
      } finally {
        this.loading = false
      }
    }

  }

  async verResena(turno: TurnoConDetalles) {
    await Swal.fire({
      title: 'Reseña del especialista',
      html: `
        <div style="text-align: left; padding: 1rem;">
          <p><strong>Especialista:</strong> ${turno.especialista?.nombre} ${turno.especialista?.apellido}</p>
          <p><strong>Fecha:</strong> ${this.formatearFecha(turno.fecha)}</p>
          <hr style="margin: 1rem 0;">
          <p style="white-space: pre-wrap;">${turno.resena_especialista || 'Sin reseña'}</p>
        </div>
      `,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#0077b6'
    })
  }
  async calificarAtencion(turno: TurnoConDetalles) {
    const { value: formValues } = await Swal.fire({
      title: '⭐ Calificar Atención',
      html: `
        <div style="text-align: left; padding: 1rem;">
          <p><strong>Especialista:</strong> ${turno.especialista?.nombre} ${turno.especialista?.apellido}</p>
          <p><strong>Fecha:</strong> ${this.formatearFecha(turno.fecha)}</p>
          <hr style="margin: 1rem 0;">
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Calificación:</label>
            <div id="rating-stars" style="font-size: 2rem; cursor: pointer; user-select: none;">
              <span style="margin: 0 0.1rem;">⭐</span><span style="margin: 0 0.1rem;">⭐</span><span style="margin: 0 0.1rem;">⭐</span><span style="margin: 0 0.1rem;">⭐</span><span style="margin: 0 0.1rem;">⭐</span>
            </div>
            <input type="hidden" id="rating-value" value="5">
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Comentario:</label>
            <textarea id="comentario-calificacion" class="swal2-textarea" placeholder="Cuéntanos sobre tu experiencia..." style="width: 100%; min-height: 100px;"></textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Enviar calificación',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0077b6',
      didOpen: () => {
        const starsDiv = document.getElementById('rating-stars');
        const ratingInput = document.getElementById('rating-value') as HTMLInputElement;
        
        if (starsDiv && ratingInput) {
          const stars = Array.from(starsDiv.querySelectorAll('span'));
          
          stars.forEach((star, index) => {
            star.addEventListener('click', () => {
              const rating = index + 1;
              ratingInput.value = rating.toString();
              
              stars.forEach((s, i) => {
                if (i < rating) {
                  (s as HTMLElement).style.opacity = '1';
                } else {
                  (s as HTMLElement).style.opacity = '0.3';
                }
              });
            });
          });

          stars.forEach(star => {
            (star as HTMLElement).style.opacity = '1';
          });
        }
      },
      preConfirm: () => {
        const rating = parseInt((document.getElementById('rating-value') as HTMLInputElement).value);
        const comentario = (document.getElementById('comentario-calificacion') as HTMLTextAreaElement).value;
        
        if (!comentario.trim()) {
          Swal.showValidationMessage('Por favor ingresa un comentario');
          return false;
        }
        
        return { rating, comentario };
      }
    });

    if (formValues) {
      this.loading = true;
      try {
        const { error } = await this.supabaseService.calificarAtencion(
          turno.id!,
          formValues.rating,
          formValues.comentario
        );

        if (error) throw error;

        await Swal.fire({
          icon: 'success',
          title: '¡Gracias por tu calificación!',
          text: 'Tu opinión nos ayuda a mejorar',
          confirmButtonColor: '#0077b6'
        });

        await this.cargarTurnos();

      } catch (error) {
        console.error('Error calificando atención:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo guardar la calificación',
          confirmButtonColor: '#0077b6'
        });
      } finally {
        this.loading = false;
      }
    }
  }

  async completarEncuesta(turno: TurnoConDetalles) {
    const { value: formValues } = await Swal.fire({
      title: '📊 Encuesta de Satisfacción',
      html: `
        <div style="text-align: left; padding: 1rem;">
          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">
              ¿Cómo fue tu experiencia general? (1-10)
            </label>
            <input type="range" id="experiencia" min="1" max="10" value="10" class="swal2-input" style="width: 100%;">
            <span id="experiencia-value" style="font-weight: 700; color: #0077b6;">10</span>
          </div>

          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">
              ¿Qué tan profesional fue la atención? (1-10)
            </label>
            <input type="range" id="profesionalismo" min="1" max="10" value="10" class="swal2-input" style="width: 100%;">
            <span id="profesionalismo-value" style="font-weight: 700; color: #0077b6;">10</span>
          </div>

          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">
              ¿Recomendarías esta clínica? (1-10)
            </label>
            <input type="range" id="recomendacion" min="1" max="10" value="10" class="swal2-input" style="width: 100%;">
            <span id="recomendacion-value" style="font-weight: 700; color: #0077b6;">10</span>
          </div>

          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">
              Comentarios adicionales:
            </label>
            <textarea id="comentarios" class="swal2-textarea" placeholder="Tus comentarios..." style="width: 100%; min-height: 100px;"></textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Enviar encuesta',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0077b6',
      width: '600px',
      didOpen: () => {
        ['experiencia', 'profesionalismo', 'recomendacion'].forEach(id => {
          const slider = document.getElementById(id) as HTMLInputElement;
          const valueSpan = document.getElementById(`${id}-value`);
          
          if (slider && valueSpan) {
            slider.addEventListener('input', () => {
              valueSpan.textContent = slider.value;
            });
          }
        });
      },
      preConfirm: () => {
        const experiencia = parseInt((document.getElementById('experiencia') as HTMLInputElement).value);
        const profesionalismo = parseInt((document.getElementById('profesionalismo') as HTMLInputElement).value);
        const recomendacion = parseInt((document.getElementById('recomendacion') as HTMLInputElement).value);
        const comentarios = (document.getElementById('comentarios') as HTMLTextAreaElement).value;
        
        return { experiencia, profesionalismo, recomendacion, comentarios };
      }
    });

    if (formValues) {
      this.loading = true;
      try {
        const encuestaData = {
          experiencia_general: formValues.experiencia,
          profesionalismo: formValues.profesionalismo,
          recomendaria: formValues.recomendacion,
          comentarios: formValues.comentarios
        };

        const { error } = await this.supabaseService.completarEncuesta(
          turno.id!,
          this.currentUser!.id,
          encuestaData
        );

        if (error) throw error;

        await Swal.fire({
          icon: 'success',
          title: '¡Gracias por tu tiempo!',
          text: 'Tu opinión nos ayuda a mejorar nuestros servicios',
          confirmButtonColor: '#0077b6'
        });

        await this.cargarTurnos();

      } catch (error) {
        console.error('Error completando encuesta:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo guardar la encuesta',
          confirmButtonColor: '#0077b6'
        });
      } finally {
        this.loading = false;
      }
    }
  }

  verCalificacion(turno: TurnoConDetalles) {
    const estrellas = '⭐'.repeat(turno.calificacion_atencion || 0);
    
    Swal.fire({
      title: '⭐ Tu Calificación',
      html: `
        <div style="text-align: left; padding: 1rem;">
          <p><strong>Especialista:</strong> ${turno.especialista?.nombre} ${turno.especialista?.apellido}</p>
          <p><strong>Fecha:</strong> ${this.formatearFecha(turno.fecha)}</p>
          <hr style="margin: 1rem 0;">
          <div style="text-align: center; font-size: 2rem; margin: 1rem 0;">
            ${estrellas}
          </div>
          <p style="white-space: pre-wrap;"><strong>Comentario:</strong><br>${turno.comentario_calificacion}</p>
        </div>
      `,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#0077b6'
    });
  }

  puedeCalificar(turno: TurnoConDetalles): boolean {
    return turno.estado === 'realizado' && !turno.calificacion_atencion;
  }

  puedeCompletarEncuesta(turno: TurnoConDetalles): boolean {
    return turno.estado === 'realizado' && !turno.encuesta_completada;
  }

  puedeCancelar(turno: TurnoConDetalles): boolean {
    return turno.estado === 'pendiente' || turno.estado === 'aceptado';
  }

  formatearFecha(fecha: string): string {
    const f = new Date(fecha + 'T00:00:00');
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    return `${dias[f.getDay()]} ${f.getDate()} de ${meses[f.getMonth()]} ${f.getFullYear()}`;
  }

  getEstadoClase(estado: string): string {
    const clases: { [key: string]: string } = {
      'pendiente': 'estado-pendiente',
      'aceptado': 'estado-aceptado',
      'rechazado': 'estado-rechazado',
      'cancelado': 'estado-cancelado',
      'realizado': 'estado-realizado'
    };
    return clases[estado] || '';
  }

  getEstadoTexto(estado: string): string {
    const textos: { [key: string]: string } = {
      'pendiente': ' Pendiente',
      'aceptado': ' Aceptado',
      'rechazado': ' Rechazado',
      'cancelado': ' Cancelado',
      'realizado': ' Realizado'
    };
    return textos[estado] || estado;
  }

  solicitarNuevoTurno() {
    this.router.navigate(['/solicitar-turno']);
  }

  volver() {
    this.router.navigate(['/home']);
  }

}

import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import { SupabaseService, UserProfile, Especialidad } from '../../services/supabase.service';
import { TurnoConDetalles } from '../../models/turno';

@Component({
  selector: 'app-historia-clinica',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: 'historia-clinica.html',
  styleUrl: 'historia-clinica.css',
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
export class HistoriaClinica implements OnInit {
  currentUser: UserProfile | null = null;
  turnos: TurnoConDetalles[] = [];
  turnosFiltrados: TurnoConDetalles[] = [];
  especialidades: Especialidad[] = [];
  especialidadSeleccionada: number | null = null;
  loading = true;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    console.log(' HistoriaClinica: ngOnInit iniciado');
    await this.verificarPaciente();
    if (this.currentUser) {
      console.log('✅ Usuario verificado como paciente:', this.currentUser.nombre);
      await Promise.all([
        this.cargarEspecialidades(),
        this.cargarTurnos()
      ]);
    } else {
      console.log('❌ No hay usuario actual');
    }
  }

  async verificarPaciente() {
    const user = this.supabaseService.currentUserValue;
    if (user) {
      this.currentUser = await this.supabaseService.getProfile(user.id);
      if (this.currentUser?.role !== 'paciente') {
        this.router.navigate(['/home']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  async cargarEspecialidades() {
    const { data } = await this.supabaseService.getEspecialidades();
    this.especialidades = data || [];
  }

  async cargarTurnos() {
    if (!this.currentUser) {
      console.log('❌ No hay usuario para cargar turnos');
      return;
    }

    console.log('📥 Cargando turnos para paciente:', this.currentUser.id);
    this.loading = true;
    try {
      const { data, error } = await this.supabaseService.getTurnosRealizadosPaciente(
        this.currentUser.id,
        this.especialidadSeleccionada || undefined
      );

      console.log('📦 Respuesta de turnos:', { 
        tieneData: !!data, 
        cantidad: data?.length || 0, 
        tieneError: !!error,
        error: error 
      });

      if (error) {
        console.error('❌ Error en consulta:', error);
        throw error;
      }

      this.turnos = (data as TurnoConDetalles[]) || [];
      this.turnosFiltrados = this.turnos;
      
      console.log(`✅ Turnos cargados: ${this.turnos.length}`);
      if (this.turnos.length > 0) {
        console.log('📝 Primer turno:', this.turnos[0]);
      }
    } catch (error) {
      console.error('❌ Error cargando turnos:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los turnos',
        confirmButtonColor: '#0077b6'
      });
    } finally {
      this.loading = false;
      console.log('🏁 Carga de turnos finalizada. Loading:', this.loading);
    }
  }

  async onEspecialidadChange() {
    console.log('🔄 Cambio de especialidad:', this.especialidadSeleccionada);
    await this.cargarTurnos();
  }


  cargarImagenBase64(url: string): Promise<string> {
  
  // 3. Agregamos '<string>' al constructor de la Promesa para que sepa que devuelve texto
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
             // Rechazamos con un error tipado si falla el contexto
             reject(new Error("No se pudo obtener el contexto 2D del canvas."));
             return;
        }
        
        ctx.drawImage(img, 0, 0);
        const base64Data = canvas.toDataURL('/assets/farmacia.png'); 
        
        // Aquí resolvemos con el string
        resolve(base64Data);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = (error) => {
      reject(new Error(`Fallo al cargar la imagen: ${error}`));
    };
    
    img.src = url;
  });
}

 async descargarPDF() {
    console.log('📄 Iniciando descarga de PDF...');
    if (!this.currentUser) {
      console.log('❌ No hay usuario para generar PDF');
      return;
    }

    // ===============================================
    // 💡 PASO 1: CARGAR EL LOGO DE FORMA ASÍNCRONA
    // ===============================================
    let logoBase64: string | null = null;
    try {
        // Espera a que la imagen se cargue y se convierta a Base64
        // ASUME que el archivo es 'favicon.png' en la raíz de /public
        logoBase64 = await this.cargarImagenBase64('/clinica-online/assets/farmacia.png');
        console.log('✅ Logo cargado con éxito.');
    } catch (e) {
        console.warn('⚠️ No se pudo cargar el logo, se continuará sin él.');
        // No detenemos el flujo si la imagen falla
    }
    // ===============================================

    try {
      Swal.fire({
        title: 'Generando PDF...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const { data: turnos } = await this.supabaseService.getTurnosRealizadosPaciente(
        this.currentUser.id,
        this.especialidadSeleccionada || undefined
      );

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPos = 20;

      // ===============================================
      // 💡 PASO 2: USAR LA IMAGEN CARGADA
      // ===============================================
      if (logoBase64) {
          const logoWidth = 30; 
          const logoHeight = 30;
          const xPosLogo = pageWidth / 2 - logoWidth / 2; // Centrar logo
          
          pdf.addImage(
              logoBase64, 
              'PNG', // Formato (ajustar si es diferente)
              xPosLogo, 
              yPos, 
              logoWidth, 
              logoHeight
          ); 
          // Mover la posición Y después del logo
          yPos += logoHeight + 5; 
      }
      // ===============================================

      // Título
      pdf.setFontSize(18);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Historia Clínica', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Fecha de emisión
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      const fechaEmision = new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      pdf.text(`Fecha de emisión: ${fechaEmision}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Datos del paciente
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Paciente: ${this.currentUser.nombre} ${this.currentUser.apellido}`, 20, yPos);
      yPos += 7;
      pdf.text(`DNI: ${this.currentUser.dni}`, 20, yPos);
      yPos += 7;
      if (this.currentUser.obra_social) {
        pdf.text(`Obra Social: ${this.currentUser.obra_social}`, 20, yPos);
        yPos += 7;
      }
      yPos += 5;

      // Filtro de especialidad si aplica
      if (this.especialidadSeleccionada) {
        // ... (El resto del código del filtro sigue igual)
        const especialidad = this.especialidades.find(e => e.id === this.especialidadSeleccionada);
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Filtrado por: ${especialidad?.nombre || 'Especialidad'}`, 20, yPos);
        yPos += 10;
      }

      // Línea separadora
      pdf.setDrawColor(0, 119, 182);
      pdf.line(20, yPos, pageWidth - 20, yPos);
      yPos += 10;

      // Turnos
      if (!turnos || turnos.length === 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        pdf.text('No hay atenciones registradas', pageWidth / 2, yPos, { align: 'center' });
      } else {
        pdf.setFontSize(14);
        pdf.setTextColor(0, 119, 182);
        pdf.text('Atenciones Realizadas', 20, yPos);
        yPos += 10;

        turnos.forEach((turno: any, index: number) => {
          // Verificar si necesitamos nueva página
          if (yPos > pageHeight - 40) {
            pdf.addPage();
            yPos = 20;
          }

          pdf.setFontSize(11);
          pdf.setTextColor(0, 0, 0);
          
          const fecha = new Date(turno.fecha).toLocaleDateString('es-AR');
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Atención ${index + 1}`, 20, yPos);
          yPos += 7;

          pdf.setFont('helvetica', 'normal');
          pdf.text(`Fecha: ${fecha} - Hora: ${turno.hora}`, 25, yPos);
          yPos += 6;
          const especialidadNombre = this.getEspecialidadNombre(turno);
          pdf.text(`Especialidad: ${especialidadNombre}`, 25, yPos);
          yPos += 6;
          pdf.text(`Especialista: ${turno.especialista?.nombre || ''} ${turno.especialista?.apellido || ''}`, 25, yPos);
          yPos += 6;

          if (turno.resena_especialista) {
            pdf.setFont('helvetica', 'italic');
            pdf.text(`Reseña: ${turno.resena_especialista}`, 25, yPos);
            yPos += 6;
          }

          yPos += 5;
          pdf.setDrawColor(200, 200, 200);
          pdf.line(20, yPos, pageWidth - 20, yPos);
          yPos += 8;
        });
      }

      // Guardar PDF
      const nombreArchivo = `HistoriaClinica_${this.currentUser.nombre}_${this.currentUser.apellido}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(nombreArchivo);

      Swal.fire({
        icon: 'success',
        title: 'PDF generado',
        text: `Se descargó el archivo: ${nombreArchivo}`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error: any) {
      // Si falla cualquier cosa DESPUÉS de cargar la imagen (ej: Supabase o jsPDF)
      console.error('Error generando PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo generar el archivo PDF',
        confirmButtonColor: '#0077b6'
      });
    }
  }

  volver() {
    this.router.navigate(['/home']);
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getEspecialidadNombre(turno: any): string {
    if (typeof turno.especialidad === 'string') {
      return turno.especialidad;
    }
    if (turno.especialidad && typeof turno.especialidad === 'object' && turno.especialidad.nombre) {
      return turno.especialidad.nombre;
    }
    return 'N/A';
  }
}


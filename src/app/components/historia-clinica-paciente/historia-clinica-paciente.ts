import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import { SupabaseService, UserProfile, Especialidad } from '../../services/supabase.service';
import { HistoriaClinicaDetalle } from '../../models/historia-clinica';

@Component({
  selector: 'app-historia-clinica-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historia-clinica-paciente.html',
  styleUrls: ['./historia-clinica-paciente.css'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.4s ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class HistoriaClinicaPaciente implements OnInit {
  pacienteId: string = '';
  paciente: UserProfile | null = null;
  currentUser: UserProfile | null = null;
  historias: HistoriaClinicaDetalle[] = [];
  historiasFiltradas: HistoriaClinicaDetalle[] = [];
  loading = true;
  puedeVer = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  async ngOnInit() {
    console.log('🏥 HistoriaClinicaPaciente: ngOnInit iniciado');
    
    // Obtener ID del paciente desde la URL
    this.pacienteId = this.route.snapshot.paramMap.get('id') || '';
    
    if (!this.pacienteId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se especificó un paciente',
        confirmButtonColor: '#0077b6'
      });
      this.router.navigate(['/home']);
      return;
    }

    await this.verificarPermisos();
    
    if (this.puedeVer) {
      await this.cargarDatos();
    }
  }

  async verificarPermisos() {
    try {
      const user = this.supabaseService.currentUserValue;
      
      if (!user) {
        this.mostrarAccesoDenegado();
        return;
      }

      this.currentUser = await this.supabaseService.getProfile(user.id);

      // Verificar permisos según el rol
      if (this.currentUser?.role === 'admin') {
        // Los admins pueden ver todas las historias
        this.puedeVer = true;
        console.log('✅ Acceso como admin');
      } else if (this.currentUser?.role === 'especialista') {
        // Verificar si el especialista atendió al paciente
        this.puedeVer = await this.supabaseService.puedeVerHistoriaClinica(
          user.id,
          this.pacienteId
        );
        
        if (!this.puedeVer) {
          console.log('❌ Especialista no ha atendido a este paciente');
          Swal.fire({
            icon: 'error',
            title: 'Acceso denegado',
            text: 'No has atendido a este paciente',
            confirmButtonColor: '#0077b6'
          });
          this.router.navigate(['/pacientes']);
        } else {
          console.log('✅ Acceso como especialista que atendió al paciente');
        }
      } else if (this.currentUser?.role === 'paciente') {
        // Los pacientes solo pueden ver su propia historia
        this.puedeVer = (user.id === this.pacienteId);
        
        if (!this.puedeVer) {
          this.mostrarAccesoDenegado();
        } else {
          console.log('✅ Acceso como paciente a su propia historia');
        }
      } else {
        this.mostrarAccesoDenegado();
      }
    } catch (error) {
      console.error('❌ Error verificando permisos:', error);
      this.mostrarAccesoDenegado();
    }
  }

  mostrarAccesoDenegado() {
    Swal.fire({
      icon: 'error',
      title: 'Acceso denegado',
      text: 'No tienes permisos para ver esta información',
      confirmButtonColor: '#0077b6'
    });
    this.router.navigate(['/home']);
  }

  async cargarDatos() {
    this.loading = true;
    
    try {
      // Cargar datos del paciente
      this.paciente = await this.supabaseService.getProfile(this.pacienteId);
      console.log('👤 Paciente cargado:', this.paciente?.nombre);

      // Cargar historia clínica
      const { data, error } = await this.supabaseService.getHistoriaClinicaPaciente(this.pacienteId);

      if (error) {
        console.error('❌ Error cargando historia:', error);
        throw error;
      }

      this.historias = data || [];
      this.historiasFiltradas = this.historias;
      
      console.log(`✅ Historia clínica cargada: ${this.historias.length} registros`);
      
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cargar la historia clínica',
        confirmButtonColor: '#0077b6'
      });
    } finally {
      this.loading = false;
    }
  }

  async descargarPDF() {
    if (!this.paciente) {
      console.log('❌ No hay paciente para generar PDF');
      return;
    }

    try {
      Swal.fire({
        title: 'Generando PDF...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPos = 20;

      // Logo
      pdf.setFontSize(24);
      pdf.setTextColor(0, 119, 182);
      pdf.text('🏥 Clínica Online', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Título
      pdf.setFontSize(18);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Historia Clínica Completa', pageWidth / 2, yPos, { align: 'center' });
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
      pdf.text(`Paciente: ${this.paciente.nombre} ${this.paciente.apellido}`, 20, yPos);
      yPos += 7;
      pdf.text(`DNI: ${this.paciente.dni}`, 20, yPos);
      yPos += 7;
      if (this.paciente.obra_social) {
        pdf.text(`Obra Social: ${this.paciente.obra_social}`, 20, yPos);
        yPos += 7;
      }
      yPos += 5;

      // Línea separadora
      pdf.setDrawColor(0, 119, 182);
      pdf.line(20, yPos, pageWidth - 20, yPos);
      yPos += 10;

      // Registros de historia clínica
      if (this.historias.length === 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        pdf.text('No hay registros en la historia clínica', pageWidth / 2, yPos, { align: 'center' });
      } else {
        pdf.setFontSize(14);
        pdf.setTextColor(0, 119, 182);
        pdf.text('Registros Médicos', 20, yPos);
        yPos += 10;

        this.historias.forEach((historia, index) => {
          // Verificar si necesitamos nueva página
          if (yPos > pageHeight - 60) {
            pdf.addPage();
            yPos = 20;
          }

          pdf.setFontSize(11);
          pdf.setTextColor(0, 0, 0);
          
          const fecha = new Date(historia.fecha_registro || '').toLocaleDateString('es-AR');
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Registro ${index + 1}`, 20, yPos);
          yPos += 7;

          pdf.setFont('helvetica', 'normal');
          pdf.text(`Fecha: ${fecha}`, 25, yPos);
          yPos += 6;
          pdf.text(`Especialista: ${historia.especialista_nombre || ''} ${historia.especialista_apellido || ''}`, 25, yPos);
          yPos += 6;
          
          if (historia.especialidad_nombre) {
            pdf.text(`Especialidad: ${historia.especialidad_nombre}`, 25, yPos);
            yPos += 6;
          }

          // Datos fijos
          pdf.setFont('helvetica', 'bold');
          pdf.text('Datos Médicos:', 25, yPos);
          yPos += 6;
          pdf.setFont('helvetica', 'normal');

          if (historia.altura) {
            pdf.text(`  Altura: ${historia.altura} cm`, 25, yPos);
            yPos += 6;
          }
          if (historia.peso) {
            pdf.text(`  Peso: ${historia.peso} kg`, 25, yPos);
            yPos += 6;
          }
          if (historia.temperatura) {
            pdf.text(`  Temperatura: ${historia.temperatura} °C`, 25, yPos);
            yPos += 6;
          }
          if (historia.presion) {
            pdf.text(`  Presión: ${historia.presion} mmHg`, 25, yPos);
            yPos += 6;
          }

          // Datos adicionales
          if (historia.datos_adicionales && historia.datos_adicionales.length > 0) {
            pdf.setFont('helvetica', 'bold');
            pdf.text('Datos Adicionales:', 25, yPos);
            yPos += 6;
            pdf.setFont('helvetica', 'normal');

            historia.datos_adicionales.forEach((dato: any) => {
              pdf.text(`  ${dato.clave}: ${dato.valor}`, 25, yPos);
              yPos += 6;
            });
          }

          yPos += 5;
          pdf.setDrawColor(200, 200, 200);
          pdf.line(20, yPos, pageWidth - 20, yPos);
          yPos += 8;
        });
      }

      // Guardar PDF
      const nombreArchivo = `HistoriaClinica_${this.paciente.nombre}_${this.paciente.apellido}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(nombreArchivo);

      Swal.fire({
        icon: 'success',
        title: 'PDF generado',
        text: `Se descargó el archivo: ${nombreArchivo}`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error: any) {
      console.error('❌ Error generando PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo generar el archivo PDF',
        confirmButtonColor: '#0077b6'
      });
    }
  }

  volver() {
    if (this.currentUser?.role === 'especialista') {
      this.router.navigate(['/pacientes']);
    } else if (this.currentUser?.role === 'admin') {
      this.router.navigate(['/usuarios']);
    } else {
      this.router.navigate(['/home']);
    }
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { SupabaseService } from '../../services/supabase.service';
import { HistoriaClinica, DatoAdicional } from '../../models/historia-clinica';

@Component({
  selector: 'app-cargar-historia-clinica',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cargar-historia-clinica.html',
  styleUrls: ['./cargar-historia-clinica.css']
})
export class CargarHistoriaClinicaComponent implements OnInit {
  @Input() pacienteId!: string;
  @Input() pacienteNombre!: string;
  @Input() especialistaId!: string;
  @Input() turnoId?: number;
  @Output() guardado = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  altura: number | null = null;
  peso: number | null = null;
  temperatura: number | null = null;
  presionSistolica: number | null = null;
  presionDiastolica: number | null = null;

  datosAdicionales: DatoAdicional[] = [
    { clave: '', valor: '' }
  ];

  loading = false;

  constructor(private supabaseService: SupabaseService) {}

  ngOnInit() {
    console.log('📋 Cargando historia clínica para:', this.pacienteNombre);
  }

  agregarDatoAdicional() {
    if (this.datosAdicionales.length < 3) {
      this.datosAdicionales.push({ clave: '', valor: '' });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Máximo alcanzado',
        text: 'Solo se pueden agregar hasta 3 datos adicionales',
        confirmButtonColor: '#0077b6'
      });
    }
  }

  eliminarDatoAdicional(index: number) {
    this.datosAdicionales.splice(index, 1);
    if (this.datosAdicionales.length === 0) {
      this.datosAdicionales.push({ clave: '', valor: '' });
    }
  }

  async guardar() {
    if (!this.validarDatos()) {
      return;
    }

    this.loading = true;

    try {
      // Filtrar datos adicionales vacíos
      const datosAdicionalesFiltrados = this.datosAdicionales.filter(
        d => d.clave.trim() !== '' && d.valor.trim() !== ''
      );

      const historia: HistoriaClinica = {
        paciente_id: this.pacienteId,
        especialista_id: this.especialistaId,
        turno_id: this.turnoId || null,
        altura: this.altura,
        peso: this.peso,
        temperatura: this.temperatura,
        presion: this.presionSistolica && this.presionDiastolica 
          ? `${this.presionSistolica}/${this.presionDiastolica}`
          : null,
        datos_adicionales: datosAdicionalesFiltrados
      };

      const { data, error } = await this.supabaseService.crearHistoriaClinica(historia);

      if (error) {
        throw error;
      }

      await Swal.fire({
        icon: 'success',
        title: '✅ Historia clínica guardada',
        text: 'Los datos se guardaron correctamente',
        timer: 2000,
        showConfirmButton: false
      });

      this.guardado.emit();
    } catch (error: any) {
      console.error('❌ Error guardando historia clínica:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo guardar la historia clínica',
        confirmButtonColor: '#0077b6'
      });
    } finally {
      this.loading = false;
    }
  }

  validarDatos(): boolean {
    // Al menos uno de los datos fijos debe estar presente
    if (!this.altura && !this.peso && !this.temperatura && !this.presionSistolica) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Debe ingresar al menos uno de los datos médicos',
        confirmButtonColor: '#0077b6'
      });
      return false;
    }

    if (this.altura !== null && (this.altura <= 0 || this.altura > 300)) {
      Swal.fire({
        icon: 'error',
        title: 'Altura inválida',
        text: 'Ingrese una altura válida (1-300 cm)',
        confirmButtonColor: '#0077b6'
      });
      return false;
    }

    if (this.peso !== null && (this.peso <= 0 || this.peso > 500)) {
      Swal.fire({
        icon: 'error',
        title: 'Peso inválido',
        text: 'Ingrese un peso válido (1-500 kg)',
        confirmButtonColor: '#0077b6'
      });
      return false;
    }

    if (this.temperatura !== null && (this.temperatura < 30 || this.temperatura > 45)) {
      Swal.fire({
        icon: 'error',
        title: 'Temperatura inválida',
        text: 'Ingrese una temperatura válida (30-45°C)',
        confirmButtonColor: '#0077b6'
      });
      return false;
    }

    if (this.presionSistolica !== null && (this.presionSistolica <= 0 || this.presionSistolica > 300)) {
      Swal.fire({
        icon: 'error',
        title: 'Presión inválida',
        text: 'Ingrese una presión sistólica válida (1-300)',
        confirmButtonColor: '#0077b6'
      });
      return false;
    }

    if (this.presionDiastolica !== null && (this.presionDiastolica <= 0 || this.presionDiastolica > 200)) {
      Swal.fire({
        icon: 'error',
        title: 'Presión inválida',
        text: 'Ingrese una presión diastólica válida (1-200)',
        confirmButtonColor: '#0077b6'
      });
      return false;
    }

    return true;
  }

  onCancelar() {
    this.cancelar.emit();
  }
}
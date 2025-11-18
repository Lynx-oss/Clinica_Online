export interface DatoAdicional {
  clave: string;
  valor: string;
}

export interface HistoriaClinica {
  id?: number;
  paciente_id: string;
  especialista_id: string;
  turno_id?: number | null;
  fecha_registro?: string;
  
  // Datos fijos (opcionales según tu tabla)
  altura?: number | null;
  peso?: number | null;
  temperatura?: number | null;
  presion?: string | null;
  
  // Datos dinámicos
  datos_adicionales?: DatoAdicional[];
  
  created_at?: string;
}

export interface HistoriaClinicaDetalle extends HistoriaClinica {
  paciente_nombre?: string;
  paciente_apellido?: string;
  paciente_email?: string;
  paciente_dni?: string;
  paciente_imagen?: string;
  especialista_nombre?: string;
  especialista_apellido?: string;
  especialidad_nombre?: string;
}
export interface Turno {
    id?: number;
    paciente_id: string;
    especialista_id: string;
    especialidad: string;
    fecha: string;
    hora: string;
    duracion: number;
    estado: 'pendiente' | 'aceptado' | 'rechazado' | 'cancelado' | 'realizado';
    comentario_cancelacion?: string;
    comentario_rechazo?: string;
    resena_especialista?: string;
    calificacion_atencion?: number;
    comentario_calificacion?: string;
    encuesta_completada: boolean;
    created_at?: string;
}

export interface EspecialistaConEspecialidades {
    id: string;
    nombre: string;
    apellido: string;
    imagen_perfil_1: string;
    especialidades: string[];
}

export interface TurnoConDetalles extends Turno {
    especialista?: {
        nombre: string;
        apellido: string;
        imagen_perfil_1: string;
    };
    paciente?: {
        nombre: string;
        apellido: string;
        imagen_perfil_1: string;
        obra_social?: string;
    }
}
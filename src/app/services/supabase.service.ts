import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { TurnoConDetalles } from '../models/turno';
import { HistoriaClinica, HistoriaClinicaDetalle } from '../models/historia-clinica';


export interface UserProfile {
  id: string;
  email: string;
  role: 'paciente' | 'especialista' | 'admin';
  nombre: string;
  apellido: string;
  edad: number;
  dni: string;
  obra_social?: string;
  especialidad?: string;
  imagen_perfil_1?: string;
  imagen_perfil_2?: string;
  approved: boolean;
  email_verified: boolean;
  created_at: string;
}

export interface Especialidad {
  id: number;
  nombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );

    this.currentUserSubject = new BehaviorSubject<User | null>(null);
    this.currentUser = this.currentUserSubject.asObservable();

    this.checkUser();

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUserSubject.next(session?.user || null);
    });
  }

  private async checkUser() {
    const { data: { session } } = await this.supabase.auth.getSession();
    this.currentUserSubject.next(session?.user || null);
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  async signUp(email: string, password: string) {
    return await this.supabase.auth.signUp({ email, password });
  }

  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return await this.supabase.auth.signOut();
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase.from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) return null;
    return data;
  }

  async getAllProfiles(): Promise<UserProfile[]> {
    const { data, error } = await this.supabase.from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    return data || [];
  }

  async createProfile(profile: Partial<UserProfile>) {
    const { data, error } = await this.supabase.from('profiles')
      .insert(profile)
      .select()
      .single();

    return { data, error };
  }

 async updateProfile(userId: string, profile: Partial<UserProfile>) {
  const { data, error } = await this.supabase
    .from('profiles')
    .update(profile)
    .eq('id', userId)
    .select()
    .single();

  return { data, error };
}

  async approveSpecialist(userId: string) {
    return await this.updateProfile(userId, { approved: true });
  }

  async verifyEmail(userId: string) {
    return await this.updateProfile(userId, { email_verified: true });
  }
async getEspecialidades() {
  const { data, error } = await this.supabase
    .from('especialidades')
    .select('*')
    .order('nombre');
  
  return { data, error };  
}

  async addEspecialidad(nombre: string) {
    const { data, error } = await this.supabase.from('especialidades')
      .insert({ nombre })
      .select()
      .single();
    return { data, error };
  }

  async uploadImage(file: File, userId: string, numeroImagen: number): Promise<string> {
    try {
      const filePath = `${userId}_${numeroImagen}.png`;

      const { error: uploadError } = await this.supabase.storage
        .from('imagenes-perfil')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = this.supabase.storage
        .from('imagenes-perfil')
        .getPublicUrl(filePath);

      if (!data?.publicUrl) throw 'No public URL generated';

      return data.publicUrl;
    } catch (error) {
      console.error('Error subiendo la imagen:', error);
      throw error;
    }
  }

  getPublicUrl(path: string) {
    return this.supabase.storage.from('imagenes-perfil').getPublicUrl(path);
  }

  async deleteImage(userId: string, numeroImagen: number = 1) {
    const filePath = `${userId}_${numeroImagen}.png`;
    const { data, error } = await this.supabase.storage
      .from('imagenes-perfil')
      .remove([filePath]);

    return { data, error };
  }

  async deleteUser(userId: string): Promise<void> {
  try {
    const { error: profileError } = await this.supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error eliminando perfil:', profileError);
      throw profileError;
    }

    
    const { error: authError } = await this.supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error eliminando usuario de Auth:', authError);
      throw authError;
    }

    console.log(' Usuario eliminado correctamente:', userId);
  } catch (error) {
    console.error(' Error al eliminar usuario:', error);
    throw error;
  }
}

//turnos------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

async getTurnosPaciente(pacienteId: string) {
  const { data, error } = await this.supabase
    .from('turnos')
    .select(`
      *,
      especialista:especialista_id(nombre, apellido, imagen_perfil_1),
      paciente:paciente_id(nombre, apellido, imagen_perfil_1),
      especialidad:especialidad_id(nombre)
    `)
    .eq('paciente_id', pacienteId)
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false });

  return { data, error };
}

async getTurnosEspecialista(especialistaId: string) {
  const { data, error } = await this.supabase
    .from('turnos')
    .select(`
      *,
      especialista:especialista_id(nombre, apellido, imagen_perfil_1),
      paciente:paciente_id(nombre, apellido, imagen_perfil_1, obra_social),
      especialidad:especialidad_id(nombre)
    `)
    .eq('especialista_id', especialistaId)
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false });

  if (error) return { data: [], error };


  const turnosAplanados: TurnoConDetalles[] = data.map((turno: any) => {

    const pacienteNombreCompleto = `${turno.paciente?.nombre || ''} ${turno.paciente?.apellido || ''}`.trim();

    return {
      ...turno,

      especialista_nombre: `${turno.especialista?.nombre || ''} ${turno.especialista?.apellido || ''}`.trim(),
      paciente_nombre: pacienteNombreCompleto,
      especialidad_nombre: turno.especialidad?.nombre || 'N/A'
    } as TurnoConDetalles;
  });
  
  return { data: turnosAplanados, error: null };
}

async getTodosLosTurnos() {
  const { data, error } = await this.supabase
    .from('turnos')
    .select(`
      *,
      especialista:especialista_id(nombre, apellido, imagen_perfil_1),
      paciente:paciente_id(nombre, apellido, imagen_perfil_1),
      especialidad:especialidad_id(nombre)
    `)
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false });

  return { data, error };
}

async crearTurno(turnoData: any) {

  const fechaTurno = new Date(turnoData.fecha);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (fechaTurno < hoy) {
    return { 
      data: null, 
      error: { message: 'No se pueden crear turnos en fechas pasadas' } 
    };
  }

  const { data: turnoExistente } = await this.supabase
    .from('turnos')
    .select('id')
    .eq('especialista_id', turnoData.especialista_id)
    .eq('fecha', turnoData.fecha)
    .eq('hora', turnoData.hora)
    .in('estado', ['pendiente', 'aceptado', 'realizado'])
    .single();

  if (turnoExistente) {
    return {
      data: null,
      error: { message: 'Este horario ya está ocupado' }
    };
  }

  const { data, error } = await this.supabase
    .from('turnos')
    .insert(turnoData)
    .select(`
      *,
      especialista:especialista_id(nombre, apellido, imagen_perfil_1),
      paciente:paciente_id(nombre, apellido, imagen_perfil_1),
      especialidad:especialidad_id(nombre)
    `)
    .single();

  return { data, error };
}

async actualizarTurno(turnoId: number, updates: any) {
  const { data, error } = await this.supabase
    .from('turnos')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', turnoId)
    .select(`
      *,
      especialista:especialista_id(nombre, apellido, imagen_perfil_1),
      paciente:paciente_id(nombre, apellido, imagen_perfil_1),
      especialidad:especialidad_id(nombre)
    `)
    .single();

  return { data, error };
}

async cancelarTurno(turnoId: number, comentario: string, canceladoPorId: string) {
  const { data, error } = await this.supabase
    .from('turnos')
    .update({
      estado: 'cancelado',
      comentario_cancelacion: comentario,
      cancelado_por: canceladoPorId,
      fecha_cancelacion: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', turnoId)
    .select(`
      *,
      especialista:especialista_id(nombre, apellido, imagen_perfil_1),
      paciente:paciente_id(nombre, apellido, imagen_perfil_1)
    `)
    .single();

  return { data, error };
}

async rechazarTurno(turnoId: number, comentario: string) {
  const { data, error } = await this.supabase
    .from('turnos')
    .update({
      estado: 'rechazado',
      comentario_cancelacion: comentario, 
      fecha_cancelacion: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', turnoId)
    .select(`
      *,
      especialista:especialista_id(nombre, apellido, imagen_perfil_1),
      paciente:paciente_id(nombre, apellido, imagen_perfil_1)
    `)
    .single();

  return { data, error };
}

async aceptarTurno(turnoId: number) {
  const { data, error } = await this.supabase
    .from('turnos')
    .update({
      estado: 'aceptado',
      updated_at: new Date().toISOString()
    })
    .eq('id', turnoId)
    .select(`
      *,
      especialista:especialista_id(nombre, apellido, imagen_perfil_1),
      paciente:paciente_id(nombre, apellido, imagen_perfil_1)
    `)
    .single();

  return { data, error };
}

async finalizarTurno(turnoId: number, resena: string) {
  const { data, error } = await this.supabase
    .from('turnos')
    .update({
      estado: 'realizado',
      resena_especialista: resena, 
      fecha_realizacion: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', turnoId)
    .select(`
      *,
      especialista:especialista_id(nombre, apellido, imagen_perfil_1),
      paciente:paciente_id(nombre, apellido, imagen_perfil_1)
    `)
    .single();

  return { data, error };
}

async calificarAtencion(turnoId: number, calificacion: number, comentario: string) {
  if (calificacion < 1 || calificacion > 5) {
    return {
      data: null,
      error: { message: 'La calificación debe estar entre 1 y 5' }
    };
  }

  const { data, error } = await this.supabase
    .from('turnos')
    .update({
      calificacion: calificacion,
      comentario_paciente: comentario, 
      updated_at: new Date().toISOString()
    })
    .eq('id', turnoId)
    .select(`
      *,
      especialista:especialista_id(nombre, apellido, imagen_perfil_1),
      paciente:paciente_id(nombre, apellido, imagen_perfil_1)
    `)
    .single();

  return { data, error };
}

async completarEncuesta(turnoId: number, respuestas: any) {
  const { data, error } = await this.supabase
    .from('turnos')
    .update({
      encuesta_completada: true,
      respuestas_encuesta: respuestas,
      updated_at: new Date().toISOString()
    })
    .eq('id', turnoId)
    .select(`
      *,
      especialista:especialista_id(nombre, apellido, imagen_perfil_1),
      paciente:paciente_id(nombre, apellido, imagen_perfil_1)
    `)
    .single();

  return { data, error };
}

async getHorariosDisponibles(
  especialistaId: string,
  especialidadId: number,
  fecha: string
) {
  const diaSemana = new Date(fecha).getDay();

  console.log('🔍 Parámetros recibidos:', {
    especialistaId,
    especialidadId,
    fecha,
    diaSemana
  });

  const { data: disponibilidad, error: errorDisp } = await this.supabase
    .from('disponibilidad_horaria')
    .select('*')
    .eq('especialista_id', especialistaId)
    .eq('especialidad_id', especialidadId)
    .eq('dia_semana', diaSemana)
    .eq('activo', true);

  console.log(' Disponibilidad encontrada:', disponibilidad);
  console.log(' Error disponibilidad:', errorDisp);

  if (errorDisp) return { data: [], error: errorDisp };
  
  if (!disponibilidad || disponibilidad.length === 0) {
    console.log(' No hay disponibilidad configurada para este día');
    return { 
      data: [], 
      error: { message: 'El especialista no tiene disponibilidad este día' } 
    };
  }

  const { data: turnosTomados, error: errorTurnos } = await this.supabase
    .from('turnos')
    .select('hora')
    .eq('especialista_id', especialistaId)
    .eq('fecha', fecha)
    .in('estado', ['pendiente', 'aceptado', 'realizado']);

  console.log(' Turnos tomados:', turnosTomados);
  console.log(' Error turnos:', errorTurnos);

  if (errorTurnos) return { data: [], error: errorTurnos };

  const horariosDisponibles: string[] = [];

  disponibilidad.forEach(horario => {
    const [hiH, hiM] = horario.hora_inicio.split(':').map(Number);
    const [hfH, hfM] = horario.hora_fin.split(':').map(Number);

    let currentMin = hiH * 60 + hiM;
    const finMin = hfH * 60 + hfM;
    const duracion = horario.duracion_turno || 30;

    console.log(' Generando horarios desde', horario.hora_inicio, 'hasta', horario.hora_fin);

    while (currentMin + duracion <= finMin) {
      const hh = Math.floor(currentMin / 60);
      const mm = currentMin % 60;
      const horaStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;

      const ocupado = turnosTomados?.some(t => t.hora === horaStr);
      if (!ocupado) {
        horariosDisponibles.push(horaStr);
      }

      currentMin += duracion;
    }
  });

  console.log('✅ Horarios disponibles generados:', horariosDisponibles);

  return { 
    data: horariosDisponibles.sort(), 
    error: null 
  };
}

async getDisponibilidadEspecialista(especialistaId: string) {
  const { data, error } = await this.supabase
    .from('disponibilidad_horaria')
    .select(`
      *,
      especialidad:especialidad_id(nombre)
    `)
    .eq('especialista_id', especialistaId)
    .order('dia_semana')
    .order('hora_inicio');

  return { data, error };
}

async crearDisponibilidad(disponibilidadData: any) {
  const { data, error } = await this.supabase
    .from('disponibilidad_horaria')
    .insert(disponibilidadData)
    .select(`
      *,
      especialidad:especialidad_id(nombre)
    `)
    .single();

  return { data, error };
}

async eliminarDisponibilidad(disponibilidadId: number) {
  const { data, error } = await this.supabase
    .from('disponibilidad_horaria')
    .delete()
    .eq('id', disponibilidadId);

  return { data, error };
}

async actualizarDisponibilidad(disponibilidadId: number, updates: any) {
  const { data, error } = await this.supabase
    .from('disponibilidad_horaria')
    .update(updates)
    .eq('id', disponibilidadId)
    .select()
    .single();

  return { data, error };
}


async getPacientesAtendidos(especialistaId: string) {
  const { data, error } = await this.supabase
    .from('turnos')
    .select(`
      paciente_id,
      fecha,
      especialidad:especialidad_id(nombre),
      paciente:paciente_id(nombre, apellido, dni, imagen_perfil_1)
    `)
    .eq('especialista_id', especialistaId)
    .eq('estado', 'realizado')
    .order('paciente_id')
    .order('fecha', { ascending: false });

  if (error) return { data: [], error };

  const pacientesMap = new Map();

  data?.forEach((turno: any) => {
    if (!pacientesMap.has(turno.paciente_id)) {
      pacientesMap.set(turno.paciente_id, {
        ...turno.paciente,
        id: turno.paciente_id,
        turnos: []
      });
    }
    
    const paciente = pacientesMap.get(turno.paciente_id);
    if (paciente.turnos.length < 3) {
      paciente.turnos.push({
        fecha: turno.fecha,
        especialidad: turno.especialidad?.nombre
      });
    }
  });

  return { data: Array.from(pacientesMap.values()), error: null };
}

async getEstadisticasTurnos(especialistaId?: string, fechaDesde?: string, fechaHasta?: string) {
  let query = this.supabase
    .from('turnos')
    .select('estado, fecha, calificacion', { count: 'exact' });

  if (especialistaId) query = query.eq('especialista_id', especialistaId);
  if (fechaDesde) query = query.gte('fecha', fechaDesde);
  if (fechaHasta) query = query.lte('fecha', fechaHasta);

  const { data, error, count } = await query;

  if (error) return { data: null, error };

  const estadisticas = {
    total: count || 0,
    realizados: data?.filter(t => t.estado === 'realizado').length || 0,
    cancelados: data?.filter(t => t.estado === 'cancelado').length || 0,
    pendientes: data?.filter(t => t.estado === 'pendiente').length || 0,
    promedioCalificacion: 0
  };

  const calificaciones = data?.filter(t => t.calificacion).map(t => t.calificacion) || [];
  if (calificaciones.length > 0) {
    estadisticas.promedioCalificacion = 
      calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length;
  }

  return { data: estadisticas, error: null };
}

//Turno-administrador

async getTurnosClinica(): Promise<{ data: TurnoConDetalles[] | null, error: any }> {
    try {
      const { data: turnos, error: errorSimple } = await this.supabase
        .from('turnos')
        .select('*')
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false });

      if (errorSimple) {
        return { data: null, error: errorSimple };
      }

      if (!turnos || turnos.length === 0) {
        return { data: [], error: null };
      }

      return await this.getTurnosClinicaManual(turnos);

    } catch (error) {
      return { data: null, error };
    }
  }

  private async getTurnosClinicaManual(turnos: any[]): Promise<{ data: TurnoConDetalles[] | null, error: any }> {
    try {
      console.log(' Cargando turnos manualmente...', turnos.length, 'turnos');
      
      const pacienteIds = [...new Set(turnos.map(t => t.paciente_id))];
      const especialistaIds = [...new Set(turnos.map(t => t.especialista_id))];
      const especialidadIds = [...new Set(turnos.map(t => t.especialidad_id))];

      console.log(' IDs únicos:', {
        pacientes: pacienteIds.length,
        especialistas: especialistaIds.length,
        especialidades: especialidadIds.length
      });

      console.log(' Consultando profiles y especialidades...');
      const [pacientesResult, especialistasResult, especialidadesResult] = await Promise.all([
        this.supabase
          .from('profiles')
          .select('id, nombre, apellido, imagen_perfil_1, obra_social')
          .in('id', pacienteIds),
        this.supabase
          .from('profiles')
          .select('id, nombre, apellido, imagen_perfil_1')
          .in('id', especialistaIds),
        this.supabase
          .from('especialidades')
          .select('id, nombre')
          .in('id', especialidadIds)
      ]);

      console.log(' Resultados de consultas:', {
        pacientes: { data: pacientesResult.data?.length || 0, error: pacientesResult.error },
        especialistas: { data: especialistasResult.data?.length || 0, error: especialistasResult.error },
        especialidades: { data: especialidadesResult.data?.length || 0, error: especialidadesResult.error }
      });

      if (pacientesResult.error) {
        console.error(' Error cargando pacientes:', pacientesResult.error);
      }
      if (especialistasResult.error) {
        console.error(' Error cargando especialistas:', especialistasResult.error);
      }
      if (especialidadesResult.error) {
        console.error(' Error cargando especialidades:', especialidadesResult.error);
      }

      const pacientesMap = new Map();
      if (pacientesResult.data) {
        pacientesResult.data.forEach((p: any) => {
          pacientesMap.set(p.id, p);
        });
        console.log(` Mapa de pacientes creado: ${pacientesMap.size} pacientes`);
      }

      const especialistasMap = new Map();
      if (especialistasResult.data) {
        especialistasResult.data.forEach((e: any) => {
          especialistasMap.set(e.id, e);
        });
        console.log(` Mapa de especialistas creado: ${especialistasMap.size} especialistas`);
      }

      const especialidadesMap = new Map();
      if (especialidadesResult.data) {
        especialidadesResult.data.forEach((e: any) => {
          especialidadesMap.set(e.id, e);
        });
        console.log(` Mapa de especialidades creado: ${especialidadesMap.size} especialidades`);
      }

      const mappedData: TurnoConDetalles[] = turnos.map((turno: any) => {
        const pacienteData = pacientesMap.get(turno.paciente_id);
        const especialistaData = especialistasMap.get(turno.especialista_id);
        const especialidadData = especialidadesMap.get(turno.especialidad_id);

        const pacienteNombreCompleto = `${pacienteData?.nombre || ''} ${pacienteData?.apellido || ''}`.trim();
        const especialistaNombreCompleto = `${especialistaData?.nombre || ''} ${especialistaData?.apellido || ''}`.trim();
        const especialidadNombre = especialidadData?.nombre || 'N/A';

        return {
          ...turno,
          especialidad: especialidadNombre,
          encuesta_completada: turno.encuesta_completada ?? false,
          paciente: pacienteData ? {
            nombre: pacienteData.nombre || '',
            apellido: pacienteData.apellido || '',
            imagen_perfil_1: pacienteData.imagen_perfil_1 || '',
            obra_social: pacienteData.obra_social
          } : undefined,
          especialista: especialistaData ? {
            nombre: especialistaData.nombre || '',
            apellido: especialistaData.apellido || '',
            imagen_perfil_1: especialistaData.imagen_perfil_1 || ''
          } : undefined,
          especialidad_nombre: especialidadNombre,
          paciente_nombre: pacienteNombreCompleto || 'N/A',
          especialista_nombre: especialistaNombreCompleto || 'N/A',
        } as any;
      });

      return { data: mappedData, error: null };

    } catch (error) {
      console.error('Error fetching all clinic appointments (getTurnosClinica):', error);
      return { data: null, error };
    }
  }

  async getTurnosUsuario(userId: string) {
    const { data: turnosPaciente, error: errorPaciente } = await this.supabase
      .from('turnos')
      .select(`
        *,
        especialista:especialista_id(nombre, apellido),
        paciente:paciente_id(nombre, apellido),
        especialidad:especialidad_id(nombre)
      `)
      .eq('paciente_id', userId)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false });

    const { data: turnosEspecialista, error: errorEspecialista } = await this.supabase
      .from('turnos')
      .select(`
        *,
        especialista:especialista_id(nombre, apellido),
        paciente:paciente_id(nombre, apellido),
        especialidad:especialidad_id(nombre)
      `)
      .eq('especialista_id', userId)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false });

    if (errorPaciente || errorEspecialista) {
      return { data: [], error: errorPaciente || errorEspecialista };
    }

    const todosTurnos = [
      ...(turnosPaciente || []).map((t: any) => ({
        ...t,
        tipo: 'paciente',
        con_quien: `${t.especialista?.nombre || ''} ${t.especialista?.apellido || ''}`.trim()
      })),
      ...(turnosEspecialista || []).map((t: any) => ({
        ...t,
        tipo: 'especialista',
        con_quien: `${t.paciente?.nombre || ''} ${t.paciente?.apellido || ''}`.trim()
      }))
    ];

    return { data: todosTurnos, error: null };
  }

 
//historia clinica


async crearHistoriaClinica(historia: HistoriaClinica): Promise<{ data: HistoriaClinica | null, error: any }> {
  try {
    const { data, error } = await this.supabase
      .from('historia_clinica')
      .insert([{
        paciente_id: historia.paciente_id,
        especialista_id: historia.especialista_id,
        turno_id: historia.turno_id,
        altura: historia.altura,
        peso: historia.peso,
        temperatura: historia.temperatura,
        presion: historia.presion,
        datos_adicionales: historia.datos_adicionales || []
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creando historia clínica:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error en crearHistoriaClinica:', error);
    return { data: null, error };
  }
}

/**
 * Obtener la historia clínica completa de un paciente
 */
async getHistoriaClinicaPaciente(pacienteId: string): Promise<{ data: HistoriaClinicaDetalle[] | null, error: any }> {
  try {
    const { data, error } = await this.supabase
      .from('historia_clinica')
      .select(`
        *,
        especialista:profiles!historia_clinica_especialista_id_fkey(
          nombre, 
          apellido
        ),
        turno:turnos(
          especialidad:especialidades(nombre)
        )
      `)
      .eq('paciente_id', pacienteId)
      .order('fecha_registro', { ascending: false });

    if (error) {
      console.error('Error obteniendo historia clínica:', error);
      return { data: null, error };
    }

    // Mapear los datos al formato detallado
    const historiaDetalle: HistoriaClinicaDetalle[] = (data || []).map((item: any) => ({
      ...item,
      especialista_nombre: item.especialista?.nombre || 'Desconocido',
      especialista_apellido: item.especialista?.apellido || '',
      especialidad_nombre: item.turno?.especialidad?.nombre || 'Sin especialidad'
    }));

    return { data: historiaDetalle, error: null };
  } catch (error) {
    console.error('Error en getHistoriaClinicaPaciente:', error);
    return { data: null, error };
  }
}

/**
 * Obtener lista de pacientes atendidos por un especialista
 */
async getPacientesConHistoriaClinica(especialistaId: string): Promise<{ data: any[] | null, error: any }> {
  try {
    const { data, error } = await this.supabase
      .from('historia_clinica')
      .select(`
        paciente:profiles!historia_clinica_paciente_id_fkey(
          id,
          nombre,
          apellido,
          email,
          dni,
          imagen_perfil_1
        )
      `)
      .eq('especialista_id', especialistaId);

    if (error) {
      console.error('Error obteniendo pacientes con historia:', error);
      return { data: null, error };
    }

    // Eliminar duplicados
    const pacientesUnicos = Array.from(
      new Map(
        data
          .filter((item: any) => item.paciente)
          .map((item: any) => [item.paciente.id, item.paciente])
      ).values()
    );

    return { data: pacientesUnicos, error: null };
  } catch (error) {
    console.error('Error en getPacientesConHistoriaClinica:', error);
    return { data: null, error };
  }
}

/**
 * Verificar si un especialista ha atendido al menos una vez a un paciente
 */
async especialistaAtendio(especialistaId: string, pacienteId: string): Promise<boolean> {
  try {
    const { data, error } = await this.supabase
      .from('historia_clinica')
      .select('id')
      .eq('especialista_id', especialistaId)
      .eq('paciente_id', pacienteId)
      .limit(1);

    if (error) {
      console.error('Error verificando atención:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error en especialistaAtendio:', error);
    return false;
  }
}

/**
 * Obtener una entrada específica de historia clínica por ID
 */
async getHistoriaClinicaById(id: number): Promise<{ data: HistoriaClinicaDetalle | null, error: any }> {
  try {
    const { data, error } = await this.supabase
      .from('historia_clinica')
      .select(`
        *,
        paciente:profiles!historia_clinica_paciente_id_fkey(
          nombre,
          apellido,
          email,
          dni,
          imagen_perfil_1
        ),
        especialista:profiles!historia_clinica_especialista_id_fkey(
          nombre,
          apellido
        ),
        turno:turnos(
          especialidad:especialidades(nombre)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error obteniendo historia clínica por ID:', error);
      return { data: null, error };
    }

    const historiaDetalle: HistoriaClinicaDetalle = {
      ...data,
      paciente_nombre: data.paciente?.nombre,
      paciente_apellido: data.paciente?.apellido,
      paciente_email: data.paciente?.email,
      paciente_dni: data.paciente?.dni,
      paciente_imagen: data.paciente?.imagen_perfil_1,
      especialista_nombre: data.especialista?.nombre,
      especialista_apellido: data.especialista?.apellido,
      especialidad_nombre: data.turno?.especialidad?.nombre
    };

    return { data: historiaDetalle, error: null };
  } catch (error) {
    console.error('Error en getHistoriaClinicaById:', error);
    return { data: null, error };
  }
}



async getUser() {
  try {
    const res: any = await this.supabase.auth.getUser();
    return res; 
  } catch (err) {
    return null;
  }
}


  async getTurnosRealizadosPaciente(pacienteId: string, especialidadId?: number) {
    let query = this.supabase
      .from('turnos')
      .select(`
        *,
        especialista:especialista_id(nombre, apellido),
        especialidad:especialidad_id(nombre)
      `)
      .eq('paciente_id', pacienteId)
      .eq('estado', 'realizado')
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false });

    if (especialidadId) {
      query = query.eq('especialidad_id', especialidadId);
    }

    const { data, error } = await query;

    return { data: data || [], error };
  }


  //logeos

  async logLogin(userId: string, email?: string, role?: string, ip?: string, userAgent?: string) {
    const payload: any = {
      user_id: userId,
      logged_at: new Date().toISOString()
    }

    if(email) payload.email = email;
    if(role) payload.role = role;
    if(ip) payload.ip_address = ip;
    if(userAgent) payload.user_agent = userAgent;

    const { data, error} = await this.supabase.from('login_logs').insert(payload)

    return { data, error };
  }

  async getLoginLogs(opts?: {start?: string; end?: string; limit?: number; offset?: number}) {
    const start = opts?.start;
    const end = opts?.end;
    const limit = opts?.limit ?? 100;
    const offset = opts?.offset ?? 0;

    let q = this.supabase
    .from('login_logs')
    .select('id, user_id, email, role, ip_address, user_agent, logged_at')
    .order('logged_at', { ascending: false });

    if(start) q = q.gte('logged_at', start);
    if(end) q = q.lte('logged_at', end);
    
    q = q.range(offset, offset + limit -1);
    const { data, error } = await q;
    return { data, error };
  }




}
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { createClient, SupabaseClient, User} from '@supabase/supabase-js'
import { BehaviorSubject, Observable } from 'rxjs';


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
  private currentUserSubject: BehaviorSubject <User | null>;
  public currentUser: Observable <User | null>;

  constructor(){
  this.supabase = createClient(
    environment.supabaseUrl,
    environment.supabaseKey
  );

  this.currentUserSubject = new BehaviorSubject<User | null> (null);
  this.currentUser = this.currentUserSubject.asObservable();

  this.checkUser();

  this.supabase.auth.onAuthStateChange((event, session) => {
    this.currentUserSubject.next(session?.user || null);
  })
  }

  private async checkUser(){
    const {data: { session }} = await this.supabase.auth.getSession();
    this.currentUserSubject.next(session?.user || null);
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  async signUp(email: string, password: string) {
    return await this.supabase.auth.signUp({ email, password});
  }

  async signIn(email: string, password: string){
    return await this.supabase.auth.signInWithPassword({ email, password});
  }

  async signOut(){
    return await this.supabase.auth.signOut();
    }

    async getProfile(userId: string): Promise <UserProfile | null> {
      const {data, error} = await this.supabase.from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

      return data;
    }

    async getAllProfiles(): Promise<UserProfile[]> {
      const { data, error } = await this.supabase.from('profiles')
      .select('*')
      .order('created_at', { ascending: false});

      return data || [];

    }

    async createProfile(profile: Partial <UserProfile>) {
      const { data, error } = await this.supabase.from('profiles')
      .insert(profile)
      .select()
      .single();

      return {data, error};
    }

    async updateProfile(userId: string, updates: Partial <UserProfile>) {
      const { data, error} = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

      return { data, error};
    }

    async approveSpecialist(userId: string) {
      return await this.updateProfile(userId, { approved: true});
    }


    async getEspecialidades(): Promise<Especialidad[]> {
      const {data, error} = await this.supabase
      .from('especialidades')
      .select('*')
      .order('nombre')

      return data || [];
    }

    async addEspecialidad(nombre: string) {
      const { data, error } = await this.supabase.from('especialidades')
      .insert ({ nombre })
      .select()
      .single();

      return {data , error};
    }

    async uploadImage(file: File, userId: string, imageNumber: number = 1): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/imagen_${imageNumber}.${fileExt}`;

  const { data, error } = await this.supabase.storage
    .from('profile-images') 
    .upload(fileName, file, { upsert: true });

  if (error) {
    console.error('Error uploading image: ', error);
    return null;
  }

  const { data: { publicUrl } } = this.supabase.storage
    .from('profile-images') 
    .getPublicUrl(fileName);

  return publicUrl;
}

    async deleteImage(userId: string, imageNumber: number = 1 ) { 
      const {data , error } = await this.supabase.storage
      .from('profiles-images')
      .remove([`${userId}/imagen_${imageNumber}`]);
      
      return {data, error};
    }


    async deleteUser (userId: string) {
      return await this.supabase.auth.admin.deleteUser(userId);
    }

    async getTurnosPaciente(pacienteId: string){
      const { data, error} = await this.supabase
      .from('turnos')
      .select(`*, especialista:especialista_id(nombre, apellido, imagen_perfil_1),
      paciente:paciente_id(nombre, apellido, imagen_perfil_1`)
      .eq('paciente_id', pacienteId)
      .order('fecha', {ascending: false});

      return { data, error}
    }

    async getTurnosEspecialista(especialistaId: string){
      const {data, error} = await this.supabase
      .from('turnos')
      .select(`*, especialista:especialista_id(nombre, apellido, imagen_perfil_1),
        paciente:paciente_id(nombre, apellido, imagen_perfil_1, obra_social)`)
        .eq('especialista_id', especialistaId)
        .order('fecha', {ascending: false})

        return {data, error};
    }
    
    async getTodosLosTurnos(){
      const {data, error} = await this.supabase
      .from('turnos')
        .select(`*,
          especialista:especialista_id(nombre, apellido, imagen_perfil_1),
          paciente:paciente_id(nombre, apellido, imagen_perfil_1)`)
        .order('fecha', {ascending: false});

        return {data, error};
      
    }

    async crearTurno(turnoData: any){
      const {data, error} = await this.supabase
      .from('turnos')
      .insert(turnoData)
      .select()
      .single();

      return { data, error};
    }

    async actualizarTurno(turnoId: number, updates: any){
      const {data, error} = await this.supabase
      .from('turnos')
      .update(updates)
      .eq('id', turnoId)
      .select()
      .single();

      return {data , error};
    }

    async cancelarTurno(turnoId: number, comentario: string){
      const {data, error} = await this.supabase
      .from('turnos')
      .update({
        estado: 'candelado',
        comentario_cancelacion: comentario,
        fecha_cancelacion: new Date().toISOString()
      })
      .eq('id', turnoId)
      .select()
      .single();

      return {data, error}
    }

    async rechazarTurno(turnoId: number, comentario: string){
      const { data, error } = await this.supabase
      .from('turnos')
      .update({
        estado: 'rechazado',
        comentario_rechazo: comentario,
        fecha_rechazo: new Date().toISOString()
      })

      .eq('id', turnoId)
      .select()
      .single();

      return {data , error }
    }

    async aceptarTurno(turnoId: number){
      const {data, error} = await this.supabase
      .from('turnos')
      .update({
        estado: 'aceptado',
        fecha_aceptacion: new Date().toISOString()
      })
      .eq('id', turnoId)
      .select()
      .single();

      return {data, error};
    }

    async finalizarTurno(turnoId: number, reseña: string){
      const { data, error} = await this.supabase
      .from('turnos')
      .update({
        estado: 'realizado',
        reseña_especialista: reseña,
        fecha_realizacion: new Date().toISOString()
      })
      .eq('id', turnoId)
      .select()
      .single();

      return { data, error};
    }

    async calificarAtencion(turnoId: number, calificacion: number, comentario: string){
      const {data, error} = await this.supabase
      .from('turnos')
      .update({
        calificacion_atencion: calificacion,
        comentario_calificacion: comentario
      })
      .eq('id', turnoId)
      .select()
      .single();

      return { data, error};
    }

    async completarEncuesta(turnoId: number, pacienteId: string, encuestaData: any){
      const {data: encuesta, error: encuestaError} = await this.supabase
      .from('encuestas')
      .insert({
        turnoId: turnoId,
        paciente_id: pacienteId,
        ...encuestaData
      })
      .select()
      .single();

      if(encuestaError) return { data: null, error: encuestaError};

      const { data, error} = await this.supabase
      .from('turnos')
      .update({encuesta_completada: true})
      .eq('id', turnoId)
      .select()
      .single();

      return {data ,  error}
    }

    async getHorariosEspecialista(especialistaId: string){
      const { data, error} = await this.supabase
      .from('horarios_especialista')
      .select('*')
      .eq('especialista_id', especialistaId)
      .order('especialidad')
      .order('dia_semana')

      return {data, error};
    }

    async crearHorario(horarioData: any){
      const {data, error} = await this.supabase
      .from('horarios_especialista')
      .insert(horarioData)
      .select()
      .single();

      return { data, error};
    }

    async eliminarHorario(horarioId: number){
      const {data ,error} = await this.supabase
      .from('horarios_especialista')
      .delete()
      .eq('id', horarioId)
    }

    async getHorariosDisponibles(especialistaId: string, especialidad: string, fecha: string){
      const diaSemana = new Date(fecha).getDay();

      const {data: horarios, error} = await this.supabase
      .from('horarios_especialista')
      .select('*')
      .eq('especialista_id', especialistaId)
      .eq('especialidad', especialidad)
      .eq('dia_semana', diaSemana);

      if(error || !horarios) return {data: [], error};

      const {data: turnosTomados} = await this.supabase
      .from('turnos')
      .select('hora')
      .eq('especialista_id', especialistaId)
      .eq('fecha', fecha)
      .neq('estado', 'cancelado')
      .neq('estado', 'rechazado');

      const horariosDisponibles: string[] = [];
      horarios.forEach(horario => {
        const inicio = horario.hora_inicio;
        const fin = horario.hora_fin;
        const duracion = horario.duracion_turno;

        let current = inicio;
        while( current < fin) {
          const ocupado = turnosTomados?.some(t => t.hora === current);
          if (!ocupado){
            horariosDisponibles.push(current);
          }

          const [horas, minutos] = current.split(':').map(Number);
          const totalMinutes = horas * 60 + minutos + duracion;
          const newH = Math.floor(totalMinutes / 60);
          const newM = totalMinutes % 60;
          current = `${String(newH).padStart(2, '0')}: ${String(newM).padStart(2,'0')}`;
        }
      })
      return { data: horariosDisponibles, error: null};
    }

    async getPacientesAtendidos (especialistaId: string){
      const {data, error} = await this.supabase
      .from('turnos')
      .select(`paciente_id, fecha, especialidad, paciente:paciente_id(nombre, apellido, dni, imagen_perfil_1)`)
      .eq('especialista_id', especialistaId)
      .eq('estado', 'realizado')
      .order('fecha', {ascending: false})

      if(error) return {data: [], error};

      const pacientesMap = new Map();

      data.forEach((turno: any) => {
        if(!pacientesMap.has(turno.paciente_id)){
          pacientesMap.set(turno.paciente_id, {
            ...turno.paciente,
            id: turno.paciente_id,
            turnos: []
          })
        }
        if(pacientesMap.get(turno.paciente_id).turnos.length < 3){
          pacientesMap.get(turno.paciente_id).turnos.push({
            fecha: turno.fecha,
            especialidad: turno.especialidad
          })
        }
      })

      return { data: Array.from(pacientesMap.values()), error: null}
    }





























}

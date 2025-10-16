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






























}

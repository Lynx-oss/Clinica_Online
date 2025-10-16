import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import Swal  from 'sweetalert2';
import { SupabaseService } from '../../services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email = '';
  password = '';
  loading = false;

  constructor(private router: Router, private supabaseService: SupabaseService){}

  async login() {
    if(this.email === '' || this.password === ''){
      Swal.fire({
        icon: 'warning',
        title: 'Campos vacios',
        text: 'Por favor, completa todos los campos antes de iniciar sesion.'
      })
      return;
    }
      this.loading = true;

      try {
        const { data: authData, error: authError} = await this.supabaseService.signIn(
          this.email,
          this.password
        );

        if (authError) throw authError;

        const profile = await this.supabaseService.getProfile(authData.user!.id);

        if(!profile) {
          Swal.fire({
            icon: 'error',
            title: 'Perfil no encontrado',
            text: 'Por favor, completa tu registro.'
          });
          await this.supabaseService.signOut;
          return;
        }

        if(profile.role === 'especialista') {
          if(!profile.approved) {
            Swal.fire({
              icon: 'warning',
              title: 'Cuenta pendiente de aprobacion',
              text: ' Tu cuenta como especialista esta pendiente de aprobacion por un administrador',
              confirmButtonColor: '#0077b6'
            });
            await this.supabaseService.signOut();
            return;
          }
        }


        if(!authData.user?.email_confirmed_at) {
          Swal.fire({
            icon: 'warning',
            title: 'email no verificado',
            text: 'porfavor verifica tu email antes de iniciar sesion.',
            confirmButtonColor: '#0077b6'
          });
          await this.supabaseService.signOut();
          return;
        }
        Swal.fire({
          icon: 'success',
          title: 'Bienvenido',
          text: `Hola ${profile.nombre} ${profile.apellido}`,
          timer: 2000,
          showConfirmButton: false
        })


        if(profile.role === 'admin') {
          this.router.navigate(['/usuarios']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      } catch (error: any) {
        console.error('error en login: ', error);

        Swal.fire({
          icon: 'error',
          title: 'error al iniciar sesion',
          text: error.message === 'invalid login credentials'
          ? 'Email o contraseña incorrectos'
          : 'Ocurrio un error. Por favor intenta de nuevo',
          confirmButtonColor: '#0077b6'
        });
      } finally {
        this.loading = false;
      }
    }

    async quickLogin(role: 'paciente' | 'especialista' | 'admin') {
      const testUsers = {
        admin: {email: 'admin@clinica.com', password: 'admin123'},
        paciente: {email: 'paciente@test.com', password: 'paciente123'},
        especialista: { email: 'especialista@test.com', password: 'especialista123'}
      };

      this.email = testUsers[role]. email;
      this.password = testUsers[role].password;
      await this.login();
    }


  }


  
  



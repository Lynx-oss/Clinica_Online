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

    usuariosRapidos = [
    { 
      email: 'paciente1@test.com', 
      password: 'paciente123', 
      imagen: 'assets/paciente1.jpg', 
      nombre: 'Juan Pérez', 
      rol: 'Paciente' 
    },
    { 
      email: 'paciente2@test.com', 
      password: 'paciente123', 
      imagen: 'assets/paciente2.jpg', 
      nombre: 'María García', 
      rol: 'Paciente' 
    },
    { 
      email: 'paciente3@test.com', 
      password: 'paciente123', 
      imagen: 'assets/paciente3.jpg', 
      nombre: 'Carlos López', 
      rol: 'Paciente' 
    },
    { 
      email: 'especialista1@test.com', 
      password: 'especialista123', 
      imagen: 'assets/especialista1.jpg', 
      nombre: 'Dr. Martínez', 
      rol: 'Especialista' 
    },
    { 
      email: 'especialista2@test.com', 
      password: 'especialista123', 
      imagen: 'assets/especialista2.jpg', 
      nombre: 'Dra. Rodríguez', 
      rol: 'Especialista' 
    },
    { 
      email: 'admin@clinica.com', 
      password: 'admin123', 
      imagen: 'assets/admin.jpg', 
      nombre: 'Administrador', 
      rol: 'Admin' 
    }
  ];

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
        if (!authData?.user) throw new Error('No se obtuvo user del auth');




        const profile = await this.supabaseService.getProfile(authData.user!.id);

        if(!profile) {
          Swal.fire({
            icon: 'error',
            title: 'Perfil no encontrado',
            text: 'Por favor, completa tu registro.'
          });
          await this.supabaseService.signOut();
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

         const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
        const user = authData.user!;
        await this.supabaseService.registrarLogin(user.id, user.email ?? '');
        Swal.fire({
          icon: 'success',
          title: 'Bienvenido',
          text: `Hola ${profile.nombre} ${profile.apellido}`,
          timer: 2000,
          showConfirmButton: false
        })

        this.router.navigate(['/home'])


        
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

    loginRapido (usuario: any) {
      this.email = usuario.email;
      this.password = usuario.password;
      this.login();
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


  
  



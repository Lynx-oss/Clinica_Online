import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { SupabaseService, UserProfile } from '../../services/supabase.service';
import { Registro } from '../registro/registro';
@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, Registro ], 
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css'
})
export class UsuariosComponent implements OnInit {
  usuarios: UserProfile[] = [];
  usuariosFiltrados: UserProfile[] = [];
  loading = true;
  currentUser: UserProfile | null = null;
  

  filtroRole: string = 'todos';
  filtroBusqueda: string = '';
  
  
  mostrarModalCrear = false; 

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.verificarAdmin();
    await this.cargarUsuarios();
  }

  async verificarAdmin() {
    const user = this.supabaseService.currentUserValue;
    if (user) {
      this.currentUser = await this.supabaseService.getProfile(user.id);
      if (this.currentUser?.role !== 'admin') {
        Swal.fire({
          icon: 'error',
          title: 'Acceso denegado',
          text: 'Solo los administradores pueden acceder a esta sección',
          confirmButtonColor: '#0077b6'
        });
        this.router.navigate(['/home']);
      }
    }
  }

  async cargarUsuarios() {
    this.loading = true;
    try {
      this.usuarios = await this.supabaseService.getAllProfiles();
      this.aplicarFiltros();
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      this.loading = false;
    }
  }

  aplicarFiltros() {
    let resultado = [...this.usuarios];

    if (this.filtroRole !== 'todos') {
      resultado = resultado.filter(u => u.role === this.filtroRole);
    }

    if (this.filtroBusqueda) {
      const busqueda = this.filtroBusqueda.toLowerCase();
      resultado = resultado.filter(u =>
        u.nombre.toLowerCase().includes(busqueda) ||
        u.apellido.toLowerCase().includes(busqueda) ||
        u.email.toLowerCase().includes(busqueda) ||
        u.dni.includes(busqueda)
      );
    }

    this.usuariosFiltrados = resultado;
  }

  async toggleAprobacion(usuario: UserProfile) {
    const accion = usuario.approved ? 'deshabilitar' : 'habilitar';
    
    const result = await Swal.fire({
      title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} usuario?`,
      text: `¿Estás seguro de ${accion} a ${usuario.nombre} ${usuario.apellido}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: usuario.approved ? '#dc2626' : '#16a34a',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await this.supabaseService.updateProfile(usuario.id, {
          approved: !usuario.approved
        });

        Swal.fire({
          icon: 'success',
          title: `Usuario ${accion}do`,
          timer: 2000,
          showConfirmButton: false
        });

        await this.cargarUsuarios();
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo actualizar el usuario',
          confirmButtonColor: '#0077b6'
        });
      }
    }
  }

  async eliminarUsuario(usuario: UserProfile) {
    const result = await Swal.fire({
      title: '¿Eliminar usuario?',
      html: `¿Estás seguro de eliminar a <strong>${usuario.nombre} ${usuario.apellido}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await this.supabaseService.deleteUser(usuario.id);

        Swal.fire({
          icon: 'success',
          title: 'Usuario eliminado',
          timer: 2000,
          showConfirmButton: false
        });

        await this.cargarUsuarios();
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo eliminar el usuario',
          confirmButtonColor: '#0077b6'
        });
      }
    }
  }

  abrirModalCrear() {
    this.mostrarModalCrear = true;
  }

  cerrarModalCrear() {
    this.mostrarModalCrear = false;
  }

  async onRegistroExitoso() {
    this.cerrarModalCrear();
    await this.cargarUsuarios();
  }

  volverAlHome() {
    this.router.navigate(['/home']);
  }

  getRoleBadgeClass(role: string): string {
    return `role-badge role-${role}`;
  }

  getApprovedBadgeClass(approved: boolean): string {
    return approved ? 'approved-badge' : 'pending-badge';
  }
}




























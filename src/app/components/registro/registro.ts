import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-registro',
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class Registro {
  registroForm!: FormGroup;
  tipoUsuario: 'paciente' | 'especialista' | 'admin' = 'paciente';

  imagen1: File | null = null;
  imagen1Preview: File | null = null;
  imagen2: File | null = null;
  imagen2Preview: File | null = null;

  especialidades: any[] = [];
  obrasSociales = [
    'OSDE',
    'Swiss Medical',
    'Galeno',
    'Medicus',
    'Accord Salud',
    'Sancor Salud',
    'Omint',
    'Medife',
    'Ninguna'
  ]

  loading = false;
  mostrarNuevaEspecialidad = false;


  constructor(private router: Router, private supabaseService: SupabaseService, private fb: FormBuilder){}

  ngOnInit(){
    this.inicializarForm();
    this.cargarEspecialidades();
  }

  inicializarForm() {
    this.registroForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      edad: ['', [Validators.required, Validators.min(18), Validators.max(120)]],
      dni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],

      obraSocial: [''],
      especialidadSeleccionada: [''],
      nuevaEspecialidad: ['']
    },{
      validators: this.passwordsMatchValidator
    })
    this.actualizarvalidadores();
  }

  passwordsMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    return password === confirmPassword ? null : { passwordMismatch: true}
  }

  cambiarTipo(tipo: 'paciente' | 'especialista' | 'admin'){
    this.tipoUsuario = tipo;
    this.limpiarCamposEspecificios();
    this.actualizarvalidadores();
  }

  actualizarvalidadores() {
    const obraSocialControl = this.registroForm.get('obraSocial');
    const especialidadControl = this.registroForm.get('especialidadSeleccionada');

    obraSocialControl?.clearValidators();
    especialidadControl?.clearValidators();

    if(this.tipoUsuario === 'paciente') {
      obraSocialControl?.setValidators([Validators.required]);
    } else if (this.tipoUsuario === 'especialista'){
      especialidadControl?.setValidators([Validators.required]);
    }

    obraSocialControl?.updateValueAndValidity();
    especialidadControl?.updateValueAndValidity();
  }

  limpiarCamposEspecificios(){
    this.registroForm.patchValue({
      obraSocial: '',
      especialidadSeleccionada: '',
      nuevaEspecialidad: ''
    });
    this.imagen2 = null;
    this.imagen2Preview = null;
  }

  async cargarEspecialidades(){
    this.especialidades = await this.supabaseService.getEspecialidades();
  }  

  onFileSelected(event: any, numeroImagen: number) {
    const file = event.target.files[0];
    if(!file) return;

    if (file) {
      if (!file.type.startsWith('image/')) {
        Swal.fire({
          icon: 'error',
          title: 'archivo invalido',
          text: 'Por favor selecciona una imagen valida',
          confirmButtonColor: '#0077b6'
        });
        return;
      }

      if(file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: 'error',
          title: 'Archivo muy grande',
          text: 'La imagen debe pesar menos de 5MB',
          confirmButtonColor: '#0077b6'
        })
        return;
      }

      if(numeroImagen === 1) {
        this.imagen1 = file;
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagen1Preview = e.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        this.imagen2 = file;
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagen2Preview = e.target.result;
        }
        reader.readAsDataURL(file);
      }
    }
  }

  validarImagenes(): boolean {
    if(!this.imagen1) {
      Swal.fire({
        icon: 'warning',
        title: 'imagen requerida',
        text: 'tenes que subir una imagen por lo menos',
        confirmButtonColor: '#0077b6'
      })
      return false;
    }

    if(this.tipoUsuario === 'paciente' && !this.imagen2){
      Swal.fire({
        icon: 'warning',
        title: 'Segunda imagen requerida',
        text: 'los pacientes deben subir 2 imagenes de perfil',
        confirmButtonColor: '#0077b6'
      })
      return false;
    }
    return true;
  }

  async registrar() {
    if(this.registroForm.invalid) {
      Object.keys(this.registroForm.controls).forEach(key => {
        const control = this.registroForm.get(key);
        if(control?.invalid){
          control.markAsTouched();
        }
      });
      Swal.fire({
        icon:'warning',
        title: 'formulario incompleto',
        text: 'Por favor completa todos los campos',
        confirmButtonColor: '#0077b6'
      })
      return;
    }

    if(!this.validarImagenes()) return;

    if(this.tipoUsuario === 'especialista'){
      const especialidadSel = this.registroForm.get('especialidadSeleccionada')?.value;
      const nuevaEsp = this.registroForm.get('nuevaEspecialidad')?.value;

      if(!especialidadSel && !nuevaEsp){
        Swal.fire({
          icon: 'warning',
          title: 'especialidad requerida',
          text: 'porfavor selecciona o agrega una especialidad',
          confirmButtonColor: '#0077b6'
        });
        return;
      }
    }
    this.loading = true;

    
    try {
      const formValue = this.registroForm.value;

      const { data: authData, error: authError } = await this.supabaseService.signUp(
        formValue.email,
        formValue.password
      );

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      const userId = authData.user.id;

      let especialidadFinal = formValue.especialidadSeleccionada;
      if(this.tipoUsuario === 'especialista' && formValue.nuevaEspecialidad) {
        const { data: nuevaEsp } = await this.supabaseService.addEspecialidad(formValue.nuevaEspecialidad)
        if(nuevaEsp) {
          especialidadFinal = nuevaEsp.nombre;
        } 
      }

      const imagen1Url = await this.supabaseService.uploadImage(this.imagen1!, userId, 1);
      let imagen2Url = null;
      if(this.imagen2 && this.tipoUsuario === 'paciente') {
        imagen2Url = await this.supabaseService.uploadImage(this.imagen2, userId, 2);
      }
    
      const profileData: any = {
        id: userId,
        email: formValue.email,
        role: this.tipoUsuario,
        nombre: formValue.nombre,
        apellido: formValue.apellido,
        edad: parseInt(formValue.edad),
        dni: formValue.dni,
        imagen_perfil_1: imagen1Url,
        approved: this.tipoUsuario === 'admin' || this.tipoUsuario === 'paciente'
      }

      if(this.tipoUsuario === 'paciente') {
        profileData.obra_social = formValue.obraSocial;
        profileData.imagen_perfil_2 = imagen2Url;
      } else if (this.tipoUsuario === 'especialista'){
        profileData.especialidad = especialidadFinal;
      }

      const { error: profileError } = await this.supabaseService.createProfile(profileData);
      if(profileError) throw profileError;

      await Swal.fire({
        icon: 'success',
        title: 'Registro Existoso',
        html: this.tipoUsuario === 'especialista'
        ? 'tu cuenta ha sido creada, un administrador debe aprobarla antes de que puedas ingresar '
        : 'tu cuenta a sido creada exitosamente.',
        confirmButtonColor: '#0077b6'
      })

      await this.supabaseService.signOut();
      this.router.navigate(['/login']

      )

      

  } catch (error: any) {
      console.error('Error en registro:', error);
      
      let mensajeError = 'Ocurrió un error durante el registro';
      
      if (error.message?.includes('already registered')) {
        mensajeError = 'Este email ya está registrado';
      } else if (error.message?.includes('duplicate key')) {
        mensajeError = 'Este DNI ya está registrado';
      }

      Swal.fire({
        icon: 'error',
        title: 'Error en el registro',
        text: mensajeError,
        confirmButtonColor: '#0077b6'
      });
    } finally {
      this.loading = false;
    }
  }

   toggleNuevaEspecialidad() {
    this.mostrarNuevaEspecialidad = !this.mostrarNuevaEspecialidad;
    if (this.mostrarNuevaEspecialidad) {
      this.registroForm.patchValue({ especialidadSeleccionada: '' });
      this.registroForm.get('especialidadSeleccionada')?.clearValidators();
      this.registroForm.get('nuevaEspecialidad')?.setValidators([Validators.required]);
    } else {
      this.registroForm.patchValue({ nuevaEspecialidad: '' });
      this.registroForm.get('nuevaEspecialidad')?.clearValidators();
      this.registroForm.get('especialidadSeleccionada')?.setValidators([Validators.required]);
    }
    this.registroForm.get('especialidadSeleccionada')?.updateValueAndValidity();
    this.registroForm.get('nuevaEspecialidad')?.updateValueAndValidity();
  }


  hasError(field: string, error?: string): boolean {
  const control = this.registroForm.get(field);
  if (!control) return false;
  
  if (error) {
    return !!(control.hasError(error) && control.touched);
  }
  
  return !!(control.invalid && control.touched);
}

getErrorMessage(field: string): string {
  const control = this.registroForm.get(field);
  if (!control?.errors || !control.touched) return '';

  const errors = control.errors;

  if (errors['required']) return 'Este campo es obligatorio';
  if (errors['email']) return 'Email inválido';
  if (errors['minlength']) {
    return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
  }
  if (errors['min']) return `Mínimo ${errors['min'].min}`;
  if (errors['max']) return `Máximo ${errors['max'].max}`;
  if (errors['pattern']) return 'Formato inválido';
  
  return '';
}

 



  volver(){
    this.router.navigate(['/login'])
  }


  
}

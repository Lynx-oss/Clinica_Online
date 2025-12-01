import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';


export const routes: Routes = [
    {path: '', redirectTo: 'login', pathMatch: 'full' },
    {path: 'login', loadComponent: () => import('./components/login/login').then(m => m.Login) },
    {path: 'registro', loadComponent: () => import('./components/registro/registro').then(m => m.Registro) },
    {path: 'home', loadComponent: () => import('./components/home/home').then(m => m.Home), canActivate: [authGuard] },
    {path: 'usuarios', loadComponent: () => import('./components/usuarios/usuarios').then(m  => m.UsuariosComponent), canActivate: [authGuard]},
    {path: 'solicitar-turno', loadComponent: () => import('./components/solicitar-turno/solicitar-turno').then(m =>m.SolicitarTurno), canActivate: [authGuard]},
    { path: 'mis-turnos', loadComponent: () => import('./components/mis-turnos/mis-turnos').then(m => m.MisTurnos), canActivate: [authGuard] } ,
    { path: 'turnos-especialista', loadComponent: () => import('./components/turnos-especialista/turnos-especialista').then(m => m.TurnosEspecialista), canActivate: [authGuard] },
    { path: 'turnos-administrador', loadComponent: () => import('./components/turnos-administrador/turnos-administrador').then(m => m.TurnosAdministradorComponent), canActivate: [authGuard] },
    { path: 'pacientes-especialista', loadComponent: () => import('./components/pacientes-especialista/pacientes-especialista').then(m => m.PacientesEspecialistaComponent), canActivate: [authGuard] },
    { path: 'historia-clinica', loadComponent: () => import('./components/historia-clinica/historia-clinica').then(m => m.HistoriaClinica), canActivate: [authGuard] },
    { path: 'historia-clinica-paciente/:id', loadComponent: () => import('./components/historia-clinica-paciente/historia-clinica-paciente').then(m => m.HistoriaClinicaPaciente), canActivate: [authGuard] },
    { path: 'admin-dashboard', loadComponent: () => import('./components/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard), canActivate: [authGuard] },
];

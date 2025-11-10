import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
    {path: '', redirectTo: 'login', pathMatch: 'full' },
    {path: 'login', loadComponent: () => import('./components/login/login').then(m => m.Login) },
    {path: 'registro', loadComponent: () => import('./components/registro/registro').then(m => m.Registro) },
    {path: 'home', loadComponent: () => import('./components/home/home').then(m => m.Home), canActivate: [authGuard] },
    {path: 'usuarios', loadComponent: () => import('./components/usuarios/usuarios').then(m  => m.UsuariosComponent), canActivate: [authGuard]},
    {path: 'solicitar-turno', loadComponent: () => import('./components/solicitar-turno/solicitar-turno').then(m =>m.SolicitarTurno), canActivate: [authGuard]},
    { path: 'mis-turnos', loadComponent: () => import('./components/mis-turnos/mis-turnos').then(m => m.MisTurnos), canActivate: [authGuard] } 

];

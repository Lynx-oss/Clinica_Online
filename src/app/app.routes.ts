import { Routes } from '@angular/router';

export const routes: Routes = [
    {path: '', redirectTo: 'login', pathMatch: 'full' },
    {path: 'login', loadComponent: () => import('./components/login/login').then(m => m.Login) },
    {path: 'registro', loadComponent: () => import('./components/registro/registro').then(m => m.Registro) },
    {path: 'home', loadComponent: () => import('./components/home/home').then(m => m.Home) },
];

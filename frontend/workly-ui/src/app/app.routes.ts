import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'signup',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/auth/signup/signup').then((m) => m.Signup),
  },
  {
    path: 'accept-invitation',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/accept-invitation/accept-invitation')
        .then((m) => m.AcceptInvitation),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'members',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/members/members')
        .then((m) => m.Members),
  },
  {
    path: 'teams',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/teams/teams').then(
        (m) => m.Teams
      ),
  },

  {
    path: 'teams/:teamId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/teams/team-detail').then(
        (m) => m.TeamDetail
      ),
  },

  {
    path: '**',
    redirectTo: '',
  },
];
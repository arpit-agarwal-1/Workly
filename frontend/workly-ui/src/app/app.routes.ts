import { Routes } from '@angular/router';
import { Login } from './pages/auth/login';
import { Signup } from './pages/auth/signup';
import { Dashboard } from './pages/dashboard/dashboard';
import { Home } from './pages/home/home';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'Workly | Better Together',
  },
  {
    path: 'login',
    component: Login,
    title: 'Sign in | Workly',
  },
  {
    path: 'signup',
    component: Signup,
    title: 'Get started | Workly',
  },
  {
    path: 'dashboard',
    component: Dashboard,
    title: 'Dashboard | Workly',
  },
];
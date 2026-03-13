import type { User } from '../types/webertrack';

export const DEMO_USERS: Record<string, User> = {
  promotor_1: {
    id: 'promotor_1',
    name: 'Carlos Mendoza',
    email: 'carlos@webers.mx',
    role: 'PROMOTOR',
    supervisor_id: 'supervisor_1',
  },
  promotor_2: {
    id: 'promotor_2',
    name: 'Ana García',
    email: 'ana@webers.mx',
    role: 'PROMOTOR',
    supervisor_id: 'supervisor_1',
  },
  supervisor_1: {
    id: 'supervisor_1',
    name: 'Roberto Ortiz',
    email: 'roberto@webers.mx',
    role: 'SUPERVISOR',
  },
  superadmin_1: {
    id: 'superadmin_1',
    name: 'Admin Weber',
    email: 'admin@webers.mx',
    role: 'SUPERADMIN',
  },
  auditor_1: {
    id: 'auditor_1',
    name: 'Laura Reyes',
    email: 'laura@webers.mx',
    role: 'AUDITOR',
  },
};

export const DEMO_ROLES: Array<{
  role: User['role'];
  user: User;
  label: string;
  description: string;
}> = [
  {
    role: 'PROMOTOR',
    user: DEMO_USERS.promotor_1,
    label: 'Promotor',
    description: 'Captura pedidos por sucursal',
  },
  {
    role: 'SUPERVISOR',
    user: DEMO_USERS.supervisor_1,
    label: 'Supervisor',
    description: 'Aprueba pedidos y ve el equipo',
  },
  {
    role: 'SUPERADMIN',
    user: DEMO_USERS.superadmin_1,
    label: 'SuperAdmin',
    description: 'Gestiona usuarios y catálogos',
  },
  {
    role: 'AUDITOR',
    user: DEMO_USERS.auditor_1,
    label: 'Auditor',
    description: 'Dashboard global y reportes',
  },
];

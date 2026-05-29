import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';

import Home from '../views/Home.vue';
import Notes from '../views/Notes.vue';
import Chart from '../views/Chart.vue';
import Settings from '../views/Settings.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'editor',
    component: Home,
  },
  {
    path: '/notes',
    name: 'notes',
    component: Notes,
  },
  {
    path: '/chart',
    name: 'chart',
    component: Chart,
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;

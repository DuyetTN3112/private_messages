import { mount } from 'svelte';
import App from './App.svelte';
import './styles.css';

const targetElement = document.getElementById('app');
if (!targetElement) {
  throw new Error('Target element #app not found');
}

const app = mount(App, {
  target: targetElement,
});

export default app;
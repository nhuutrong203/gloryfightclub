import type { APIRoute } from 'astro';
import app from '../../api';

export const ALL: APIRoute = ({ request }) => app.fetch(request);

// API layer — TrustRoute backend base URL.
//
// Base URL comes from the environment variable VITE_API_URL
// (see .env.production / .env.example). If it's unset, requests go to the
// same origin (the Vite dev proxy handles /api in local development).

export const API_BASE = import.meta.env.VITE_API_URL ?? "";
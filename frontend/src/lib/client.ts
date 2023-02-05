import { PaasterClient } from './client/PaasterClient';

export const paasterClient = new PaasterClient(
    {
        BASE: import.meta.env.VITE_API_URL
    }
)

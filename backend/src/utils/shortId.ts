import { customAlphabet } from 'nanoid';

const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
export const generateShortId = customAlphabet(alphabet, 6);

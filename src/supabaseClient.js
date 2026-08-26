import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Не бросаем ошибку, чтобы приложение не падало полностью, если ключи
  // ещё не настроены — экран входа сам покажет понятное сообщение.
  console.warn(
    'Не заданы VITE_SUPABASE_URL и/или VITE_SUPABASE_ANON_KEY. ' +
      'Добавьте их в переменные окружения Vercel и в .env.local для локальной разработки.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');

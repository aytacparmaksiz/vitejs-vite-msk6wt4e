import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sdytbbgcsgydhaksfbxo.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkeXRiYmdjc2d5ZGhha3NmYnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTAyNzUsImV4cCI6MjA5NzE4NjI3NX0.75XlKVAwN7bilKtIDYcg1lQ83cq6WbdDHzt5oEanssk';

export const supabase = createClient(supabaseUrl, supabaseKey);

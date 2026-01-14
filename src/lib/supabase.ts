import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cbvtxtpzkwcicgoidvps.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidnR4dHB6a3djaWNnb2lkdnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNTk0MDcsImV4cCI6MjA2ODkzNTQwN30.eFhH--g3w2LXBspPpM7NvZPQ2Yx5Vm0WtLvbDm56BVQ';

export const supabase = createClient(supabaseUrl, supabaseKey);

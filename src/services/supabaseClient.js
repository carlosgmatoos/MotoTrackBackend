const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Crea un cliente de Supabase con la URL y la KEY del .env
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = supabase;

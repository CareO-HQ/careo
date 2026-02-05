import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    // We can't query information_schema easily via anon key, 
    // but we can try to insert a dummy row to a field and see if it fails with type error
    const { error } = await supabase.from('notifications').insert({
        organization_id: '00000000-0000-0000-0000-000000000000',
        type: 'test',
        title: 'test',
        message: 'test',
        sender_id: 'not-a-uuid'
    });

    if (error) {
        console.log('Error inserting dummy to sender_id:', error.code, error.message);
    } else {
        console.log('Successfully inserted to sender_id (means it might be text)');
    }

    const { error: err2 } = await supabase.from('notifications').insert({
        organization_id: '00000000-0000-0000-0000-000000000000',
        type: 'test',
        title: 'test',
        message: 'test',
        user_id: 'not-a-uuid'
    });

    if (err2) {
        console.log('Error inserting dummy to user_id:', err2.code, err2.message);
    }
}

main();

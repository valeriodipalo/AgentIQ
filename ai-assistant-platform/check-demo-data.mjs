import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lcflejsnwhvmpkkzkuqp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZmxlanNud2h2bXBra3prdXFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDgwOSwiZXhwIjoyMDgzODc2ODA5fQ._t8oYWikXzR3lu_iTJnnVyD29o4MllTDsQBA2YetJzY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDemoData() {
  console.log('Checking demo data in Supabase database...\n');

  // Query 1: Check demo tenant
  console.log('1. Checking demo tenant (id = 00000000-0000-0000-0000-000000000001):');
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .maybeSingle();

  if (tenantError) {
    console.log('   ERROR:', tenantError.message);
  } else if (tenant) {
    console.log('   FOUND:', JSON.stringify(tenant, null, 2));
  } else {
    console.log('   NOT FOUND');
  }

  // Query 2: Check demo user
  console.log('\n2. Checking demo user (id = 00000000-0000-0000-0000-000000000002):');
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, email, tenant_id')
    .eq('id', '00000000-0000-0000-0000-000000000002')
    .maybeSingle();

  if (userError) {
    console.log('   ERROR:', userError.message);
  } else if (user) {
    console.log('   FOUND:', JSON.stringify(user, null, 2));
  } else {
    console.log('   NOT FOUND');
  }

  // Query 3: Check published chatbots for demo tenant
  console.log('\n3. Checking published chatbots for demo tenant:');
  const { data: chatbots, error: chatbotsError } = await supabase
    .from('chatbots')
    .select('id, name, is_published, tenant_id')
    .eq('tenant_id', '00000000-0000-0000-0000-000000000001')
    .eq('is_published', true);

  if (chatbotsError) {
    console.log('   ERROR:', chatbotsError.message);
  } else if (chatbots && chatbots.length > 0) {
    console.log(`   FOUND ${chatbots.length} published chatbot(s):`);
    chatbots.forEach(bot => {
      console.log(`   - ${bot.name} (id: ${bot.id})`);
    });
  } else {
    console.log('   NOT FOUND (no published chatbots)');
  }

  // Query 4: Check conversations for demo user
  console.log('\n4. Checking conversations for demo user (limit 5):');
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select('id, title, user_id')
    .eq('user_id', '00000000-0000-0000-0000-000000000002')
    .limit(5);

  if (conversationsError) {
    console.log('   ERROR:', conversationsError.message);
  } else if (conversations && conversations.length > 0) {
    console.log(`   FOUND ${conversations.length} conversation(s):`);
    conversations.forEach(conv => {
      console.log(`   - ${conv.title || 'Untitled'} (id: ${conv.id})`);
    });
  } else {
    console.log('   NOT FOUND (no conversations)');
  }

  // Additional check: List all tenants
  console.log('\n5. Listing all tenants in database:');
  const { data: allTenants, error: allTenantsError } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .limit(10);

  if (allTenantsError) {
    console.log('   ERROR:', allTenantsError.message);
  } else if (allTenants && allTenants.length > 0) {
    console.log(`   Found ${allTenants.length} tenant(s):`);
    allTenants.forEach(t => {
      console.log(`   - ${t.name} (slug: ${t.slug}, id: ${t.id})`);
    });
  } else {
    console.log('   NOT FOUND (no tenants)');
  }

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY:');
  console.log('='.repeat(70));
  console.log(`Demo Tenant (00000000-0000-0000-0000-000000000001): ${tenant ? 'EXISTS' : 'MISSING'}`);
  console.log(`Demo User (00000000-0000-0000-0000-000000000002): ${user ? 'EXISTS' : 'MISSING'}`);
  console.log(`Published Chatbots: ${chatbots ? chatbots.length : 0}`);
  console.log(`Conversations: ${conversations ? conversations.length : 0}`);
  console.log('='.repeat(70));
}

checkDemoData().catch(console.error);

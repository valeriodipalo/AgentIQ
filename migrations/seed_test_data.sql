-- Seed Test Data for AI Assistant Platform
-- This script creates sample data for testing and development
-- WARNING: Only run this in development/staging environments!

BEGIN;

-- Check if we're in production (prevent accidental data insertion)
DO $$
BEGIN
    IF current_database() = 'production' OR current_database() LIKE '%prod%' THEN
        RAISE EXCEPTION 'Cannot seed test data in production database!';
    END IF;
    RAISE NOTICE 'Seeding test data in % database...', current_database();
END $$;

-- Clean up existing test data (if any)
DELETE FROM public.usage_metrics WHERE tenant_id IN (
    SELECT id FROM public.tenants WHERE slug LIKE 'test-%'
);
DELETE FROM public.feedback WHERE user_id IN (
    SELECT id FROM public.users WHERE email LIKE 'test-%'
);
DELETE FROM public.messages WHERE conversation_id IN (
    SELECT id FROM public.conversations WHERE tenant_id IN (
        SELECT id FROM public.tenants WHERE slug LIKE 'test-%'
    )
);
DELETE FROM public.conversations WHERE tenant_id IN (
    SELECT id FROM public.tenants WHERE slug LIKE 'test-%'
);
DELETE FROM public.users WHERE email LIKE 'test-%';
DELETE FROM public.tenants WHERE slug LIKE 'test-%';

-- Create test tenants
INSERT INTO public.tenants (id, name, slug, llm_provider, llm_model, temperature, max_tokens, system_prompt, features, rate_limit_per_minute, daily_token_limit, branding, is_active)
VALUES
    ('test-tenant-1'::UUID, 'Acme Corporation', 'test-acme-corp', 'openai', 'gpt-4', 0.7, 2000, 'You are a helpful AI assistant for Acme Corporation.', '{"file_upload": true, "web_search": true, "code_interpreter": true}'::jsonb, 60, 1000000, '{"primary_color": "#FF6B35", "logo_url": "https://example.com/acme-logo.png"}'::jsonb, true),
    ('test-tenant-2'::UUID, 'TechStart Inc', 'test-techstart-inc', 'anthropic', 'claude-3-opus-20240229', 0.5, 4000, 'You are a technical support assistant for TechStart Inc.', '{"file_upload": true, "web_search": false, "code_interpreter": true}'::jsonb, 100, 2000000, '{"primary_color": "#4ECDC4", "logo_url": "https://example.com/techstart-logo.png"}'::jsonb, true),
    ('test-tenant-3'::UUID, 'Global Consulting', 'test-global-consulting', 'openai', 'gpt-3.5-turbo', 0.8, 1500, 'You are a business consultant assistant.', '{"file_upload": false, "web_search": true, "code_interpreter": false}'::jsonb, 50, 500000, '{"primary_color": "#95E1D3", "logo_url": "https://example.com/global-logo.png"}'::jsonb, true);

-- Create test users
INSERT INTO public.users (id, tenant_id, auth_id, email, name, role, preferences, is_active)
VALUES
    -- Acme Corporation users
    ('test-user-1'::UUID, 'test-tenant-1'::UUID, 'auth-test-user-1'::UUID, 'test-john.doe@acme.com', 'John Doe', 'admin', '{"theme": "dark", "notifications": true}'::jsonb, true),
    ('test-user-2'::UUID, 'test-tenant-1'::UUID, 'auth-test-user-2'::UUID, 'test-jane.smith@acme.com', 'Jane Smith', 'user', '{"theme": "light", "notifications": false}'::jsonb, true),
    ('test-user-3'::UUID, 'test-tenant-1'::UUID, 'auth-test-user-3'::UUID, 'test-bob.jones@acme.com', 'Bob Jones', 'user', '{"theme": "dark", "notifications": true}'::jsonb, true),

    -- TechStart Inc users
    ('test-user-4'::UUID, 'test-tenant-2'::UUID, 'auth-test-user-4'::UUID, 'test-alice.wong@techstart.com', 'Alice Wong', 'admin', '{"theme": "light", "notifications": true}'::jsonb, true),
    ('test-user-5'::UUID, 'test-tenant-2'::UUID, 'auth-test-user-5'::UUID, 'test-carlos.garcia@techstart.com', 'Carlos Garcia', 'user', '{"theme": "dark", "notifications": false}'::jsonb, true),

    -- Global Consulting users
    ('test-user-6'::UUID, 'test-tenant-3'::UUID, 'auth-test-user-6'::UUID, 'test-emma.taylor@global.com', 'Emma Taylor', 'admin', '{"theme": "light", "notifications": true}'::jsonb, true);

-- Create test conversations
INSERT INTO public.conversations (id, tenant_id, user_id, title, metadata, is_archived, created_at, updated_at)
VALUES
    -- Acme Corporation conversations
    ('test-conv-1'::UUID, 'test-tenant-1'::UUID, 'test-user-1'::UUID, 'Product Pricing Strategy', '{"tags": ["pricing", "strategy"], "category": "business"}'::jsonb, false, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    ('test-conv-2'::UUID, 'test-tenant-1'::UUID, 'test-user-1'::UUID, 'Q4 Marketing Plan', '{"tags": ["marketing", "quarterly"], "category": "planning"}'::jsonb, false, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
    ('test-conv-3'::UUID, 'test-tenant-1'::UUID, 'test-user-2'::UUID, 'Customer Support Workflow', '{"tags": ["support", "workflow"], "category": "operations"}'::jsonb, false, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    ('test-conv-4'::UUID, 'test-tenant-1'::UUID, 'test-user-3'::UUID, 'Python Data Analysis', '{"tags": ["python", "data"], "category": "technical"}'::jsonb, true, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),

    -- TechStart Inc conversations
    ('test-conv-5'::UUID, 'test-tenant-2'::UUID, 'test-user-4'::UUID, 'API Documentation Review', '{"tags": ["api", "documentation"], "category": "technical"}'::jsonb, false, NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 hour'),
    ('test-conv-6'::UUID, 'test-tenant-2'::UUID, 'test-user-5'::UUID, 'Bug Investigation', '{"tags": ["debugging", "backend"], "category": "support"}'::jsonb, false, NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 minutes'),

    -- Global Consulting conversations
    ('test-conv-7'::UUID, 'test-tenant-3'::UUID, 'test-user-6'::UUID, 'Client Presentation Prep', '{"tags": ["presentation", "client"], "category": "business"}'::jsonb, false, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '1 hour');

-- Create test messages
INSERT INTO public.messages (id, conversation_id, role, content, token_count, model_used, latency_ms, metadata, created_at)
VALUES
    -- Conversation 1 messages
    ('test-msg-1'::UUID, 'test-conv-1'::UUID, 'user', 'I need help developing a pricing strategy for our new product line. Can you guide me through the key factors to consider?', 35, NULL, NULL, '{}'::jsonb, NOW() - INTERVAL '5 days'),
    ('test-msg-2'::UUID, 'test-conv-1'::UUID, 'assistant', 'I''d be happy to help you develop a pricing strategy. Here are the key factors to consider:\n\n1. Cost Analysis\n2. Target Market\n3. Competitor Pricing\n4. Value Proposition\n5. Pricing Models\n\nLet''s start with your cost structure. What are your main cost components?', 180, 'gpt-4', 1250, '{"finish_reason": "stop"}'::jsonb, NOW() - INTERVAL '5 days' + INTERVAL '2 seconds'),
    ('test-msg-3'::UUID, 'test-conv-1'::UUID, 'user', 'Our main costs are manufacturing ($50/unit), distribution ($10/unit), and marketing ($5/unit). Total cost is $65 per unit.', 40, NULL, NULL, '{}'::jsonb, NOW() - INTERVAL '5 days' + INTERVAL '1 minute'),
    ('test-msg-4'::UUID, 'test-conv-1'::UUID, 'assistant', 'Great! With a total cost of $65/unit, we need to determine your target margin. For pricing strategies, consider:\n\n- Cost-plus: $65 + desired margin (e.g., 40% = $91)\n- Value-based: Price based on customer perceived value\n- Competition-based: Match or differentiate from competitors\n\nWhat''s your target profit margin, and what do competitors charge?', 195, 'gpt-4', 1380, '{"finish_reason": "stop"}'::jsonb, NOW() - INTERVAL '5 days' + INTERVAL '1 minute' + INTERVAL '3 seconds'),

    -- Conversation 2 messages
    ('test-msg-5'::UUID, 'test-conv-2'::UUID, 'user', 'Help me create a Q4 marketing plan outline.', 20, NULL, NULL, '{}'::jsonb, NOW() - INTERVAL '3 days'),
    ('test-msg-6'::UUID, 'test-conv-2'::UUID, 'assistant', 'Here''s a comprehensive Q4 marketing plan outline:\n\n## Q4 Marketing Plan\n\n### 1. Executive Summary\n- Objectives\n- Budget\n- Key metrics\n\n### 2. Market Analysis\n- Current position\n- Competitor landscape\n- Opportunities\n\n### 3. Target Audience\n- Demographics\n- Personas\n- Customer journey\n\n### 4. Campaign Strategy\n- Holiday promotions\n- Content calendar\n- Channel mix\n\n### 5. Budget Allocation\n- Digital ads: 40%\n- Content: 25%\n- Events: 20%\n- Other: 15%\n\nWhich section would you like to develop first?', 280, 'gpt-4', 1650, '{"finish_reason": "stop"}'::jsonb, NOW() - INTERVAL '3 days' + INTERVAL '3 seconds'),

    -- Conversation 3 messages
    ('test-msg-7'::UUID, 'test-conv-3'::UUID, 'user', 'What''s the best way to handle customer support tickets efficiently?', 25, NULL, NULL, '{}'::jsonb, NOW() - INTERVAL '2 days'),
    ('test-msg-8'::UUID, 'test-conv-3'::UUID, 'assistant', 'Here''s an efficient customer support workflow:\n\n1. **Ticket Categorization**\n   - Urgent: < 2 hours\n   - High: < 24 hours\n   - Normal: < 48 hours\n   - Low: < 72 hours\n\n2. **First Response**\n   - Acknowledge within 1 hour\n   - Set expectations\n   - Gather information\n\n3. **Resolution Process**\n   - Assign to specialist\n   - Track progress\n   - Follow up\n\n4. **Quality Assurance**\n   - Customer satisfaction survey\n   - Internal review\n   - Continuous improvement\n\nWould you like details on any specific step?', 250, 'gpt-4', 1420, '{"finish_reason": "stop"}'::jsonb, NOW() - INTERVAL '2 days' + INTERVAL '2 seconds'),

    -- Conversation 5 messages
    ('test-msg-9'::UUID, 'test-conv-5'::UUID, 'user', 'Review our API documentation for the /users endpoint and suggest improvements.', 25, NULL, NULL, '{}'::jsonb, NOW() - INTERVAL '4 days'),
    ('test-msg-10'::UUID, 'test-conv-5'::UUID, 'assistant', 'I''ll help review your API documentation. To provide specific suggestions, I''ll need to see the current documentation. However, here are general best practices for /users endpoint documentation:\n\n### Essential Components:\n1. **Endpoint Description**\n2. **HTTP Methods** (GET, POST, PUT, DELETE)\n3. **Authentication Requirements**\n4. **Request Parameters**\n5. **Request Body Examples**\n6. **Response Formats**\n7. **Error Codes**\n8. **Rate Limits**\n\nCould you share your current documentation?', 220, 'claude-3-opus-20240229', 980, '{"finish_reason": "end_turn"}'::jsonb, NOW() - INTERVAL '4 days' + INTERVAL '2 seconds'),

    -- Conversation 6 messages
    ('test-msg-11'::UUID, 'test-conv-6'::UUID, 'user', 'I''m investigating a bug where user sessions expire prematurely. Where should I start?', 30, NULL, NULL, '{}'::jsonb, NOW() - INTERVAL '1 day'),
    ('test-msg-12'::UUID, 'test-conv-6'::UUID, 'assistant', 'Let''s debug this session expiration issue systematically:\n\n### 1. Check Session Configuration\n```javascript\n// Verify session timeout settings\nconsole.log(sessionTimeout);\nconsole.log(sessionRefreshInterval);\n```\n\n### 2. Review Server Logs\n- Look for session creation/destruction events\n- Check for authentication errors\n- Monitor cookie expiration\n\n### 3. Common Causes\n- Clock skew between client/server\n- Cookie domain mismatch\n- CORS issues\n- Token expiration vs session expiration\n\n### 4. Testing Steps\n1. Set session timeout to 1 hour\n2. Monitor actual expiration time\n3. Check browser console for errors\n\nWhat session management system are you using?', 320, 'claude-3-opus-20240229', 1150, '{"finish_reason": "end_turn"}'::jsonb, NOW() - INTERVAL '1 day' + INTERVAL '3 seconds'),

    -- Conversation 7 messages
    ('test-msg-13'::UUID, 'test-conv-7'::UUID, 'user', 'I need to create a compelling presentation for a potential client in the healthcare industry. What should I focus on?', 35, NULL, NULL, '{}'::jsonb, NOW() - INTERVAL '6 hours'),
    ('test-msg-14'::UUID, 'test-conv-7'::UUID, 'assistant', 'For a healthcare industry client presentation, focus on:\n\n### 1. Industry Expertise\n- Relevant case studies\n- Healthcare compliance knowledge (HIPAA, etc.)\n- Understanding of industry challenges\n\n### 2. Value Proposition\n- ROI metrics\n- Cost savings opportunities\n- Efficiency improvements\n\n### 3. Trust Factors\n- Security and compliance\n- References from similar clients\n- Certifications and credentials\n\n### 4. Presentation Structure\n1. Opening: Client''s pain points\n2. Solution: Your approach\n3. Proof: Case studies & results\n4. Process: Implementation plan\n5. Close: Next steps\n\nWhat specific healthcare segment is your client in?', 280, 'gpt-3.5-turbo', 890, '{"finish_reason": "stop"}'::jsonb, NOW() - INTERVAL '6 hours' + INTERVAL '2 seconds');

-- Create test feedback
INSERT INTO public.feedback (id, message_id, user_id, rating, comment, created_at)
VALUES
    ('test-feedback-1'::UUID, 'test-msg-2'::UUID, 'test-user-1'::UUID, 1, 'Very helpful breakdown of pricing factors!', NOW() - INTERVAL '5 days' + INTERVAL '5 minutes'),
    ('test-feedback-2'::UUID, 'test-msg-4'::UUID, 'test-user-1'::UUID, 1, 'Excellent practical examples with numbers.', NOW() - INTERVAL '5 days' + INTERVAL '10 minutes'),
    ('test-feedback-3'::UUID, 'test-msg-6'::UUID, 'test-user-1'::UUID, 1, NULL, NOW() - INTERVAL '3 days' + INTERVAL '1 minute'),
    ('test-feedback-4'::UUID, 'test-msg-8'::UUID, 'test-user-2'::UUID, 1, 'Clear workflow steps, easy to implement.', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes'),
    ('test-feedback-5'::UUID, 'test-msg-10'::UUID, 'test-user-4'::UUID, -1, 'Would prefer more specific examples for our use case.', NOW() - INTERVAL '4 days' + INTERVAL '10 minutes'),
    ('test-feedback-6'::UUID, 'test-msg-12'::UUID, 'test-user-5'::UUID, 1, 'Great debugging approach with code examples!', NOW() - INTERVAL '1 day' + INTERVAL '5 minutes'),
    ('test-feedback-7'::UUID, 'test-msg-14'::UUID, 'test-user-6'::UUID, 1, 'Perfect structure for healthcare presentation.', NOW() - INTERVAL '6 hours' + INTERVAL '3 minutes');

-- Create test usage metrics
INSERT INTO public.usage_metrics (id, tenant_id, user_id, date, total_tokens, prompt_tokens, completion_tokens, request_count, estimated_cost)
VALUES
    -- Acme Corporation usage
    ('test-usage-1'::UUID, 'test-tenant-1'::UUID, 'test-user-1'::UUID, CURRENT_DATE - INTERVAL '7 days', 2500, 1000, 1500, 15, 0.0875),
    ('test-usage-2'::UUID, 'test-tenant-1'::UUID, 'test-user-1'::UUID, CURRENT_DATE - INTERVAL '6 days', 3200, 1200, 2000, 18, 0.1120),
    ('test-usage-3'::UUID, 'test-tenant-1'::UUID, 'test-user-1'::UUID, CURRENT_DATE - INTERVAL '5 days', 1800, 700, 1100, 12, 0.0630),
    ('test-usage-4'::UUID, 'test-tenant-1'::UUID, 'test-user-2'::UUID, CURRENT_DATE - INTERVAL '5 days', 1500, 600, 900, 10, 0.0525),
    ('test-usage-5'::UUID, 'test-tenant-1'::UUID, 'test-user-1'::UUID, CURRENT_DATE - INTERVAL '3 days', 4100, 1600, 2500, 22, 0.1435),
    ('test-usage-6'::UUID, 'test-tenant-1'::UUID, 'test-user-2'::UUID, CURRENT_DATE - INTERVAL '2 days', 2200, 850, 1350, 14, 0.0770),
    ('test-usage-7'::UUID, 'test-tenant-1'::UUID, 'test-user-1'::UUID, CURRENT_DATE, 1200, 450, 750, 8, 0.0420),

    -- TechStart Inc usage
    ('test-usage-8'::UUID, 'test-tenant-2'::UUID, 'test-user-4'::UUID, CURRENT_DATE - INTERVAL '4 days', 3500, 1400, 2100, 20, 0.1225),
    ('test-usage-9'::UUID, 'test-tenant-2'::UUID, 'test-user-5'::UUID, CURRENT_DATE - INTERVAL '1 day', 2800, 1100, 1700, 16, 0.0980),
    ('test-usage-10'::UUID, 'test-tenant-2'::UUID, 'test-user-4'::UUID, CURRENT_DATE, 1900, 750, 1150, 11, 0.0665),

    -- Global Consulting usage
    ('test-usage-11'::UUID, 'test-tenant-3'::UUID, 'test-user-6'::UUID, CURRENT_DATE, 950, 350, 600, 6, 0.0333);

-- Refresh materialized views
REFRESH MATERIALIZED VIEW public.message_feedback_summary;
REFRESH MATERIALIZED VIEW public.monthly_usage_summary;

-- Display summary
DO $$
DECLARE
    tenant_count INTEGER;
    user_count INTEGER;
    conversation_count INTEGER;
    message_count INTEGER;
    feedback_count INTEGER;
    usage_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tenant_count FROM public.tenants WHERE slug LIKE 'test-%';
    SELECT COUNT(*) INTO user_count FROM public.users WHERE email LIKE 'test-%';
    SELECT COUNT(*) INTO conversation_count FROM public.conversations WHERE tenant_id IN (SELECT id FROM public.tenants WHERE slug LIKE 'test-%');
    SELECT COUNT(*) INTO message_count FROM public.messages WHERE conversation_id IN (SELECT id FROM public.conversations WHERE tenant_id IN (SELECT id FROM public.tenants WHERE slug LIKE 'test-%'));
    SELECT COUNT(*) INTO feedback_count FROM public.feedback WHERE message_id IN (SELECT id FROM public.messages WHERE conversation_id IN (SELECT id FROM public.conversations WHERE tenant_id IN (SELECT id FROM public.tenants WHERE slug LIKE 'test-%')));
    SELECT COUNT(*) INTO usage_count FROM public.usage_metrics WHERE tenant_id IN (SELECT id FROM public.tenants WHERE slug LIKE 'test-%');

    RAISE NOTICE '================================================================';
    RAISE NOTICE 'Test Data Seeding Complete!';
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - % test tenants', tenant_count;
    RAISE NOTICE '  - % test users', user_count;
    RAISE NOTICE '  - % test conversations', conversation_count;
    RAISE NOTICE '  - % test messages', message_count;
    RAISE NOTICE '  - % feedback entries', feedback_count;
    RAISE NOTICE '  - % usage metric records', usage_count;
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'You can now test queries with this sample data.';
    RAISE NOTICE 'To clean up: DELETE FROM tenants WHERE slug LIKE ''test-%'';';
    RAISE NOTICE '================================================================';
END $$;

COMMIT;

-- Seed Data: Sample chatbots for testing multi-agent platform
-- Description: Create sample chatbots with different personalities and use cases
-- Date: 2026-01-13

-- First, ensure we have a demo tenant and admin user (using existing seed data pattern)

-- Get tenant and admin user IDs from existing data
DO $$
DECLARE
    demo_tenant_id UUID;
    demo_admin_id UUID;
    demo_user_id UUID;
BEGIN
    -- Get or create demo tenant
    SELECT id INTO demo_tenant_id FROM public.tenants WHERE slug = 'demo-corp' LIMIT 1;

    IF demo_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Demo tenant not found. Please run seed_test_data.sql first.';
    END IF;

    -- Get admin user (we'll use the first user from demo-corp and update their role)
    SELECT id INTO demo_admin_id FROM public.users WHERE tenant_id = demo_tenant_id LIMIT 1;

    IF demo_admin_id IS NULL THEN
        RAISE EXCEPTION 'Demo users not found. Please run seed_test_data.sql first.';
    END IF;

    -- Update first user to be an admin
    UPDATE public.users
    SET role = 'admin'
    WHERE id = demo_admin_id;

    -- Get or create additional regular user
    SELECT id INTO demo_user_id FROM public.users
    WHERE tenant_id = demo_tenant_id AND id != demo_admin_id
    LIMIT 1;

    -- Create sample chatbots (delete existing to make idempotent)
    DELETE FROM public.chatbots WHERE tenant_id = demo_tenant_id;

    -- 1. Customer Support Agent
    INSERT INTO public.chatbots (
        id,
        tenant_id,
        name,
        description,
        system_prompt,
        model,
        temperature,
        max_tokens,
        settings,
        is_published,
        created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000001',
        demo_tenant_id,
        'Customer Support Agent',
        'Friendly and helpful customer support chatbot specialized in resolving common issues',
        'You are a helpful and empathetic customer support agent. Your goal is to resolve customer issues quickly and professionally. Always maintain a friendly tone, acknowledge customer concerns, and provide clear step-by-step solutions. If you cannot resolve an issue, escalate to a human agent. Never make promises you cannot keep.',
        'gpt-4-turbo-preview',
        0.7,
        2048,
        '{"max_conversation_length": 20, "enable_escalation": true, "categories": ["technical", "billing", "general"]}',
        true,
        demo_admin_id
    );

    -- 2. Sales Assistant
    INSERT INTO public.chatbots (
        id,
        tenant_id,
        name,
        description,
        system_prompt,
        model,
        temperature,
        max_tokens,
        settings,
        is_published,
        created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000002',
        demo_tenant_id,
        'Sales Assistant',
        'Persuasive sales chatbot that helps qualify leads and schedule demos',
        'You are an enthusiastic and knowledgeable sales assistant. Your role is to understand customer needs, present product benefits, and guide prospects toward making a purchase or scheduling a demo. Use consultative selling techniques, ask qualifying questions, and highlight value propositions. Be persistent but not pushy. Always aim to move the conversation forward.',
        'gpt-4-turbo-preview',
        0.8,
        1500,
        '{"lead_qualification": true, "demo_scheduling": true, "product_categories": ["enterprise", "small_business"]}',
        true,
        demo_admin_id
    );

    -- 3. Technical Documentation Assistant
    INSERT INTO public.chatbots (
        id,
        tenant_id,
        name,
        description,
        system_prompt,
        model,
        temperature,
        max_tokens,
        settings,
        is_published,
        created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000003',
        demo_tenant_id,
        'Technical Documentation Assistant',
        'Precise technical expert that helps developers with API documentation and code examples',
        'You are a technical documentation expert specializing in API integration and developer support. Provide accurate, detailed explanations with code examples in multiple programming languages. Reference official documentation, explain error messages, and suggest best practices. Use technical terminology correctly and be precise. Format code examples with proper syntax highlighting.',
        'gpt-4-turbo-preview',
        0.3,
        4096,
        '{"code_languages": ["python", "javascript", "java", "curl"], "include_examples": true, "api_version": "v2"}',
        true,
        demo_admin_id
    );

    -- 4. Creative Writing Coach
    INSERT INTO public.chatbots (
        id,
        tenant_id,
        name,
        description,
        system_prompt,
        model,
        temperature,
        max_tokens,
        settings,
        is_published,
        created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000004',
        demo_tenant_id,
        'Creative Writing Coach',
        'Inspiring writing coach that provides feedback and creative prompts',
        'You are an experienced creative writing coach and mentor. Help writers improve their craft by providing constructive feedback, suggesting creative techniques, and offering writing prompts. Encourage experimentation, discuss narrative structure, character development, and style. Be supportive yet honest, and always inspire writers to find their unique voice.',
        'gpt-4-turbo-preview',
        0.9,
        3000,
        '{"feedback_style": "constructive", "genres": ["fiction", "poetry", "screenwriting"], "prompts_enabled": true}',
        true,
        demo_admin_id
    );

    -- 5. Data Analysis Assistant (unpublished, work in progress)
    INSERT INTO public.chatbots (
        id,
        tenant_id,
        name,
        description,
        system_prompt,
        model,
        temperature,
        max_tokens,
        settings,
        is_published,
        created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000005',
        demo_tenant_id,
        'Data Analysis Assistant',
        'Expert data analyst that helps interpret datasets and create visualizations',
        'You are a data analysis expert specializing in statistical analysis, data visualization, and business intelligence. Help users understand their data by explaining trends, suggesting appropriate analysis methods, and recommending visualization techniques. Use clear explanations for complex concepts and provide actionable insights.',
        'gpt-4-turbo-preview',
        0.5,
        2048,
        '{"chart_types": ["bar", "line", "scatter", "pie"], "statistical_methods": true}',
        false, -- Not yet published
        demo_admin_id
    );

    -- 6. HR Onboarding Assistant
    INSERT INTO public.chatbots (
        id,
        tenant_id,
        name,
        description,
        system_prompt,
        model,
        temperature,
        max_tokens,
        settings,
        is_published,
        created_by
    ) VALUES (
        '00000000-0000-0000-0000-000000000006',
        demo_tenant_id,
        'HR Onboarding Assistant',
        'Welcoming HR assistant that guides new employees through onboarding',
        'You are a friendly HR onboarding assistant. Welcome new employees, answer questions about company policies, benefits, and procedures. Guide them through onboarding tasks, provide information about company culture, and help them feel welcomed. Be informative, approachable, and organized. Protect employee privacy and escalate sensitive matters to HR.',
        'gpt-3.5-turbo',
        0.7,
        1500,
        '{"company_name": "Demo Corp", "onboarding_checklist": true, "policies_database": true}',
        true,
        demo_admin_id
    );

    RAISE NOTICE 'Successfully created 6 sample chatbots (5 published, 1 unpublished)';
END $$;

/**
 * Chat API Route
 * Handles chat completions with streaming support using Vercel AI SDK
 * Includes full database integration for conversations, messages, and usage tracking
 * Supports both demo mode and company-specific mode with user identification
 */

import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createAdminClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import type { ChatRequest, APIError, TenantSettings, Json, ChatbotSettings as ChatbotSettingsType, supportsReasoningParams } from '@/types';
import { supportsReasoningParams as checkReasoningSupport } from '@/types';

// Edge runtime for better streaming performance
export const runtime = 'edge';

/**
 * AI SDK v6 message part format
 */
interface AISDKMessagePart {
  type: 'text';
  text: string;
}

/**
 * AI SDK v6 message format - uses parts array instead of content
 */
interface AISDKMessage {
  role: 'user' | 'assistant' | 'system';
  content?: string;  // Legacy format
  parts?: AISDKMessagePart[];  // AI SDK v6 format
  id?: string;
}

/**
 * Extract text content from AI SDK message (handles both formats)
 */
function extractMessageContent(msg: AISDKMessage): string {
  // AI SDK v6 format: parts array
  if (msg.parts && Array.isArray(msg.parts)) {
    const textParts = msg.parts.filter(p => p.type === 'text' && p.text);
    if (textParts.length > 0) {
      return textParts.map(p => p.text).join('');
    }
  }
  // Legacy format: content string
  if (typeof msg.content === 'string') {
    return msg.content;
  }
  return '';
}

/**
 * Extended chat request with company context
 * Supports both legacy format (message field) and AI SDK format (messages array)
 */
interface ExtendedChatRequest extends ChatRequest {
  company_slug?: string;
  user_email?: string;
  user_name?: string;
  user_id?: string;
  company_id?: string;
  // AI SDK format - messages array
  messages?: AISDKMessage[];
}

/**
 * Model pricing lookup for cost estimation
 */
function calculateEstimatedCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = config.modelPricing[model] || config.modelPricing['gpt-4-turbo-preview'];
  const promptCost = (promptTokens / 1000) * pricing.prompt;
  const completionCost = (completionTokens / 1000) * pricing.completion;
  return promptCost + completionCost;
}

/**
 * Load or create a conversation for the user
 */
async function getOrCreateConversation(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  tenantId: string,
  conversationId?: string,
  model?: string,
  chatbotId?: string
): Promise<{ id: string; isNew: boolean }> {
  // If conversation_id provided, verify it exists and belongs to user
  if (conversationId) {
    const { data: existing, error } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .eq('is_archived', false)
      .single();

    if (error || !existing) {
      throw new Error('Conversation not found or access denied');
    }

    return { id: existing.id, isNew: false };
  }

  // Create new conversation with optional chatbot_id
  const { data: newConversation, error: createError } = await supabase
    .from('conversations')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      title: 'New Conversation',
      is_archived: false,
      chatbot_id: chatbotId || null,
      metadata: {
        message_count: 0,
        total_tokens: 0,
        model: model || config.openai.defaultModel,
        ...(chatbotId && { chatbot_id: chatbotId }),
      },
    })
    .select('id')
    .single();

  if (createError || !newConversation) {
    throw new Error('Failed to create conversation');
  }

  return { id: newConversation.id, isNew: true };
}

/**
 * Load conversation history for context
 */
async function loadConversationHistory(
  supabase: ReturnType<typeof createAdminClient>,
  conversationId: string,
  maxMessages: number = config.ai.maxConversationMessages
): Promise<Array<{ role: 'user' | 'assistant' | 'system'; content: string }>> {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(maxMessages);

  if (error) {
    console.error('Error loading conversation history:', error);
    return [];
  }

  return (messages || []).map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }));
}

/**
 * Save a message to the database
 */
async function saveMessage(
  supabase: ReturnType<typeof createAdminClient>,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata: { [key: string]: Json | undefined } = {}
): Promise<string> {
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      metadata,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving message:', error);
    throw new Error('Failed to save message');
  }

  return message.id;
}

/**
 * Update conversation metadata after message exchange
 */
async function updateConversationMetadata(
  supabase: ReturnType<typeof createAdminClient>,
  conversationId: string,
  tokensUsed: number,
  userMessage: string,
  isNewConversation: boolean
): Promise<void> {
  // Get current metadata
  const { data: conversation, error: fetchError } = await supabase
    .from('conversations')
    .select('metadata, title')
    .eq('id', conversationId)
    .single();

  if (fetchError || !conversation) {
    console.error('Error fetching conversation:', fetchError);
    return;
  }

  const currentMetadata = (conversation.metadata || {}) as Record<string, unknown>;
  const messageCount = ((currentMetadata.message_count as number) || 0) + 2; // User + assistant
  const totalTokens = ((currentMetadata.total_tokens as number) || 0) + tokensUsed;

  // Auto-generate title from first message if new conversation
  let title = conversation.title;
  if (isNewConversation && userMessage.length > 0) {
    title = userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '');
  }

  const { error: updateError } = await supabase
    .from('conversations')
    .update({
      title,
      metadata: {
        ...currentMetadata,
        message_count: messageCount,
        total_tokens: totalTokens,
        last_message_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  if (updateError) {
    console.error('Error updating conversation metadata:', updateError);
  }
}

/**
 * Track usage metrics (placeholder - usage_metrics table not yet implemented)
 */
async function trackUsageMetrics(
  _supabase: ReturnType<typeof createAdminClient>,
  _tenantId: string,
  _userId: string,
  promptTokens: number,
  completionTokens: number,
  model: string
): Promise<void> {
  const estimatedCost = calculateEstimatedCost(model, promptTokens, completionTokens);

  // TODO: Implement usage_metrics table and increment_usage_metrics RPC function
  // For now, just log the metrics
  console.log('Usage metrics (not persisted):', {
    promptTokens,
    completionTokens,
    model,
    estimatedCost,
  });
}

/**
 * Load tenant-specific settings
 */
async function loadTenantSettings(
  supabase: ReturnType<typeof createAdminClient>,
  tenantId: string
): Promise<Partial<TenantSettings> | null> {
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('llm_model, temperature, max_tokens, system_prompt')
    .eq('id', tenantId)
    .single();

  if (error || !tenant) {
    console.error('Error loading tenant settings:', error);
    return null;
  }

  return {
    model: tenant.llm_model,
    temperature: tenant.temperature ? Number(tenant.temperature) : undefined,
    max_tokens: tenant.max_tokens,
    system_prompt: tenant.system_prompt,
  } as Partial<TenantSettings>;
}

/**
 * Chatbot settings interface (extended with JSONB settings)
 */
interface ChatbotSettings {
  id: string;
  name: string;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  tenant_id: string;
  settings?: ChatbotSettingsType;
}

/**
 * Load chatbot configuration if chatbot_id is provided
 * Validates that the chatbot exists, is published, and belongs to the tenant
 */
async function loadChatbotSettings(
  supabase: ReturnType<typeof createAdminClient>,
  chatbotId: string,
  tenantId: string
): Promise<{ settings: ChatbotSettings | null; error: string | null }> {
  const { data: chatbot, error } = await supabase
    .from('chatbots')
    .select('id, name, system_prompt, model, temperature, max_tokens, tenant_id, is_published, settings')
    .eq('id', chatbotId)
    .single();

  if (error || !chatbot) {
    console.error('Error loading chatbot:', error);
    return { settings: null, error: 'Chatbot not found' };
  }

  // Validate chatbot belongs to the tenant
  if (chatbot.tenant_id !== tenantId) {
    return { settings: null, error: 'Chatbot not available for this tenant' };
  }

  // Validate chatbot is published
  if (!chatbot.is_published) {
    return { settings: null, error: 'Chatbot is not published' };
  }

  return {
    settings: {
      id: chatbot.id,
      name: chatbot.name,
      system_prompt: chatbot.system_prompt,
      model: chatbot.model,
      temperature: chatbot.temperature,
      max_tokens: chatbot.max_tokens,
      tenant_id: chatbot.tenant_id,
      settings: chatbot.settings as ChatbotSettingsType | undefined,
    },
    error: null,
  };
}

/**
 * Get user's tenant ID from their profile
 */
async function getUserTenantId(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<string | null> {
  const { data: userProfile, error } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  if (error || !userProfile) {
    // If user profile doesn't exist in users table, try to get tenant from a default
    console.warn('User profile not found, using default tenant');
    return null;
  }

  return userProfile.tenant_id;
}

/**
 * Look up tenant by slug
 */
async function getTenantBySlug(
  supabase: ReturnType<typeof createAdminClient>,
  slug: string
): Promise<{ id: string; name: string } | null> {
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, name, is_active')
    .eq('slug', slug)
    .single();

  if (error || !tenant || tenant.is_active === false) {
    console.error('Tenant not found or inactive:', error);
    return null;
  }

  return { id: tenant.id, name: tenant.name };
}

/**
 * Find or create user by email in a tenant
 */
async function findOrCreateUserByEmail(
  supabase: ReturnType<typeof createAdminClient>,
  tenantId: string,
  email: string,
  name?: string
): Promise<string> {
  // First, try to find existing user by email and tenant
  const { data: existingUser, error: findError } = await supabase
    .from('users')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', email.toLowerCase())
    .single();

  if (existingUser && !findError) {
    // Update last active timestamp
    await supabase
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', existingUser.id);

    return existingUser.id;
  }

  // Create new user for this tenant
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      tenant_id: tenantId,
      email: email.toLowerCase(),
      name: name || email.split('@')[0],
      role: 'guest',
      is_active: true,
    })
    .select('id')
    .single();

  if (createError || !newUser) {
    console.error('Error creating user:', createError);
    throw new Error('Failed to create user');
  }

  return newUser.id;
}

/**
 * POST /api/chat
 * Creates a new chat completion with streaming response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body: ExtendedChatRequest = await request.json();
    const { message: legacyMessage, conversation_id, chatbot_id, model, temperature, max_tokens, company_slug, user_email, user_name, user_id, company_id, messages: aiSdkMessages } = body;

    // Debug logging to understand request format
    console.log('Chat API received:', JSON.stringify({
      hasLegacyMessage: !!legacyMessage,
      hasAiSdkMessages: !!aiSdkMessages,
      aiSdkMessagesCount: aiSdkMessages?.length,
      firstMessageStructure: aiSdkMessages?.[0] ? Object.keys(aiSdkMessages[0]) : null,
      user_id: user_id,
    }));

    // Extract message from either legacy format or AI SDK format
    // AI SDK v6 sends messages with parts array: { parts: [{ type: "text", text: "..." }] }
    let message: string | undefined;

    if (legacyMessage && typeof legacyMessage === 'string') {
      // Legacy format: single message field
      message = legacyMessage;
    } else if (aiSdkMessages && Array.isArray(aiSdkMessages) && aiSdkMessages.length > 0) {
      // AI SDK v6 format: messages array with parts, get the last user message
      const lastUserMessage = [...aiSdkMessages].reverse().find(m => m.role === 'user');
      if (lastUserMessage) {
        // Use helper to extract content from either parts array or content field
        message = extractMessageContent(lastUserMessage);
      }
    }

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Message is required and must be a non-empty string',
        },
        { status: 400 }
      );
    }

    // This app uses localStorage sessions, NOT Supabase Auth
    // Use admin client directly to bypass RLS (avoid auth.getUser() which can hang)

    // Demo mode constants
    const DEMO_USER_ID = '00000000-0000-0000-0000-000000000002';
    const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

    let effectiveUserId: string;
    let tenantId: string | null = null;
    let supabase: ReturnType<typeof createAdminClient>;

    // Session mode: use user_id directly (from workspace)
    if (user_id) {
      // Validate UUID format
      // More permissive UUID regex to handle all UUID formats including demo IDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(user_id)) {
        return NextResponse.json<APIError>(
          {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user_id format',
          },
          { status: 400 }
        );
      }

      // Use admin client to bypass RLS
      const adminSupabase = createAdminClient();
      supabase = adminSupabase;

      // Fetch user and their tenant
      const { data: userProfile, error: userError } = await adminSupabase
        .from('users')
        .select('id, tenant_id')
        .eq('id', user_id)
        .single();

      if (userError || !userProfile) {
        return NextResponse.json<APIError>(
          {
            code: 'VALIDATION_ERROR',
            message: 'User not found',
          },
          { status: 400 }
        );
      }

      effectiveUserId = userProfile.id;
      tenantId = userProfile.tenant_id;
      console.log('Session mode: Using user', effectiveUserId, 'in tenant', tenantId);

      // Validate chatbot belongs to this tenant if chatbot_id provided
      if (chatbot_id) {
        const { data: chatbot, error: chatbotError } = await adminSupabase
          .from('chatbots')
          .select('tenant_id, is_published')
          .eq('id', chatbot_id)
          .single();

        if (chatbotError || !chatbot) {
          return NextResponse.json<APIError>(
            {
              code: 'NOT_FOUND',
              message: 'Chatbot not found',
            },
            { status: 404 }
          );
        }

        if (chatbot.tenant_id !== tenantId) {
          return NextResponse.json<APIError>(
            {
              code: 'VALIDATION_ERROR',
              message: 'Chatbot does not belong to this company',
            },
            { status: 400 }
          );
        }

        if (!chatbot.is_published) {
          return NextResponse.json<APIError>(
            {
              code: 'VALIDATION_ERROR',
              message: 'Chatbot is not published',
            },
            { status: 400 }
          );
        }
      }
    }
    // Company mode: use company_slug and user_email to determine tenant and user
    else if (company_slug && user_email) {
      // Validate user_email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(user_email)) {
        return NextResponse.json<APIError>(
          {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email address format',
          },
          { status: 400 }
        );
      }

      // Use admin client to bypass RLS for cross-tenant operations
      const adminSupabase = createAdminClient();
      supabase = adminSupabase;

      // Look up tenant by slug
      const tenant = await getTenantBySlug(adminSupabase, company_slug);
      if (!tenant) {
        return NextResponse.json<APIError>(
          {
            code: 'NOT_FOUND',
            message: 'Company not found',
          },
          { status: 404 }
        );
      }
      tenantId = tenant.id;

      // Find or create user by email
      try {
        effectiveUserId = await findOrCreateUserByEmail(adminSupabase, tenantId, user_email, user_name);
        console.log('Company mode: Using user', effectiveUserId, 'in tenant', tenantId);
      } catch (err) {
        return NextResponse.json<APIError>(
          {
            code: 'INTERNAL_ERROR',
            message: 'Failed to process user',
          },
          { status: 500 }
        );
      }

      // Validate chatbot belongs to this tenant if chatbot_id provided
      if (chatbot_id) {
        const { data: chatbot, error: chatbotError } = await adminSupabase
          .from('chatbots')
          .select('tenant_id, is_published')
          .eq('id', chatbot_id)
          .single();

        if (chatbotError || !chatbot) {
          return NextResponse.json<APIError>(
            {
              code: 'NOT_FOUND',
              message: 'Chatbot not found',
            },
            { status: 404 }
          );
        }

        if (chatbot.tenant_id !== tenantId) {
          return NextResponse.json<APIError>(
            {
              code: 'VALIDATION_ERROR',
              message: 'Chatbot does not belong to this company',
            },
            { status: 400 }
          );
        }

        if (!chatbot.is_published) {
          return NextResponse.json<APIError>(
            {
              code: 'VALIDATION_ERROR',
              message: 'Chatbot is not published',
            },
            { status: 400 }
          );
        }
      }
    } else {
      // Demo mode: use admin client for demo user/tenant
      // This app uses localStorage sessions, NOT Supabase Auth
      try {
        supabase = createAdminClient();
      } catch (error) {
        console.error('Failed to create admin client:', error);
        return NextResponse.json<APIError>(
          { code: 'CONFIG_ERROR', message: 'Server configuration error' },
          { status: 500 }
        );
      }
      effectiveUserId = DEMO_USER_ID;
      tenantId = DEMO_TENANT_ID;
      console.log('Using demo mode with admin client');
    }

    if (!tenantId) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'User tenant not configured',
        },
        { status: 400 }
      );
    }

    // Load tenant-specific settings
    const tenantSettings = await loadTenantSettings(supabase, tenantId);

    // Load chatbot settings if chatbot_id is provided
    let chatbotSettings: ChatbotSettings | null = null;
    if (chatbot_id) {
      const chatbotResult = await loadChatbotSettings(supabase, chatbot_id, tenantId);
      if (chatbotResult.error) {
        return NextResponse.json<APIError>(
          {
            code: 'VALIDATION_ERROR',
            message: chatbotResult.error,
          },
          { status: 400 }
        );
      }
      chatbotSettings = chatbotResult.settings;
    }

    // Determine model and settings
    // Priority: request params > chatbot settings > tenant settings > defaults
    const effectiveModel = model || chatbotSettings?.model || tenantSettings?.model || config.openai.defaultModel;
    const effectiveTemperature = temperature ?? chatbotSettings?.temperature ?? tenantSettings?.temperature ?? config.openai.defaultTemperature;
    const effectiveMaxTokens = max_tokens ?? chatbotSettings?.max_tokens ?? tenantSettings?.max_tokens ?? config.openai.defaultMaxTokens;
    const systemPrompt = chatbotSettings?.system_prompt || tenantSettings?.system_prompt || config.ai.systemPrompt;

    // Extract extended model parameters from chatbot settings
    const modelParams = chatbotSettings?.settings?.model_params;
    const providerOptions = chatbotSettings?.settings?.provider_options;

    // Determine if model supports reasoning parameters
    const modelSupportsReasoning = checkReasoningSupport(effectiveModel);

    // Get or create conversation
    let conversationData: { id: string; isNew: boolean };
    try {
      conversationData = await getOrCreateConversation(
        supabase,
        effectiveUserId,
        tenantId,
        conversation_id,
        effectiveModel,
        chatbot_id
      );
    } catch (err) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: err instanceof Error ? err.message : 'Conversation error',
        },
        { status: 404 }
      );
    }

    // Load conversation history
    const conversationHistory = await loadConversationHistory(supabase, conversationData.id);

    // Save user message to database before calling OpenAI
    const userMessageId = await saveMessage(supabase, conversationData.id, 'user', message.trim());

    // Build messages for OpenAI
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      ...conversationHistory,
      {
        role: 'user' as const,
        content: message.trim(),
      },
    ];

    // Build OpenAI provider options for reasoning models
    const openaiProviderOptions: Record<string, string | number | boolean | null> = {};
    if (providerOptions?.store !== undefined) {
      openaiProviderOptions.store = providerOptions.store;
    }
    if (modelSupportsReasoning && providerOptions?.reasoning_effort) {
      openaiProviderOptions.reasoningEffort = providerOptions.reasoning_effort;
    }

    // Create streaming response using Vercel AI SDK
    const result = streamText({
      model: openai(effectiveModel),
      messages,
      temperature: effectiveTemperature,
      maxOutputTokens: effectiveMaxTokens,
      // Extended model parameters from chatbot settings
      ...(modelParams?.top_p !== undefined && { topP: modelParams.top_p }),
      ...(modelParams?.frequency_penalty !== undefined && { frequencyPenalty: modelParams.frequency_penalty }),
      ...(modelParams?.presence_penalty !== undefined && { presencePenalty: modelParams.presence_penalty }),
      // Provider-specific options
      ...(Object.keys(openaiProviderOptions).length > 0 && {
        providerOptions: {
          openai: openaiProviderOptions,
        },
      }),
      // Callback when streaming completes
      onFinish: async ({ text, usage }) => {
        const latencyMs = Date.now() - startTime;
        const promptTokens = usage?.inputTokens || 0;
        const completionTokens = usage?.outputTokens || 0;
        const totalTokens = usage?.totalTokens || (promptTokens + completionTokens);

        try {
          // Save assistant message to database
          await saveMessage(supabase, conversationData.id, 'assistant', text, {
            model: effectiveModel,
            tokens: completionTokens,
            prompt_tokens: promptTokens,
            finish_reason: 'stop',
            latency_ms: latencyMs,
          });

          // Update conversation metadata
          await updateConversationMetadata(
            supabase,
            conversationData.id,
            totalTokens,
            message.trim(),
            conversationData.isNew
          );

          // Track usage metrics
          await trackUsageMetrics(
            supabase,
            tenantId,
            effectiveUserId,
            promptTokens,
            completionTokens,
            effectiveModel
          );

          console.log('Chat completion finished', {
            conversation_id: conversationData.id,
            is_new_conversation: conversationData.isNew,
            model: effectiveModel,
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens,
            latency_ms: latencyMs,
            estimated_cost: calculateEstimatedCost(effectiveModel, promptTokens, completionTokens),
            company_mode: !!company_slug,
            extended_params: {
              top_p: modelParams?.top_p,
              frequency_penalty: modelParams?.frequency_penalty,
              presence_penalty: modelParams?.presence_penalty,
              reasoning_effort: modelSupportsReasoning ? providerOptions?.reasoning_effort : undefined,
              store: providerOptions?.store,
            },
          });
        } catch (finishError) {
          console.error('Error in onFinish callback:', finishError);
        }
      },
    });

    // Return UI message stream response compatible with useChat hook
    // toUIMessageStreamResponse() sends properly formatted data for AI SDK v6 useChat
    const response = result.toUIMessageStreamResponse();

    // Add custom headers with conversation information
    const headers = new Headers(response.headers);
    headers.set('X-Conversation-ID', conversationData.id);
    headers.set('X-Is-New-Conversation', conversationData.isNew.toString());

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error('Chat API error:', error);

    // Handle OpenAI-specific errors
    if (error instanceof Error && error.message.includes('OpenAI')) {
      return NextResponse.json<APIError>(
        {
          code: 'OPENAI_ERROR',
          message: 'Error communicating with AI service',
          details: { originalError: error.message },
        },
        { status: 502 }
      );
    }

    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat
 * Returns API information (not used for actual chat)
 */
export async function GET() {
  return NextResponse.json({
    name: 'Chat API',
    version: '1.2.0',
    endpoints: {
      POST: 'Create a new chat completion with streaming',
    },
    required_body: {
      message: 'string (required)',
      conversation_id: 'string (optional)',
      chatbot_id: 'string (optional) - Use specific chatbot configuration',
      model: 'string (optional)',
      temperature: 'number (optional)',
      max_tokens: 'number (optional)',
    },
    company_mode: {
      description: 'Use company_slug and user_email to enable company-specific mode',
      company_slug: 'string (optional) - Company slug to look up tenant',
      user_email: 'string (optional) - User email to find or create user',
      user_name: 'string (optional) - User display name for new users',
    },
    response_headers: {
      'X-Conversation-ID': 'The conversation ID (useful for new conversations)',
      'X-Is-New-Conversation': 'Whether a new conversation was created',
    },
    notes: {
      settings_priority: 'request params > chatbot settings > tenant settings > defaults',
      chatbot_requirements: 'chatbot must be published and belong to user tenant',
      company_mode_behavior: 'When company_slug and user_email provided, bypasses auth and uses company tenant',
    },
    extended_parameters: {
      description: 'Chatbot settings support extended model parameters',
      model_params: ['top_p', 'frequency_penalty', 'presence_penalty'],
      provider_options: ['reasoning_effort (for o1/o3/gpt-5.1)', 'text_verbosity', 'store'],
      reasoning_models: ['o1', 'o3', 'o3-mini', 'gpt-5.1'],
    },
  });
}

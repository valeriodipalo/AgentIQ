/**
 * Chat API Route
 * Handles chat completions with streaming support using Vercel AI SDK
 * Includes full database integration for conversations, messages, and usage tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createServerClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import type { ChatRequest, APIError, Message, TenantSettings, Json } from '@/types';

// Edge runtime for better streaming performance
export const runtime = 'edge';

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
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  tenantId: string,
  conversationId?: string,
  model?: string
): Promise<{ id: string; isNew: boolean }> {
  // If conversation_id provided, verify it exists and belongs to user
  if (conversationId) {
    const { data: existing, error } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error || !existing) {
      throw new Error('Conversation not found or access denied');
    }

    return { id: existing.id, isNew: false };
  }

  // Create new conversation
  const { data: newConversation, error: createError } = await supabase
    .from('conversations')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      title: 'New Conversation',
      status: 'active',
      metadata: {
        message_count: 0,
        total_tokens: 0,
        model: model || config.openai.defaultModel,
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
  supabase: Awaited<ReturnType<typeof createServerClient>>,
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
  supabase: Awaited<ReturnType<typeof createServerClient>>,
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
  supabase: Awaited<ReturnType<typeof createServerClient>>,
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
 * Track usage metrics via Supabase function
 */
async function trackUsageMetrics(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  tenantId: string,
  userId: string,
  promptTokens: number,
  completionTokens: number,
  model: string
): Promise<void> {
  const estimatedCost = calculateEstimatedCost(model, promptTokens, completionTokens);

  try {
    const { error } = await supabase.rpc('increment_usage_metrics', {
      p_tenant_id: tenantId,
      p_user_id: userId,
      p_prompt_tokens: promptTokens,
      p_completion_tokens: completionTokens,
      p_model: model,
      p_estimated_cost: estimatedCost,
    });

    if (error) {
      console.error('Error tracking usage metrics:', error);
    }
  } catch (err) {
    // Log but don't fail the request if usage tracking fails
    console.error('Failed to track usage metrics:', err);
  }
}

/**
 * Load tenant-specific settings
 */
async function loadTenantSettings(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  tenantId: string
): Promise<Partial<TenantSettings> | null> {
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (error || !tenant) {
    console.error('Error loading tenant settings:', error);
    return null;
  }

  return tenant.settings as Partial<TenantSettings>;
}

/**
 * Get user's tenant ID from their profile
 */
async function getUserTenantId(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
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
 * POST /api/chat
 * Creates a new chat completion with streaming response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body: ChatRequest = await request.json();
    const { message, conversation_id, model, temperature, max_tokens } = body;

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

    // Get Supabase client and check authentication
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<APIError>(
        {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Get user's tenant ID
    const tenantId = await getUserTenantId(supabase, user.id);
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

    // Determine model and settings (tenant settings override defaults, request overrides tenant)
    const effectiveModel = model || tenantSettings?.model || config.openai.defaultModel;
    const effectiveTemperature = temperature ?? tenantSettings?.temperature ?? config.openai.defaultTemperature;
    const effectiveMaxTokens = max_tokens ?? tenantSettings?.max_tokens ?? config.openai.defaultMaxTokens;
    const systemPrompt = tenantSettings?.system_prompt || config.ai.systemPrompt;

    // Get or create conversation
    let conversationData: { id: string; isNew: boolean };
    try {
      conversationData = await getOrCreateConversation(
        supabase,
        user.id,
        tenantId,
        conversation_id,
        effectiveModel
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

    // Create streaming response using Vercel AI SDK
    const result = streamText({
      model: openai(effectiveModel),
      messages,
      temperature: effectiveTemperature,
      maxOutputTokens: effectiveMaxTokens,
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
            user.id,
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
          });
        } catch (finishError) {
          console.error('Error in onFinish callback:', finishError);
        }
      },
    });

    // Return streaming response with conversation ID in header
    const response = result.toTextStreamResponse();

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
    version: '1.0.0',
    endpoints: {
      POST: 'Create a new chat completion with streaming',
    },
    required_body: {
      message: 'string (required)',
      conversation_id: 'string (optional)',
      model: 'string (optional)',
      temperature: 'number (optional)',
      max_tokens: 'number (optional)',
    },
    response_headers: {
      'X-Conversation-ID': 'The conversation ID (useful for new conversations)',
      'X-Is-New-Conversation': 'Whether a new conversation was created',
    },
  });
}

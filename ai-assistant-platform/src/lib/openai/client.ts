/**
 * OpenAI Client Configuration
 * Provides typed access to OpenAI API for chat completions
 */

import OpenAI from 'openai';
import { config } from '@/lib/config';

/**
 * OpenAI client singleton
 * Only available on server-side
 */
let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client instance
 * Throws if called from browser context
 */
export function getOpenAIClient(): OpenAI {
  if (typeof window !== 'undefined') {
    throw new Error(
      'OpenAI client should only be used server-side. ' +
      'Use API routes or Server Actions for AI operations.'
    );
  }

  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    openaiClient = new OpenAI({
      apiKey,
    });
  }

  return openaiClient;
}

// ============================================================================
// Types for Chat Completions
// ============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResult {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | null;
  model: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a chat completion (non-streaming)
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResult> {
  const client = getOpenAIClient();

  const {
    model = config.openai.defaultModel,
    temperature = config.openai.defaultTemperature,
    max_tokens = config.openai.defaultMaxTokens,
  } = options;

  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens,
  });

  const choice = completion.choices[0];

  return {
    content: choice.message.content || '',
    usage: {
      prompt_tokens: completion.usage?.prompt_tokens || 0,
      completion_tokens: completion.usage?.completion_tokens || 0,
      total_tokens: completion.usage?.total_tokens || 0,
    },
    finish_reason: choice.finish_reason as ChatCompletionResult['finish_reason'],
    model: completion.model,
  };
}

/**
 * Create a streaming chat completion
 * Returns an async iterator for streaming responses
 */
export async function createStreamingChatCompletion(
  messages: ChatMessage[],
  options: Omit<ChatCompletionOptions, 'stream'> = {}
) {
  const client = getOpenAIClient();

  const {
    model = config.openai.defaultModel,
    temperature = config.openai.defaultTemperature,
    max_tokens = config.openai.defaultMaxTokens,
  } = options;

  const stream = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens,
    stream: true,
  });

  return stream;
}

/**
 * Build messages array with system prompt
 */
export function buildMessagesWithSystemPrompt(
  userMessages: ChatMessage[],
  systemPrompt: string = config.ai.systemPrompt
): ChatMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    ...userMessages,
  ];
}

/**
 * Estimate token count (rough approximation)
 * For accurate counts, use tiktoken library
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Truncate messages to fit within token limit
 */
export function truncateMessages(
  messages: ChatMessage[],
  maxTokens: number = config.ai.maxTokensPerRequest
): ChatMessage[] {
  const systemMessage = messages.find(m => m.role === 'system');
  const otherMessages = messages.filter(m => m.role !== 'system');

  let totalTokens = systemMessage ? estimateTokenCount(systemMessage.content) : 0;
  const result: ChatMessage[] = systemMessage ? [systemMessage] : [];

  // Add messages from most recent, keeping within token limit
  const reversedMessages = [...otherMessages].reverse();
  const includedMessages: ChatMessage[] = [];

  for (const message of reversedMessages) {
    const messageTokens = estimateTokenCount(message.content);
    if (totalTokens + messageTokens <= maxTokens) {
      includedMessages.unshift(message);
      totalTokens += messageTokens;
    } else {
      break;
    }
  }

  return [...result, ...includedMessages];
}

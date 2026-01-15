/**
 * Create Chatbot Page
 * Form for creating a new chatbot with extended model parameters
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bot, Loader2, ChevronDown, ChevronUp, Settings2, Sparkles, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CompanySelector } from '@/components/ui/company-selector';
import { supportsReasoningParams } from '@/types';

interface FormData {
  tenant_id: string;
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  // Standard parameters
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  // Provider options (reasoning models)
  reasoning_effort: 'none' | 'low' | 'medium' | 'high';
  text_verbosity: 'low' | 'medium' | 'high';
  store_completions: boolean;
  // Publishing
  is_published: boolean;
}

interface FormErrors {
  tenant_id?: string;
  name?: string;
  description?: string;
  system_prompt?: string;
  temperature?: string;
  max_tokens?: string;
  top_p?: string;
  frequency_penalty?: string;
  presence_penalty?: string;
  general?: string;
}

const AVAILABLE_MODELS = [
  { value: 'gpt-5.1', label: 'GPT-5.1 (Latest)', supportsReasoning: true },
  { value: 'o3-mini', label: 'O3 Mini (Reasoning)', supportsReasoning: true },
  { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo', supportsReasoning: false },
  { value: 'gpt-4', label: 'GPT-4', supportsReasoning: false },
  { value: 'gpt-4o', label: 'GPT-4o', supportsReasoning: false },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', supportsReasoning: false },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', supportsReasoning: false },
];

const REASONING_EFFORT_OPTIONS = [
  { value: 'none', label: 'None', description: 'No reasoning performed' },
  { value: 'low', label: 'Low', description: 'Minimal reasoning for faster responses' },
  { value: 'medium', label: 'Medium', description: 'Balanced reasoning (default)' },
  { value: 'high', label: 'High', description: 'Deep reasoning for complex tasks' },
];

const TEXT_VERBOSITY_OPTIONS = [
  { value: 'low', label: 'Low', description: 'Concise, brief responses' },
  { value: 'medium', label: 'Medium', description: 'Balanced detail level' },
  { value: 'high', label: 'High', description: 'Detailed, verbose responses' },
];

export default function CreateChatbotPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    tenant_id: '',
    name: '',
    description: '',
    system_prompt: 'You are a helpful AI assistant.',
    model: 'gpt-4-turbo-preview',
    // Standard parameters
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    // Provider options
    reasoning_effort: 'medium',
    text_verbosity: 'medium',
    store_completions: false,
    // Publishing
    is_published: false,
  });

  // Check if selected model supports reasoning
  const modelSupportsReasoning = useMemo(() => {
    return supportsReasoningParams(formData.model);
  }, [formData.model]);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'number' || type === 'range'
          ? parseFloat(value)
          : type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Handle toggle changes
  const handleToggle = (field: keyof FormData) => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.tenant_id) {
      newErrors.tenant_id = 'Company is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Name must be 255 characters or less';
    }

    if (formData.description.length > 1000) {
      newErrors.description = 'Description must be 1000 characters or less';
    }

    if (formData.system_prompt.length > 10000) {
      newErrors.system_prompt = 'System prompt must be 10000 characters or less';
    }

    if (formData.temperature < 0 || formData.temperature > 2) {
      newErrors.temperature = 'Temperature must be between 0 and 2';
    }

    if (formData.max_tokens < 1 || formData.max_tokens > 128000) {
      newErrors.max_tokens = 'Max tokens must be between 1 and 128000';
    }

    if (formData.top_p < 0 || formData.top_p > 1) {
      newErrors.top_p = 'Top P must be between 0 and 1';
    }

    if (formData.frequency_penalty < -2 || formData.frequency_penalty > 2) {
      newErrors.frequency_penalty = 'Frequency penalty must be between -2 and 2';
    }

    if (formData.presence_penalty < -2 || formData.presence_penalty > 2) {
      newErrors.presence_penalty = 'Presence penalty must be between -2 and 2';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Build settings object
      const settings: Record<string, unknown> = {
        model_params: {
          top_p: formData.top_p,
          frequency_penalty: formData.frequency_penalty,
          presence_penalty: formData.presence_penalty,
        },
        provider_options: {
          store: formData.store_completions,
          ...(modelSupportsReasoning && {
            reasoning_effort: formData.reasoning_effort,
            text_verbosity: formData.text_verbosity,
          }),
        },
      };

      const response = await fetch('/api/admin/chatbots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: formData.tenant_id,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          system_prompt: formData.system_prompt || undefined,
          model: formData.model,
          temperature: formData.temperature,
          max_tokens: formData.max_tokens,
          settings,
          is_published: formData.is_published,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create chatbot');
      }

      // Redirect to chatbots list on success
      router.push('/admin/chatbots');
    } catch (err) {
      console.error('Error creating chatbot:', err);
      setErrors({
        general: err instanceof Error ? err.message : 'Failed to create chatbot',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/chatbots"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Chatbots
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Create Chatbot
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Configure your new AI assistant with advanced model parameters
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
        {/* Basic Info Section */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <Bot className="h-5 w-5" />
            Basic Information
          </h2>

          {/* General error */}
          {errors.general && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-400">
                {errors.general}
              </p>
            </div>
          )}

          {/* Company */}
          <div className="mb-6">
            <label
              htmlFor="tenant_id"
              className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              <Building2 className="h-4 w-4" />
              Company <span className="text-red-500">*</span>
            </label>
            <CompanySelector
              value={formData.tenant_id}
              onChange={(companyId) => {
                setFormData((prev) => ({ ...prev, tenant_id: companyId }));
                if (errors.tenant_id) {
                  setErrors((prev) => ({ ...prev, tenant_id: undefined }));
                }
              }}
              error={errors.tenant_id}
              required
            />
          </div>

          {/* Name */}
          <div className="mb-6">
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="My Chatbot"
              error={errors.name}
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="A brief description of what this chatbot does..."
              rows={3}
              className={`
                w-full rounded-lg border bg-white px-3 py-2 text-sm
                text-zinc-900 placeholder-zinc-500
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2
                dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400
                ${errors.description ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'}
              `}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          {/* System Prompt */}
          <div className="mb-6">
            <label
              htmlFor="system_prompt"
              className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              System Prompt
            </label>
            <textarea
              id="system_prompt"
              name="system_prompt"
              value={formData.system_prompt}
              onChange={handleChange}
              placeholder="You are a helpful AI assistant..."
              rows={6}
              className={`
                w-full rounded-lg border bg-white px-3 py-2 text-sm
                text-zinc-900 placeholder-zinc-500
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2
                dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400
                ${errors.system_prompt ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'}
              `}
            />
            {errors.system_prompt && (
              <p className="mt-1 text-sm text-red-500">{errors.system_prompt}</p>
            )}
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Instructions that guide the AI&apos;s behavior and responses
            </p>
          </div>

          {/* Model */}
          <div className="mb-6">
            <label
              htmlFor="model"
              className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Model
            </label>
            <select
              id="model"
              name="model"
              value={formData.model}
              onChange={handleChange}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
            {modelSupportsReasoning && (
              <p className="mt-1 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <Sparkles className="h-3 w-3" />
                This model supports reasoning parameters
              </p>
            )}
          </div>

          {/* Published Toggle */}
          <div>
            <label className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={formData.is_published}
                onClick={() => handleToggle('is_published')}
                className={`
                  relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
                  transition-colors duration-200 ease-in-out
                  focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2
                  ${formData.is_published ? 'bg-green-600' : 'bg-zinc-300 dark:bg-zinc-700'}
                `}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full
                    bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${formData.is_published ? 'translate-x-5' : 'translate-x-0.5'}
                    mt-0.5
                  `}
                />
              </button>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Published
              </span>
            </label>
            <p className="mt-1 ml-14 text-xs text-zinc-500 dark:text-zinc-400">
              Published chatbots are available to users
            </p>
          </div>
        </div>

        {/* Sampling Parameters Section */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <Settings2 className="h-5 w-5" />
            Sampling Parameters
          </h2>

          {/* Temperature */}
          <div className="mb-6">
            <label
              htmlFor="temperature"
              className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Temperature: {formData.temperature}
            </label>
            <input
              id="temperature"
              name="temperature"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={formData.temperature}
              onChange={handleChange}
              className="w-full accent-zinc-900 dark:accent-zinc-100"
            />
            <div className="mt-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Focused (0)</span>
              <span>Balanced (1)</span>
              <span>Creative (2)</span>
            </div>
          </div>

          {/* Top P */}
          <div className="mb-6">
            <label
              htmlFor="top_p"
              className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Top P (Nucleus Sampling): {formData.top_p}
            </label>
            <input
              id="top_p"
              name="top_p"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={formData.top_p}
              onChange={handleChange}
              className="w-full accent-zinc-900 dark:accent-zinc-100"
            />
            <div className="mt-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Focused (0)</span>
              <span>Default (1)</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Alternative to temperature. Use one or the other, not both.
            </p>
          </div>

          {/* Max Tokens */}
          <div>
            <label
              htmlFor="max_tokens"
              className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Max Tokens
            </label>
            <Input
              id="max_tokens"
              name="max_tokens"
              type="number"
              min="1"
              max="128000"
              value={formData.max_tokens}
              onChange={handleChange}
              error={errors.max_tokens}
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Maximum number of tokens in the response (1-128000)
            </p>
          </div>
        </div>

        {/* Advanced Parameters Section (Collapsible) */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex w-full items-center justify-between p-6 text-left"
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              <Sparkles className="h-5 w-5" />
              Advanced Parameters
            </h2>
            {showAdvanced ? (
              <ChevronUp className="h-5 w-5 text-zinc-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-zinc-500" />
            )}
          </button>

          {showAdvanced && (
            <div className="border-t border-zinc-200 p-6 dark:border-zinc-800">
              {/* Frequency Penalty */}
              <div className="mb-6">
                <label
                  htmlFor="frequency_penalty"
                  className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
                >
                  Frequency Penalty: {formData.frequency_penalty}
                </label>
                <input
                  id="frequency_penalty"
                  name="frequency_penalty"
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={formData.frequency_penalty}
                  onChange={handleChange}
                  className="w-full accent-zinc-900 dark:accent-zinc-100"
                />
                <div className="mt-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Encourage (-2)</span>
                  <span>Neutral (0)</span>
                  <span>Penalize (2)</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Reduces repetition of tokens that have already appeared
                </p>
              </div>

              {/* Presence Penalty */}
              <div className="mb-6">
                <label
                  htmlFor="presence_penalty"
                  className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
                >
                  Presence Penalty: {formData.presence_penalty}
                </label>
                <input
                  id="presence_penalty"
                  name="presence_penalty"
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={formData.presence_penalty}
                  onChange={handleChange}
                  className="w-full accent-zinc-900 dark:accent-zinc-100"
                />
                <div className="mt-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Stay focused (-2)</span>
                  <span>Neutral (0)</span>
                  <span>Explore new (2)</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Encourages the model to talk about new topics
                </p>
              </div>

              {/* Store Completions Toggle */}
              <div className="mb-6">
                <label className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.store_completions}
                    onClick={() => handleToggle('store_completions')}
                    className={`
                      relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
                      transition-colors duration-200 ease-in-out
                      focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2
                      ${formData.store_completions ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}
                    `}
                  >
                    <span
                      className={`
                        pointer-events-none inline-block h-5 w-5 transform rounded-full
                        bg-white shadow ring-0 transition duration-200 ease-in-out
                        ${formData.store_completions ? 'translate-x-5' : 'translate-x-0.5'}
                        mt-0.5
                      `}
                    />
                  </button>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Store Completions
                  </span>
                </label>
                <p className="mt-1 ml-14 text-xs text-zinc-500 dark:text-zinc-400">
                  Store completions for later retrieval and analysis
                </p>
              </div>

              {/* Reasoning Model Parameters */}
              {modelSupportsReasoning && (
                <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
                    <Sparkles className="h-4 w-4" />
                    Reasoning Model Options
                  </h3>

                  {/* Reasoning Effort */}
                  <div className="mb-4">
                    <label
                      htmlFor="reasoning_effort"
                      className="mb-2 block text-sm font-medium text-blue-900 dark:text-blue-100"
                    >
                      Reasoning Effort
                    </label>
                    <select
                      id="reasoning_effort"
                      name="reasoning_effort"
                      value={formData.reasoning_effort}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-blue-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      {REASONING_EFFORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} - {option.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Text Verbosity */}
                  <div>
                    <label
                      htmlFor="text_verbosity"
                      className="mb-2 block text-sm font-medium text-blue-900 dark:text-blue-100"
                    >
                      Text Verbosity
                    </label>
                    <select
                      id="text_verbosity"
                      name="text_verbosity"
                      value={formData.text_verbosity}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-blue-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      {TEXT_VERBOSITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} - {option.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/admin/chatbots">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Bot className="mr-2 h-4 w-4" />
                Create Chatbot
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

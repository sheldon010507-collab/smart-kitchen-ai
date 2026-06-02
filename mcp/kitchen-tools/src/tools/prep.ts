import { supabase } from '../supabase.js';
import { resolveBusiness } from '../businessResolver.js';
import { logAgentAction } from './audit.js';
import type { BusinessSelectionInput, ToolResult } from '../types.js';

interface PrepTaskInput {
  task_text: string;
  assigned_to?: string;
  priority?: number;
}

export async function createPrepTasks(input: BusinessSelectionInput & { task_date: string; tasks: PrepTaskInput[] }): Promise<ToolResult> {
  const resolved = await resolveBusiness(input);
  if (!resolved.ok || !resolved.data) return resolved;

  if (!Array.isArray(input.tasks) || input.tasks.length === 0) {
    return { ok: false, error: 'tasks must contain at least one prep task' };
  }

  if (input.tasks.length > 10) {
    return { ok: false, needs_confirmation: true, clarification: 'This would create more than 10 prep tasks. Please confirm or split the plan.' };
  }

  const rows = input.tasks.map(task => ({
    business_id: resolved.data!.business.business_id,
    task_text: task.task_text,
    assigned_to: task.assigned_to || null,
    completed: false,
    task_date: input.task_date,
    priority: task.priority ?? 1,
    created_by: resolved.data!.actor.supabase_user_id,
  }));

  try {
    const { data, error } = await supabase.from('prep_tasks').insert(rows).select('*');
    if (error) throw new Error(error.message);

    const output = { business: resolved.data.business, tasks: data || [] };
    await logAgentAction({
      business_id: resolved.data.business.business_id,
      actor_user_id: resolved.data.actor.supabase_user_id,
      actor_role: resolved.data.actor.role,
      sender_id: input.telegram_user_id,
      sender_username: input.telegram_username,
      tool_name: 'kitchen_create_prep_tasks',
      intent: 'create_prep_tasks',
      input,
      output,
      status: 'executed',
    });
    return { ok: true, data: output };
  } catch (error: any) {
    await logAgentAction({
      business_id: resolved.data.business.business_id,
      actor_user_id: resolved.data.actor.supabase_user_id,
      actor_role: resolved.data.actor.role,
      sender_id: input.telegram_user_id,
      sender_username: input.telegram_username,
      tool_name: 'kitchen_create_prep_tasks',
      intent: 'create_prep_tasks',
      input,
      status: 'failed',
      error_message: error.message,
    });
    return { ok: false, error: error.message };
  }
}

export async function getPrepTasks(input: BusinessSelectionInput & { task_date?: string }): Promise<ToolResult> {
  const resolved = await resolveBusiness(input);
  if (!resolved.ok || !resolved.data) return resolved;

  let query = supabase
    .from('prep_tasks')
    .select('*')
    .eq('business_id', resolved.data.business.business_id)
    .order('priority', { ascending: false });

  if (input.task_date) query = query.eq('task_date', input.task_date);

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { business: resolved.data.business, tasks: data || [] } };
}

export async function deletePrepTask(input: BusinessSelectionInput & { task_id?: string; task_text?: string; task_date?: string }): Promise<ToolResult> {
  const resolved = await resolveBusiness(input);
  if (!resolved.ok || !resolved.data) return resolved;

  if (!input.task_id && !input.task_text) {
    return { ok: false, error: 'task_id or task_text is required' };
  }

  let lookup = supabase
    .from('prep_tasks')
    .select('*')
    .eq('business_id', resolved.data.business.business_id);

  if (input.task_id) lookup = lookup.eq('id', input.task_id);
  if (input.task_text) lookup = lookup.ilike('task_text', input.task_text);
  if (input.task_date) lookup = lookup.eq('task_date', input.task_date);

  const { data: matches, error: lookupError } = await lookup.limit(2);
  if (lookupError) return { ok: false, error: lookupError.message };
  if (!matches || matches.length === 0) return { ok: false, error: 'prep task not found' };
  if (matches.length > 1) {
    return {
      ok: false,
      needs_confirmation: true,
      clarification: 'More than one prep task matched. Please specify the exact task or date.',
      data: matches,
    };
  }

  const task = matches[0];
  const { error } = await supabase
    .from('prep_tasks')
    .delete()
    .eq('id', task.id)
    .eq('business_id', resolved.data.business.business_id);

  if (error) return { ok: false, error: error.message };

  const output = { business: resolved.data.business, task };
  await logAgentAction({
    business_id: resolved.data.business.business_id,
    actor_user_id: resolved.data.actor.supabase_user_id,
    actor_role: resolved.data.actor.role,
    sender_id: input.telegram_user_id,
    sender_username: input.telegram_username,
    tool_name: 'kitchen_delete_prep_task',
    intent: 'delete_prep_task',
    input,
    output,
    status: 'executed',
  });

  return { ok: true, data: output };
}

export interface TelegramActorInput {
  telegram_user_id: string;
  telegram_username?: string;
}

export interface AccessibleBusiness {
  business_id: string;
  name: string;
  access_role: 'owner' | 'staff';
}

export interface ResolvedActor {
  linked: boolean;
  telegram_user_id: string;
  telegram_username?: string;
  supabase_user_id?: string;
  role?: 'Manager' | 'Staff';
  default_business_id?: string | null;
  accessible_businesses: AccessibleBusiness[];
  error?: string;
}

export interface BusinessSelectionInput extends TelegramActorInput {
  business_id?: string;
  business_name?: string;
}

export interface ResolvedBusiness {
  business_id: string;
  name: string;
  access_role: 'owner' | 'staff';
}

export interface ToolResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  needs_confirmation?: boolean;
  clarification?: string;
}

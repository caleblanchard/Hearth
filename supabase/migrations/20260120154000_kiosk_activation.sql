-- Kiosk activation and device secrets
create table if not exists kiosk_activation_codes (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_device_id text,
  created_by uuid references family_members(id) on delete set null,
  is_revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists kiosk_activation_codes_code_hash_idx on kiosk_activation_codes(code_hash);
create index if not exists kiosk_activation_codes_family_idx on kiosk_activation_codes(family_id);

create table if not exists kiosk_device_secrets (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  device_id text not null,
  secret_hash text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  rotated_from uuid references kiosk_device_secrets(id)
);

create unique index if not exists kiosk_device_secrets_active_device_idx
  on kiosk_device_secrets(family_id, device_id)
  where revoked_at is null;

create index if not exists kiosk_device_secrets_secret_hash_idx on kiosk_device_secrets(secret_hash);

create table if not exists kiosk_child_sessions (
  id uuid primary key default uuid_generate_v4(),
  device_secret_id uuid not null references kiosk_device_secrets(id) on delete cascade,
  member_id uuid not null references family_members(id) on delete cascade,
  session_token_hash text not null,
  expires_at timestamptz not null,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists kiosk_child_sessions_token_hash_idx on kiosk_child_sessions(session_token_hash);

-- RLS policies can be added later; these tables are accessed via service role APIs.

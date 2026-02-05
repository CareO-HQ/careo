create table if not exists public.notification_dismissals (
    notification_id uuid not null references public.notifications(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    dismissed_at timestamptz not null default now(),
    primary key (notification_id, user_id)
);

-- Enable RLS
alter table public.notification_dismissals enable row level security;

-- Policies
create policy "Users can view their own dismissals"
    on public.notification_dismissals for select
    using (auth.uid() = user_id);

create policy "Users can insert their own dismissals"
    on public.notification_dismissals for insert
    with check (auth.uid() = user_id);

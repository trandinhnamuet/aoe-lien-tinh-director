-- Birth date is now stored as free text so it can hold partial/odd formats
-- (year only "1990", month-year "05-1990", "20-05-1990", etc.). Idempotent.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'aoe' and table_name = 'players'
      and column_name = 'birth_date' and data_type = 'date'
  ) then
    alter table aoe.players alter column birth_date type text using birth_date::text;
  end if;
end $$;

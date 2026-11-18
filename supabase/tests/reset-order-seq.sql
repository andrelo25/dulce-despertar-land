-- Reinicia el contador de pedidos tras pruebas manuales. Solo válido si orders está vacía.
do $$ begin
  if (select count(*) from public.orders) = 0 then
    alter table public.orders alter column id restart with 1001;
  end if;
end $$;

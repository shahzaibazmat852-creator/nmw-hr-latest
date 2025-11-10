-- Prevent recording payments exceeding remaining salary

-- Create or replace function to enforce overpayment guard
create or replace function public.prevent_overpayment()
returns trigger
language plpgsql
as $$
declare
  target_payroll_id uuid;
  final_salary numeric;
  total_paid numeric;
  new_total_paid numeric;
begin
  -- Determine target payroll id from NEW or OLD
  target_payroll_id := coalesce(NEW.payroll_id, OLD.payroll_id);

  -- Load payroll final salary
  select p.final_salary into final_salary
  from public.payroll p
  where p.id = target_payroll_id;

  if final_salary is null then
    raise exception 'Payroll record not found for id %', target_payroll_id;
  end if;

  -- Sum existing payments for this payroll (exclude current row on update)
  select coalesce(sum(amount), 0) into total_paid
  from public.payments
  where payroll_id = target_payroll_id
    and (TG_OP <> 'UPDATE' or id <> OLD.id);

  new_total_paid := total_paid + coalesce(NEW.amount, 0);

  if new_total_paid > final_salary then
    raise exception 'Payment would exceed remaining salary. Max remaining: %', (final_salary - total_paid);
  end if;

  return NEW;
end;
$$;

-- Create trigger for INSERT and UPDATE on payments
drop trigger if exists trg_prevent_overpayment on public.payments;
create trigger trg_prevent_overpayment
before insert or update on public.payments
for each row
execute procedure public.prevent_overpayment();



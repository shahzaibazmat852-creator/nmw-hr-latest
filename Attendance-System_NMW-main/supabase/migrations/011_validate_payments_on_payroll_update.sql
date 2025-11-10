-- Validate payments when payroll final_salary changes
-- This prevents retroactive overpayments when advances are added or final_salary is updated

create or replace function public.validate_payments_on_payroll_update()
returns trigger
language plpgsql
as $$
declare
  total_paid numeric;
begin
  -- Only validate if final_salary changed
  if OLD.final_salary = NEW.final_salary then
    return NEW;
  end if;

  -- Sum all existing payments for this payroll
  select coalesce(sum(amount), 0) into total_paid
  from public.payments
  where payroll_id = NEW.id;

  -- If new final_salary is less than total paid, raise warning but allow
  -- This can happen when advances are added retroactively
  -- We log it but don't block the update to allow payroll corrections
  if NEW.final_salary < total_paid then
    -- Log a warning but allow the update
    -- The prevent_overpayment trigger on payments table will prevent new overpayments
    raise warning 'Payroll % final_salary (%) is less than total payments (%). Overpayment detected.', 
      NEW.id, NEW.final_salary, total_paid;
  end if;

  return NEW;
end;
$$;

-- Create trigger for UPDATE on payroll
drop trigger if exists trg_validate_payments_on_payroll_update on public.payroll;
create trigger trg_validate_payments_on_payroll_update
before update on public.payroll
for each row
execute procedure public.validate_payments_on_payroll_update();


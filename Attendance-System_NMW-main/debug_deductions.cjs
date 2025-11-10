const { createClient } = require('@supabase/supabase-js');

// Supabase configuration (hardcoded for debugging)
const SUPABASE_URL = 'https://lfknrgwaslghsubuwbjq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxma25yZ3dhc2xnaHN1YnV3YmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNzA0MTAsImV4cCI6MjA3NTc0NjQxMH0.kTwTIgW9ACAzMKG-6Rt-fyLU-mvfHlxCPnbrfDbeFQA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debugDeductions() {
  try {
    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    console.log(`Checking deductions for ${currentMonth}/${currentYear}`);
    
    // Fetch payroll data for current month
    const { data, error } = await supabase
      .from('payroll')
      .select('id, employee_id, absence_deduction, advance_amount, final_salary')
      .eq('month', currentMonth)
      .eq('year', currentYear);
      
    if (error) {
      console.error('Error fetching payroll data:', error);
      return;
    }
    
    console.log(`Found ${data.length} payroll records`);
    
    // Calculate totals
    let totalAbsenceDeduction = 0;
    let totalAdvanceAmount = 0;
    let totalDeductions = 0;
    
    data.forEach(record => {
      const absenceDeduction = Number(record.absence_deduction) || 0;
      const advanceAmount = Number(record.advance_amount) || 0;
      
      totalAbsenceDeduction += absenceDeduction;
      totalAdvanceAmount += advanceAmount;
      totalDeductions += absenceDeduction + advanceAmount;
    });
    
    console.log('=== Deduction Analysis ===');
    console.log(`Total Undertime Deductions: PKR ${Math.round(totalAbsenceDeduction).toLocaleString()}`);
    console.log(`Total Advance Deductions: PKR ${Math.round(totalAdvanceAmount).toLocaleString()}`);
    console.log(`Total Combined Deductions: PKR ${Math.round(totalDeductions).toLocaleString()}`);
    
    // Show sample records
    console.log('\n=== Sample Records ===');
    data.slice(0, 5).forEach(record => {
      console.log(`Employee ID: ${record.employee_id}`);
      console.log(`  Undertime Deduction: PKR ${Math.round(Number(record.absence_deduction) || 0).toLocaleString()}`);
      console.log(`  Advance Deduction: PKR ${Math.round(Number(record.advance_amount) || 0).toLocaleString()}`);
      console.log(`  Total Deductions: PKR ${Math.round((Number(record.absence_deduction) || 0) + (Number(record.advance_amount) || 0)).toLocaleString()}`);
      console.log(`  Final Salary: PKR ${Math.round(Number(record.final_salary) || 0).toLocaleString()}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugDeductions();
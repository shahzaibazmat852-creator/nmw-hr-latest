// Gemini AI Service for NMW Attendance-PayRoll System
// Provides AI-powered chat functionality

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

class GeminiService {
  private apiKey: string;
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Gemini API key not configured. AI features will not work.');
    }
  }

  async sendMessage(message: string, context?: string, conversationHistory?: ChatMessage[]): Promise<string> {
    try {
      const systemPrompt = `You are an intelligent AI assistant for the NMW Attendance-PayRoll System. 
You have COMPREHENSIVE access to ALL historical data including:
- Complete employee records (active and inactive)
- All payroll records across all time periods
- All attendance records with detailed timing information
- All advance transactions
- All payment transactions
- Department-wise breakdowns
- Employee performance patterns

You can answer COMPLEX analytical queries such as:
- Trend analysis over time periods
- Comparative analysis between employees/departments
- Statistical calculations and aggregations
- Pattern recognition in attendance/payroll data
- Financial forecasting and projections
- Performance evaluations
- Multi-dimensional queries combining multiple data points

When answering queries:
1. Use the comprehensive data provided to give accurate, detailed answers
2. Perform calculations when needed (averages, totals, percentages, trends)
3. Provide insights and analysis, not just raw data
4. Reference specific data points when relevant
5. Be professional and clear in your responses
6. If asked about trends, compare data across time periods
7. If asked about comparisons, analyze differences between entities
8. Always use PKR currency format for amounts
9. Format numbers with commas for readability (e.g., 1,234,567)

System Context: ${context || 'Comprehensive payroll and attendance management system with complete historical data'}

Remember the conversation context and build upon previous messages. Provide detailed, analytical responses that demonstrate deep understanding of the data.`;

      // Build conversation history
      let conversationText = '';
      if (conversationHistory && conversationHistory.length > 0) {
        conversationText = '\n\nConversation History:\n';
        conversationHistory.forEach(msg => {
          const role = msg.role === 'user' ? 'User' : 'Assistant';
          conversationText += `${role}: ${msg.content}\n`;
        });
      }

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}${conversationText}\n\nUser: ${message}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048, // Increased for complex analytical responses
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('No response from Gemini API');
      }
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw new Error('Failed to get AI response. Please try again.');
    }
  }

  // Generate insights about payroll data
  async generatePayrollInsights(payrollData: any[], conversationHistory?: ChatMessage[]): Promise<string> {
    const context = `Payroll Data Summary:
- Total employees: ${payrollData.length}
- Total payroll amount: PKR ${payrollData.reduce((sum, p) => sum + Number(p.final_salary || 0), 0).toLocaleString()}
- Average salary: PKR ${payrollData.length > 0 ? Math.round(payrollData.reduce((sum, p) => sum + Number(p.final_salary || 0), 0) / payrollData.length).toLocaleString() : 0}
- Departments: ${[...new Set(payrollData.map(p => p.employees?.department))].join(', ')}`;

    return this.sendMessage('Please analyze this payroll data and provide insights and recommendations.', context, conversationHistory);
  }

  // Generate attendance insights
  async generateAttendanceInsights(attendanceData: any[], conversationHistory?: ChatMessage[]): Promise<string> {
    const context = `Attendance Data Summary:
- Total records: ${attendanceData.length}
- Present: ${attendanceData.filter(a => a.status === 'present').length}
- Absent: ${attendanceData.filter(a => a.status === 'absent').length}
- Leave: ${attendanceData.filter(a => a.status === 'leave').length}
- Holiday: ${attendanceData.filter(a => a.status === 'holiday').length}`;

    return this.sendMessage('Please analyze this attendance data and provide insights and recommendations.', context, conversationHistory);
  }

  // Generate employee insights
  async generateEmployeeInsights(employees: any[], conversationHistory?: ChatMessage[]): Promise<string> {
    const context = `Employee Data Summary:
- Total employees: ${employees.length}
- Active employees: ${employees.filter(e => e.is_active).length}
- Departments: ${[...new Set(employees.map(e => e.department))].join(', ')}
- Average salary: PKR ${employees.length > 0 ? Math.round(employees.reduce((sum, e) => sum + Number(e.base_salary || 0), 0) / employees.length).toLocaleString() : 0}`;

    return this.sendMessage('Please analyze this employee data and provide insights and recommendations.', context, conversationHistory);
  }
}

export const geminiService = new GeminiService();
export type { ChatMessage };

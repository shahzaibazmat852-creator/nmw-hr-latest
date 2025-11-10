import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Lock, Mail, Building2, Shield, Users, Info } from "lucide-react";
import { authService, LoginCredentials } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Login form state
  const [loginForm, setLoginForm] = useState<LoginCredentials>({
    email: "",
    password: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { user, error } = await authService.signIn(loginForm);
      
      if (error) {
        setError(error.message);
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (user) {
        setSuccess("Login successful! Redirecting...");
        toast({
          title: "Welcome!",
          description: "You have successfully logged in.",
        });
        setTimeout(() => {
          navigate("/");
        }, 1500);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      toast({
        title: "Login Error",
        description: `Failed to login: ${errorMessage}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handleForgotPassword = async () => {
    if (!loginForm.email) {
      setError("Please enter your email address first");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await authService.resetPassword(loginForm.email);
      
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Password reset email sent! Check your inbox.");
        toast({
          title: "Email Sent",
          description: "Check your email for password reset instructions.",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send reset email";
      setError(errorMessage);
      toast({
        title: "Reset Password Error",
        description: `Failed to send reset email: ${errorMessage}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                NMW Payroll
              </h1>
              <p className="text-sm text-muted-foreground">Attendance & HR System</p>
            </div>
          </div>
          <p className="text-muted-foreground">
            Secure access to your payroll management system
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm dark:backdrop-blur-md">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your NMW Payroll account
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Error/Success Messages */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="mb-4 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30">
                <AlertDescription className="text-green-800 dark:text-green-300">{success}</AlertDescription>
              </Alert>
            )}

            {/* Information Alert */}
            <Alert className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30">
              <Info className="h-4 w-4 text-blue-800 dark:text-blue-300" />
              <AlertDescription className="text-blue-800 dark:text-blue-300">
                <strong>Admin Access Required:</strong> User accounts are managed by the system administrator. 
                Contact your admin if you need access.
              </AlertDescription>
            </Alert>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-11 px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="link"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  className="p-0 h-auto text-sm"
                >
                  Forgot password?
                </Button>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-primary hover:shadow-lg transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing In...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <Separator className="my-6" />

            {/* Features */}
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">Secure & Reliable</p>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Encrypted
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Multi-user
                </div>
                <div className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Enterprise
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-muted-foreground">
          <p>© 2025 NMW Payroll System. All rights reserved.</p>
          <p className="mt-1">Developed by Shahzaib</p>
        </div>
      </div>
    </div>
  );
}

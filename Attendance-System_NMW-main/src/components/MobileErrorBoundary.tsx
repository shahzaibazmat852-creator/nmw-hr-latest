import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAndroidChrome, getAndroidDeviceInfo } from "@/utils/androidUtils";

interface MobileErrorBoundaryProps {
  children: React.ReactNode;
}

interface MobileErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export default class MobileErrorBoundary extends React.Component<MobileErrorBoundaryProps, MobileErrorBoundaryState> {
  constructor(props: MobileErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): MobileErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Mobile Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isAndroid = isAndroidChrome();
      const deviceInfo = getAndroidDeviceInfo();
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
          <div className="max-w-md mx-auto mt-20">
            <Alert className="border-destructive/20 bg-destructive/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    {isAndroid ? "Android Chrome Compatibility Issue" : "Mobile Compatibility Issue"}
                  </h3>
                  <p className="text-sm">
                    The application encountered an error on your mobile device. This might be due to:
                  </p>
                  <ul className="text-sm mt-2 space-y-1">
                    <li>• Browser compatibility issues</li>
                    <li>• Network connectivity problems</li>
                    <li>• JavaScript errors</li>
                    {isAndroid && <li>• Android WebView limitations</li>}
                  </ul>
                  {deviceInfo && (
                    <div className="text-xs mt-2 p-2 bg-muted rounded">
                      <strong>Device Info:</strong> Android: {deviceInfo.isAndroid ? 'Yes' : 'No'}, 
                      Chrome: {deviceInfo.isChrome ? 'Yes' : 'No'}, 
                      Version: {deviceInfo.version || 'Unknown'}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reload Page
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => this.setState({ hasError: false })}
                  >
                    Try Again
                  </Button>
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer">Error Details</summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {this.state.error?.toString()}
                  </pre>
                </details>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

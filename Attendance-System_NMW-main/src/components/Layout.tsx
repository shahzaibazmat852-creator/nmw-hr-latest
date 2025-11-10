import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Receipt, 
  BarChart3,
  Menu,
  X,
  Bot,
  BookOpen,
  FileText,
  History,
  FileEdit
} from "lucide-react";
import { useState, useEffect } from "react";
import AIChatDialog from "./AIChatDialog";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import VersionDisplay from "./VersionDisplay";

interface LayoutProps {
  children: ReactNode;
}

const ADMIN_USER_ID = "cecd07a6-491b-46e7-8962-3545f7f6c5f2";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Employees", path: "/employees" },
  { icon: Calendar, label: "Attendance", path: "/attendance" },
  { icon: Receipt, label: "Payroll", path: "/payroll" },
  { icon: FileText, label: "Ledger", path: "/employee-ledger" },
  { icon: BarChart3, label: "Reports", path: "/reports" },
];

const adminNavItems = [
  { icon: History, label: "Login History", path: "/login-history" },
  { icon: FileEdit, label: "Edit History", path: "/edit-history" },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Always start closed
  const [chatOpen, setChatOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    // Initialize based on physical screen width (not affected by zoom)
    if (typeof window !== 'undefined') {
      return window.screen.width < 768;
    }
    return false;
  });
  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window !== 'undefined') {
      const width = window.screen.width;
      return width >= 768 && width < 1024;
    }
    return false;
  });
  const { user, signOut } = useAuth();

  // Detect screen size based on physical screen pixels, not zoomed viewport
  useEffect(() => {
    const checkScreenSize = () => {
      // Use window.screen.width which is physical pixels, not CSS pixels
      // This prevents zoom from affecting the layout
      const physicalWidth = window.screen.width;
      setIsMobile(physicalWidth < 768);
      setIsTablet(physicalWidth >= 768 && physicalWidth < 1024);
    };

    // Check immediately
    checkScreenSize();
    
    // Only listen to actual window resize (orientation change), not zoom
    // Note: resize event fires on zoom, but screen.width doesn't change
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkScreenSize, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const isAdmin = user?.id === ADMIN_USER_ID;
  const displayNavItems = isAdmin ? [...navItems, ...adminNavItems] : navItems;

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Mobile Overlay */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={() => setSidebarOpen(false)}
          style={{ transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border print:hidden top-0 h-screen z-50",
          "will-change-transform",
          // Mobile: completely hidden/shown, Tablet: smaller width, Desktop: icon/full width
          isMobile ? "fixed" : "sticky",
          sidebarOpen 
            ? "translate-x-0" 
            : isMobile ? "-translate-x-full" : "translate-x-0"
        )}
        style={{
          width: isMobile ? '224px' : (sidebarOpen ? (isTablet ? '208px' : '256px') : (isTablet ? '64px' : '80px')),
          backfaceVisibility: 'hidden',
          transition: isMobile 
            ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
            : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        } as React.CSSProperties}
      >
        {/* Header */}
        <div className={cn(
          "border-b border-sidebar-border transition-all duration-300",
          sidebarOpen ? "p-3 md:p-4 lg:p-6" : "p-3 md:p-3 lg:p-3"
        )}>
          <div className="flex items-center justify-between">
            <div className={cn(
              "transition-all duration-500 ease-out overflow-hidden",
              sidebarOpen ? "opacity-100 max-w-full" : "opacity-0 max-w-0"
            )}>
              <h1 className="text-base md:text-lg lg:text-xl font-bold text-sidebar-primary whitespace-nowrap truncate">
                NMW Payroll
              </h1>
              <p className="text-xs text-sidebar-foreground/60 mt-1 whitespace-nowrap truncate">
                Attendance & HR System
              </p>
            </div>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-sidebar-accent rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center"
              style={{
                transform: 'translateZ(0)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {sidebarOpen ? (
                <X size={20} className="text-sidebar-foreground" />
              ) : (
                <Menu size={20} className="text-sidebar-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 md:p-3 lg:p-4 space-y-1 md:space-y-2 overflow-y-auto overflow-x-hidden">
          {displayNavItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  // Close sidebar on mobile only
                  if (isMobile) {
                    setSidebarOpen(false);
                  }
                }}
                className={cn(
                  "flex items-center rounded-lg relative overflow-hidden group",
                  "transition-all duration-300 ease-out",
                  sidebarOpen ? "gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3" : "gap-0 px-2 md:px-3 py-2 md:py-3 md:justify-center lg:justify-center",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-medium hover:shadow-strong" 
                    : "hover:bg-sidebar-accent/80 text-sidebar-foreground hover:text-sidebar-foreground"
                )}
                style={{
                  transform: 'translateZ(0)',
                  transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transitionDelay: `${index * 25}ms`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px) translateZ(0) scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0) translateZ(0) scale(1)';
                }}
              >
                {/* Active indicator */}
                {isActive && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 bg-sidebar-primary-foreground rounded-r-full"
                    style={{
                      animation: 'scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                )}
                
                <div className={cn(
                  "flex items-center justify-center transition-all duration-300 shrink-0",
                  sidebarOpen ? "min-w-[20px]" : "min-w-[20px]"
                )}>
                  <Icon 
                    size={18} 
                    className={cn(
                      "md:w-5 md:h-5 transition-all duration-300",
                      isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground"
                    )}
                    style={{ 
                      transform: 'translateZ(0)',
                      filter: 'drop-shadow(0 0 0 transparent)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                </div>
                
                <span 
                  className={cn(
                    "font-medium text-sm md:text-base whitespace-nowrap transition-all duration-500 ease-out truncate",
                    sidebarOpen ? "opacity-100 ml-0" : "opacity-0 max-w-0"
                  )}
                  style={{
                    maxWidth: sidebarOpen ? (isTablet ? '140px' : '200px') : '0',
                    transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 md:p-3 lg:p-4 border-t border-sidebar-border space-y-2 md:space-y-3 transition-all duration-300 flex-shrink-0">
          {/* Theme Toggle */}
          <div className={cn(
            "flex items-center transition-all duration-300",
            sidebarOpen ? "justify-start" : "justify-center"
          )}>
            <ThemeToggle />
            {sidebarOpen && (
              <span className="ml-2 md:ml-3 text-xs text-sidebar-foreground/60 whitespace-nowrap transition-all duration-500 ease-out truncate">
                Theme
              </span>
            )}
          </div>

          <div className={cn(
            "text-xs text-sidebar-foreground/40 text-center transition-all duration-500 ease-out overflow-hidden",
            sidebarOpen ? "opacity-100 max-h-40" : "opacity-0 max-h-0"
          )}>
            <div className="mb-2">
              <p className="text-sidebar-foreground/60">Welcome,</p>
              <p className="font-medium text-sidebar-foreground truncate">{user?.email}</p>
            </div>
            <p>Developed by Shahzaib</p>
          </div>
          
          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="sm"
            className={cn(
              "w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-300 group text-sm",
              sidebarOpen ? "justify-start px-3 md:px-4" : "justify-center px-2"
            )}
            style={{
              transform: 'translateZ(0)',
              transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateX(4px) translateZ(0) scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateX(0) translateZ(0) scale(1)';
            }}
          >
            <LogOut 
              className={cn(
                "h-4 w-4 transition-all duration-300 shrink-0",
                sidebarOpen ? "mr-2" : "mr-0"
              )}
              style={{
                transform: 'translateZ(0)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
            <span 
              className="transition-all duration-500 ease-out whitespace-nowrap truncate"
              style={{
                maxWidth: sidebarOpen ? (isTablet ? '120px' : '200px') : '0',
                opacity: sidebarOpen ? 1 : 0,
              }}
            >
              Sign Out
            </span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 overflow-auto w-full min-w-0 ${isMobile ? 'pt-16' : ''}`}>
        {/* Mobile Menu Button */}
        {isMobile && (
          <div className="fixed top-4 left-4 z-30 print:hidden">
            <Button
              size="sm"
              variant="outline"
              className="bg-background/95 backdrop-blur-sm shadow-md"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        )}
        {children}
      </main>

      {/* AI Chat Button */}
      <div className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-50 print:hidden">
        <Button
          size="lg"
          className="rounded-full shadow-lg bg-gradient-primary hover:shadow-xl transition-all duration-300 h-12 w-12 lg:h-auto lg:w-auto p-3 lg:px-4 lg:py-2"
          onClick={() => setChatOpen(true)}
        >
          <Bot className="h-5 w-5 lg:mr-2" />
          <span className="hidden lg:inline">AI Assistant</span>
        </Button>
      </div>

      {/* AI Chat Dialog */}
      <AIChatDialog open={chatOpen} onOpenChange={setChatOpen} />
      
      {/* Version Display - for deployment verification */}
      <VersionDisplay />
    </div>
  );
}

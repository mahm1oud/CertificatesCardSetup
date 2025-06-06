import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { LogOut, LogIn, UserPlus, Home, FileCheck, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

interface NavbarProps {
  user: User | null;
  setUser: (user: User | null) => void;
}

export default function Navbar({ user, setUser }: NavbarProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        setUser(null);
        toast({
          title: "Logged out",
          description: "You have been successfully logged out.",
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "An error occurred during logout.",
        variant: "destructive",
      });
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/">
              <a className="flex items-center space-x-2">
                <FileCheck className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">CertifyMe</span>
              </a>
            </Link>
          </div>

          <nav className="hidden md:flex space-x-4">
            <Link href="/">
              <a className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                location === "/" 
                  ? "text-primary bg-primary/10" 
                  : "text-gray-700 hover:text-primary dark:text-gray-300"
              }`}>
                <Home className="mr-1 h-4 w-4" />
                Home
              </a>
            </Link>
          </nav>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
            {user ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Hi, {user.name}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="mr-1 h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    <LogIn className="mr-1 h-4 w-4" />
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="default" size="sm">
                    <UserPlus className="mr-1 h-4 w-4" />
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

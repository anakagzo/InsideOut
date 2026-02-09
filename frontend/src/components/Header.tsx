import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (!isHome) {
      navigate("/#" + id);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-hero-gradient flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
              EduConnect
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollToSection("courses")} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Courses
            </button>
            <button onClick={() => scrollToSection("about")} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              About
            </button>
            <Link to="/courses" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              All Courses
            </Link>
            <Button size="sm" onClick={() => setAuthOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <User className="w-4 h-4 mr-1" /> Account
            </Button>
          </nav>

          {/* Mobile toggle */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-foreground">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-b border-border px-4 pb-4 space-y-3">
            <button onClick={() => scrollToSection("courses")} className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-primary py-2">
              Courses
            </button>
            <button onClick={() => scrollToSection("about")} className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-primary py-2">
              About
            </button>
            <Link to="/courses" className="block text-sm font-medium text-muted-foreground hover:text-primary py-2" onClick={() => setMobileMenuOpen(false)}>
              All Courses
            </Link>
            <Button size="sm" onClick={() => { setAuthOpen(true); setMobileMenuOpen(false); }} className="w-full bg-primary text-primary-foreground">
              <User className="w-4 h-4 mr-1" /> Account
            </Button>
          </div>
        )}
      </header>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}

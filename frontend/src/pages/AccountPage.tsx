import { useState } from "react";
import { BookOpen, Users, Calendar, Settings, User, LogOut, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { CoursesTab } from "@/components/account/CoursesTab";
import { EnrollmentsTab } from "@/components/account/EnrollmentsTab";
import { SchedulesTab } from "@/components/account/SchedulesTab";
import { UsersTab } from "@/components/account/UsersTab";
import { ProfilePanel } from "@/components/account/ProfilePanel";
import { SettingsPanel } from "@/components/account/SettingsPanel";

const AccountPage = () => {
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<"menu" | "profile" | "settings">("menu");
  
  // Mock current user - in real app this would come from auth context
  const isAdmin = true; // Toggle to test admin vs student view
  const currentUserId = isAdmin ? "3" : "1"; // Admin or Jane Doe

  const handleLogout = () => {
    setLogoutOpen(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">My Account</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-1" /> Menu
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-card w-80 sm:w-96 lg:w-[28rem] overflow-y-auto">
              {sidebarView === "menu" && (
                <>
                  <div className="flex flex-col items-center py-6 border-b border-border mb-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary mb-2">
                      {isAdmin ? "AT" : "JD"}
                    </div>
                    <p className="font-semibold text-card-foreground">
                      {isAdmin ? "Admin Tutor" : "Jane Doe"}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 ${
                      isAdmin ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground"
                    }`}>
                      {isAdmin ? "Tutor / Admin" : "Student"}
                    </span>
                  </div>
                  <nav className="space-y-1">
                    <button
                      onClick={() => setSidebarView("profile")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent text-card-foreground text-sm font-medium"
                    >
                      <User className="w-4 h-4" /> Profile
                    </button>
                    <button
                      onClick={() => setSidebarView("settings")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent text-card-foreground text-sm font-medium"
                    >
                      <Settings className="w-4 h-4" /> Settings
                    </button>
                    <button
                      onClick={() => setLogoutOpen(true)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 text-destructive text-sm font-medium"
                    >
                      <LogOut className="w-4 h-4" /> Log Out
                    </button>
                  </nav>
                </>
              )}

              {sidebarView === "profile" && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-4"
                    onClick={() => setSidebarView("menu")}
                  >
                    ← Back
                  </Button>
                  <ProfilePanel currentUserId={currentUserId} />
                </div>
              )}

              {sidebarView === "settings" && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-4"
                    onClick={() => setSidebarView("menu")}
                  >
                    ← Back
                  </Button>
                  <SettingsPanel isAdmin={isAdmin} />
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>

        <Tabs defaultValue="courses">
          <TabsList className="bg-muted mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="courses" className="gap-1">
              <BookOpen className="w-4 h-4" /> Courses
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="enrollments" className="gap-1">
                <GraduationCap className="w-4 h-4" /> Enrollments
              </TabsTrigger>
            )}
            <TabsTrigger value="schedules" className="gap-1">
              <Calendar className="w-4 h-4" /> Schedules
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="gap-1">
                <Users className="w-4 h-4" /> Users
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="courses">
            <CoursesTab isAdmin={isAdmin} currentUserId={currentUserId} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="enrollments">
              <EnrollmentsTab />
            </TabsContent>
          )}

          <TabsContent value="schedules">
            <SchedulesTab isAdmin={isAdmin} currentUserId={currentUserId} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users">
              <UsersTab />
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Logout dialog */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Log out?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to log out of your account?</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" autoFocus onClick={() => setLogoutOpen(false)}>
              No, stay
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Yes, log out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default AccountPage;

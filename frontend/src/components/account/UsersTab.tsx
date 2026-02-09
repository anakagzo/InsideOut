import { useState } from "react";
import { Search, Users as UsersIcon, GraduationCap, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { users, courses } from "@/lib/mock-data";

export const UsersTab = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(query) ||
      u.lastName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.occupation.toLowerCase().includes(query)
    );
  });

  const studentCount = users.filter((u) => u.role === "student").length;
  const totalEnrollments = users.reduce((acc, u) => acc + u.enrolledCourses.length, 0);

  const getCourse = (courseId: string) => courses.find((c) => c.id === courseId);

  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      enrolled: "bg-success/10 text-success",
      completed: "bg-primary/10 text-primary",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground">{users.length}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground">{studentCount}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground">{totalEnrollments}</p>
              <p className="text-xs text-muted-foreground">Total Enrollments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name, email, or occupation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
                {user.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-card-foreground">
                    {user.firstName} {user.lastName}
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      user.role === "admin"
                        ? "bg-primary/10 text-primary"
                        : "bg-accent text-accent-foreground"
                    }`}
                  >
                    {user.role === "admin" ? "Admin" : "Student"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-sm text-muted-foreground">{user.occupation}</p>

                {user.enrolledCourses.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Enrolled Courses
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {user.enrolledCourses.map((ec) => (
                        <div
                          key={ec.courseId}
                          className="flex items-center gap-1.5 text-xs bg-secondary px-2 py-1 rounded"
                        >
                          <span className="text-card-foreground truncate max-w-[150px]">
                            {getCourse(ec.courseId)?.title}
                          </span>
                          <StatusBadge status={ec.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <UsersIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No users found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

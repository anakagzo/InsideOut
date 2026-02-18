import { useEffect, useMemo, useState } from "react";
import { Search, Users as UsersIcon, GraduationCap, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEnrollments, fetchUsers } from "@/store/thunks";
import { selectFilteredUsers, selectUsersStats } from "@/store/selectors/accountSelectors";

export const UsersTab = () => {
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState("");

  const usersStatus = useAppSelector((state) => state.users.requests.fetchUsers.status);
  const filteredUsers = useAppSelector((state) => selectFilteredUsers(state, searchQuery));
  const stats = useAppSelector(selectUsersStats);

  useEffect(() => {
    dispatch(fetchUsers({ page: 1, page_size: 100 }));
    dispatch(fetchEnrollments({ page: 1, page_size: 100 }));
  }, [dispatch]);

  if (usersStatus === "loading" || usersStatus === "idle") {
    return <p className="text-sm text-muted-foreground">Loading users...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground">{stats.usersTotal}</p>
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
              <p className="text-2xl font-bold text-card-foreground">{stats.studentCount}</p>
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
              <p className="text-2xl font-bold text-card-foreground">{stats.enrollmentsTotal}</p>
              <p className="text-xs text-muted-foreground">Total Enrollments</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name, email, or occupation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

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
                    {user.first_name} {user.last_name}
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

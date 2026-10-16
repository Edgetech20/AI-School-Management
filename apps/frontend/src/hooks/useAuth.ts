import { useEffect, useState } from "react";
import { getCurrentUser, type CurrentUser } from "../api/auth";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setIsAuthenticated(false);
      return;
    }
    getCurrentUser()
      .then((me) => {
        setCurrentUser(me);
        setIsAuthenticated(true);
      })
      .catch(() => {
        setIsAuthenticated(false);
        setCurrentUser(null);
        localStorage.removeItem("auth_token");
      });
  }, []);

  const login = async () => {
    const me = await getCurrentUser();
    setCurrentUser(me);
    setIsAuthenticated(true);
  };

  return { isAuthenticated, currentUser, login };
}

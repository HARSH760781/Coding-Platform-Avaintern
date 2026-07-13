// frontend/src/hooks/useRole.js

import { useState, useEffect } from "react";

export const useRole = () => {
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyRole = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setLoading(false);
          return;
        }

        const serverURL =
          import.meta.env.VITE_API_URL || "http://localhost:8000/api";

        // ✅ This calls the Coding Platform's backend
        const response = await fetch(`${serverURL}/auth/verify-role`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.success) {
          setUserRole(data.role);
          setIsAdmin(data.isAdmin || false);
        } else {
          setError(data.error || "Failed to verify role");
        }
      } catch (err) {
        console.error("Error verifying role:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    verifyRole();
  }, []);

  return { userRole, isAdmin, loading, error };
};

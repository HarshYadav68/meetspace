import { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem("meetspace_token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
      } catch (error) {
        localStorage.removeItem("meetspace_token");
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("meetspace_token", data.token);
    setUser(data);
    return data;
  };

  const login = async (payload) => {
    const { data } = await api.post("/auth/login", payload);
    localStorage.setItem("meetspace_token", data.token);
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("meetspace_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

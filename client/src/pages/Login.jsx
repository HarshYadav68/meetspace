import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(form);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-md rounded border border-slate-800 p-6">
      <h2 className="mb-4 text-2xl font-semibold">Login</h2>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full rounded bg-slate-800 p-2" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        <input className="w-full rounded bg-slate-800 p-2" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="w-full rounded bg-cyan-600 py-2">Sign In</button>
      </form>
      <p className="mt-3 text-sm text-slate-400">
        New user? <Link to="/register" className="text-cyan-400">Register</Link>
      </p>
    </div>
  );
};

export default Login;

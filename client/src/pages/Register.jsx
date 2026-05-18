import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-md rounded border border-slate-800 p-6">
      <h2 className="mb-4 text-2xl font-semibold">Register</h2>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full rounded bg-slate-800 p-2" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        <input className="w-full rounded bg-slate-800 p-2" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        <input className="w-full rounded bg-slate-800 p-2" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="w-full rounded bg-cyan-600 py-2">Create Account</button>
      </form>
      <p className="mt-3 text-sm text-slate-400">
        Already have an account? <Link to="/login" className="text-cyan-400">Login</Link>
      </p>
    </div>
  );
};

export default Register;

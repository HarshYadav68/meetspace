import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  return (
    <nav className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
      <Link to="/" className="text-xl font-bold text-cyan-400">
        MeetSpace
      </Link>
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <span className="text-sm text-slate-300">{user.name}</span>
            <button onClick={logout} className="rounded bg-slate-800 px-3 py-1 text-sm">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-sm">
              Login
            </Link>
            <Link to="/register" className="rounded bg-cyan-600 px-3 py-1 text-sm">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

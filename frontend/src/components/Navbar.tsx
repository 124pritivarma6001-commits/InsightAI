import { Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, User } from "lucide-react";
import { useAuth } from "../hooks/AuthContext";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 px-4 md:px-8 py-3 bg-gradient-to-b from-indigo-50/50 via-white/40 to-transparent backdrop-blur-xs">
      <div className="max-w-7xl mx-auto bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-full px-5 h-13 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M4 19h4V9H4v10zm6 0h4V5h-4v14zm6 0h4v-7h-4v7z" />
            </svg>
          </div>
          <span className="font-bold text-slate-800 text-sm tracking-tight">AI Dashboard Generator</span>
        </Link>
        <div className="flex items-center gap-5">
          {isAuthenticated ? (
            <>
              <Link
                to="/datasets"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                My Datasets
              </Link>
              <div className="h-4 w-px bg-slate-200" />
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {user?.email}
              </span>
              <div className="h-4 w-px bg-slate-200" />
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition">
                Log in
              </Link>
              <Link
                to="/register"
                className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-full shadow-xs transition"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

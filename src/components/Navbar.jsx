import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Navbar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">JT</span>
        <span>Job Tracker</span>
      </div>
      <nav className="navbar-links">
        <NavLink to="/board" className={({ isActive }) => (isActive ? 'active' : '')}>
          Board
        </NavLink>
        {user.role === 'admin' && (
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
            Dashboard
          </NavLink>
        )}
        {user.role === 'admin' && (
          <NavLink to="/log" className={({ isActive }) => (isActive ? 'active' : '')}>
            Log
          </NavLink>
        )}
      </nav>
      <div className="navbar-user">
        <span className="avatar" style={{ background: user.color }}>
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="navbar-user-info">
          <strong>{user.name}</strong>
          <small>{user.role === 'admin' ? 'Team lead' : 'Designer'}</small>
        </div>
        <button className="btn-ghost" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
}

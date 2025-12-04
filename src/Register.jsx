// Register.jsx
import { useState } from 'react';
import { useAuth } from './AuthContext.jsx';

export default function Register({ onBack }) {
  const { register } = useAuth();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await register(u, p); onBack?.(); }
    catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="sc-page">
      <header className="sc-nav">
        <div className="brand">WIN MUSIC</div>
        <div className="nav-center">
          <button className="btn-outline" onClick={onBack}>← Back</button>
          <button className="btn-outline" disabled>REGISTER</button>
        </div>
        <div className="search"><input placeholder="Search for products..." disabled/></div>
        <div className="icons"><span>👤</span><span>🛒</span><span>⚙️</span></div>
      </header>

      <section className="sc-section">
        <div className="section-head"><h2>Create Account</h2></div>
        <form className="form-card" onSubmit={onSubmit}>
          <div className="form-col">
            <label>Username</label>
            <input value={u} onChange={e=>setU(e.target.value)} />
            <label>Password</label>
            <input type="password" value={p} onChange={e=>setP(e.target.value)} />
            <button className="btn-dark" type="submit" disabled={loading}>
              {loading? 'Creating...' : 'Register'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

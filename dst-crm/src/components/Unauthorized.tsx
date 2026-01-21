import { Link } from 'react-router-dom';
import '../styles/Unauthorized.css';

export const Unauthorized = () => {
  return (
    <div className="unauthorized-container">
      <div className="unauthorized-box">
        <h1>403</h1>
        <h2>Prístup zamietnutý</h2>
        <p>Nemáte oprávnenie na prístup k tejto stránke.</p>
        <Link to="/dashboard" className="back-link">Späť na dashboard</Link>
      </div>
    </div>
  );
};

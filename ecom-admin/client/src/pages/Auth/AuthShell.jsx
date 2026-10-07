import { Component } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../../assets/nonsense-logo-light.svg';
import Ballpit from '../../components/effects/Ballpit';

class BallpitBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn('[Ballpit] render error:', error);
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

const AuthShell = ({ title, subtitle, children, footer }) => (
  <div className="login-page min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
    <div className="login-page__bg" aria-hidden="true">
      <BallpitBoundary>
        <Ballpit
          className="ballpit-bg"
          count={60}
          gravity={0.7}
          friction={0.8}
          wallBounce={0.95}
          followCursor
          colors={[0x9ec5ff, 0x4d8ef0, 0xffffff, 0x7eb6ff]}
          ambientColor={0xffffff}
          ambientIntensity={1.1}
          lightIntensity={110}
          minSize={0.65}
          maxSize={1.35}
          materialParams={{
            metalness: 0.08,
            roughness: 0.28,
            clearcoat: 0.5,
            clearcoatRoughness: 0.25,
            emissive: 0x143a6e,
            emissiveIntensity: 0.25,
          }}
        />
      </BallpitBoundary>
    </div>

    <div className="login-page__overlay" aria-hidden="true" />

    <div className="login-page__content w-full max-w-md">
      <div className="bg-transparent border-2 border-white/20 backdrop-blur-[13px] px-6 py-8 rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.1)]">
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center mb-4">
            <img src={logo} alt="NONSENSE" className="h-10 w-auto object-contain" />
          </div>
          <p className="text-white/90 text-lg mt-1">E-Commerce Admin Dashboard</p>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2 text-center">{title}</h2>
        {subtitle && <p className="text-white/80 text-sm text-center mb-6">{subtitle}</p>}

        {children}

        {footer || (
          <p className="text-center mt-6 text-sm text-white/80">
            <Link to="/login" className="text-white underline hover:text-white/90">
              Back to sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  </div>
);

export default AuthShell;

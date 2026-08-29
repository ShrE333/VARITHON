'use client';

/**
 * Sign-in for the whole platform. The role chosen here decides which of the
 * two products the visitor lands in: the pilgrim portal, or the Temple
 * Command Dashboard with its Super Admin section.
 *
 * The OTP is a fixed demo code — this establishes a role and a name, it does
 * not authenticate anyone. Writes are gated separately by ADMIN_API_TOKEN
 * (lib/admin-locations/auth.ts).
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [currentRole, setCurrentRole] = useState('user');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setInterval(() => setCountdown((n) => n - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const toggleAdmin = () => setCurrentRole((r) => (r === 'admin' ? 'user' : 'admin'));

  const sendOtp = () => {
    if (!phone || phone.length !== 10) {
      setErrorMsg('Invalid phone number. Must be 10 digits.');
      return;
    }
    setErrorMsg('');
    setOtpSent(true);
    setOtp('123456');
    setCountdown(30);
  };

  const handleSignIn = (e) => {
    e.preventDefault();
    if (otp !== '123456') {
      setErrorMsg('Invalid OTP. Use 123456.');
      return;
    }
    localStorage.setItem(
      'varimitra_user',
      JSON.stringify({ name: fullName, phone, age: age || 'N/A', role: currentRole }),
    );
    router.push(currentRole === 'user' ? '/varimitra' : '/command-dashboard');
  };

  return (
    <div className="vm-login">
<div className="login-container">
        <div className="login-lang-switcher" id="loginLangSwitcher"></div>

        <div className="brand-section">
          <div className="brand-logo">
            <i className="fa-solid fa-om"></i>
          </div>
          <h1 className="brand-name">VariMitra</h1>
          <p className="brand-tagline">One Platform. Safer Pilgrimage. Preserved Heritage.</p>
        </div>

        <div className="login-role-hint">
          {currentRole === 'user' ? (
            <>
              <i className="fa-solid fa-user-pray"></i>
              <span>Pilgrim / Devotee</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-user-shield"></i>
              <span>Temple Admin</span>
            </>
          )}
        </div>

        <form id="signInForm" onSubmit={handleSignIn}>
          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <div className="input-wrapper">
              <i className="fa-regular fa-user"></i>
              <input
                type="text"
                id="fullName"
                className="form-control"
                placeholder="Enter your full name"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Mobile Number</label>
            <div className="input-wrapper">
              <i className="fa-solid fa-phone"></i>
              <input
                type="tel"
                id="phone"
                className="form-control"
                placeholder="10-digit mobile number"
                pattern="[0-9]{10}"
                maxLength="10"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </div>

          {currentRole === 'user' && (
            <div className="form-group age-group">
              <label htmlFor="age">Age</label>
              <div className="input-wrapper">
                <i className="fa-regular fa-calendar"></i>
                <input
                  type="number"
                  id="age"
                  className="form-control"
                  placeholder="Enter your age"
                  min="5"
                  max="120"
                  required
                  value={age}
                  onChange={e => setAge(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="otp">One-Time Password (OTP)</label>
            <div className="otp-group">
              <div className="input-wrapper" style={{ flex: 1 }}>
                <i className="fa-solid fa-key"></i>
                <input
                  type="text"
                  id="otp"
                  className="form-control"
                  placeholder="6-digit OTP"
                  pattern="[0-9]{6}"
                  maxLength="6"
                  required
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn-send-otp"
                onClick={sendOtp}
                disabled={countdown > 0}
              >
                {countdown > 0 ? `Resend (${countdown}s)` : 'Send OTP'}
              </button>
            </div>
            {otpSent && (
              <div className="otp-status" style={{ display: 'block' }}>
                <i className="fa-solid fa-circle-check"></i> OTP sent to mobile! (Demo Code: <b>123456</b>)
              </div>
            )}
            {errorMsg && (
              <div className="error-message" style={{ display: 'block' }}>
                {errorMsg}
              </div>
            )}
          </div>

          <button type="submit" className="btn-submit">
            <span>Sign In to Portal</span> <i className="fa-solid fa-arrow-right-to-bracket" style={{ marginLeft: '6px' }}></i>
          </button>
        </form>

        <div className="login-footer">
          <button
            type="button"
            className={`btn-admin-access ${currentRole === 'admin' ? 'active' : ''}`}
            onClick={toggleAdmin}
          >
            <i className="fa-solid fa-user-shield"></i>
            <span>Temple Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
}

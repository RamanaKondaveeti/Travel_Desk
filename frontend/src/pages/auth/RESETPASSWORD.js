import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaSyncAlt, FaBus } from "react-icons/fa";
import "../../STYLES/Login.css";
import "../../STYLES/RESETPASSWORD.css";
import { readApiMessage, requestAuth } from "../../services/authService";
import authHeroImage from "../../assets/images/loginimage.png";

const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [generatedCaptcha, setGeneratedCaptcha] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiMessage, setApiMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const authPageStyle = {
    backgroundImage: `url(${authHeroImage})`
  };

  const generateCaptcha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let value = "";
    for (let i = 0; i < 5; i += 1) {
      value += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedCaptcha(value);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const validate = () => {
    const newErrors = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      newErrors.email = "Email is required.";
    } else if (/\s/.test(email)) {
      newErrors.email = "Email cannot contain spaces.";
    } else if (/[A-Z]/.test(normalizedEmail)) {
      newErrors.email = "Only lowercase letters are allowed.";
    } else if (!EMAIL_REGEX.test(normalizedEmail)) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!captchaInput.trim()) {
      newErrors.captcha = "Captcha is required.";
    } else if (captchaInput.trim().toUpperCase() !== generatedCaptcha) {
      newErrors.captcha = "Invalid captcha.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiMessage("");
    setIsSuccess(false);

    try {
      const payload = await requestAuth(
        "/api/Auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim() })
        },
        "Failed to send OTP."
      );
      setIsSuccess(true);
      setApiMessage(
        readApiMessage(payload, "If the email is registered, an OTP has been sent.")
      );
      setTimeout(() => {
        navigate("/verify");
      }, 1200);
    } catch (error) {
      setIsSuccess(false);
      setApiMessage(error?.message || "Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div
      className="travel-auth-page travel-auth-forgot"
      style={authPageStyle}
    >
      <div className="travel-auth-card">
        <aside className="travel-auth-brand">
          <p className="travel-auth-kicker">Welcome to</p>
          <div className="travel-auth-logo">
            <FaBus />
          </div>
          <h1 className="travel-auth-brand-name">Travling</h1>
          <p className="travel-auth-brand-copy">
            Recover your traveler account and continue managing your bookings.
          </p>
          <p className="travel-auth-brand-meta">Secure account recovery</p>
        </aside>

        <section className="travel-auth-form-panel">
          <h2 className="travel-auth-heading">Forgot password</h2>
          <p className="travel-auth-subheading">
            Enter your registered email and we will send an OTP.
          </p>

          {apiMessage && (
            <p
              className={`travel-auth-status ${isSuccess ? "is-success" : "is-error"}`}
            >
              {apiMessage}
            </p>
          )}

          <form className="travel-auth-form" onSubmit={handleSubmit} noValidate>
            <div className="travel-field">
              <label htmlFor="forgot-email">E-mail Address <span>*</span></label>
              <div className={`travel-field-line ${errors.email ? "has-error" : ""}`}>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your registered e-mail"
                  value={email}
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby="forgot-email-error"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, email: "" }));
                    setApiMessage("");
                    setIsSuccess(false);
                  }}
                />
              </div>
              <p id="forgot-email-error" className="travel-field-error">{errors.email || "\u00A0"}</p>
            </div>

            <div className="travel-field">
              <label htmlFor="forgot-captcha">Captcha <span>*</span></label>
              <div className="travel-captcha-row">
                <div className="travel-captcha-display" aria-label="Captcha code">
                  {generatedCaptcha.split("").map((char, index) => (
                    <span key={`${char}-${index}`}>{char}</span>
                  ))}
                </div>
                <button
                  type="button"
                  className="travel-captcha-refresh"
                  onClick={generateCaptcha}
                >
                  <FaSyncAlt />
                  <span>Refresh</span>
                </button>
              </div>
              <div className={`travel-field-line ${errors.captcha ? "has-error" : ""}`}>
                <input
                  id="forgot-captcha"
                  type="text"
                  placeholder="Enter captcha code"
                  value={captchaInput}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={generatedCaptcha.length || 5}
                  aria-invalid={Boolean(errors.captcha)}
                  aria-describedby="forgot-captcha-error"
                  onChange={(e) => {
                    setCaptchaInput(e.target.value.replace(/\s+/g, ""));
                    setErrors((prev) => ({ ...prev, captcha: "" }));
                    setApiMessage("");
                    setIsSuccess(false);
                  }}
                />
              </div>
              <p id="forgot-captcha-error" className="travel-field-error">{errors.captcha || "\u00A0"}</p>
            </div>

            <div className="travel-auth-links">
              <button type="button" onClick={() => navigate("/login")}>
                Back to Login
              </button>
              <button type="button" onClick={() => navigate("/register")}>
                Create Account
              </button>
            </div>

            <div className="travel-auth-actions">
              <button
                type="submit"
                className="travel-btn travel-btn-primary"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default ResetPassword;

import React from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";
import "../../STYLES/SiteFooter.css";

const QUICK_LINKS = [
  { label: "Buses", to: "/?tab=buses" },
  { label: "Print Ticket", to: "/print-ticket" },
  { label: "Login", to: "/login" },
  { label: "Dashboard", to: "/dashboard" },
];

export default function SiteFooter() {
  return (
    <footer className="travel-footer">
      <div className="footer-shell">
        <div className="footer-topline">
          <div className="footer-branding">
            <h4>PickNBook Travel Desk</h4>
            <p>Bus booking with fast, transparent workflows.</p>
          </div>

          <Link className="footer-top-btn" to="/?tab=buses">
            Start Booking
          </Link>
        </div>

        <nav className="footer-quick-links" aria-label="Footer quick links">
          {QUICK_LINKS.map((item) => (
            <Link key={item.label} to={item.to} className="footer-link-item">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="footer-contact-inline">
          <span>
            <MapPin size={14} />
            Madhapur, Hyderabad, Telangana
          </span>
          <span>
            <Phone size={14} />
            +91 999-999-9999
          </span>
          <span>
            <Mail size={14} />
            contact@picknbook.in
          </span>
        </div>

        <div className="footer-bottomline">
          <span>Copyright 2026 All Rights Reserved</span>
          <span>Terms & Conditions | Privacy Policy | Refund & Cancellation Policy</span>
        </div>
      </div>
    </footer>
  );
}

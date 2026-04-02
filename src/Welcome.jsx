import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Link as ScrollLink } from "react-scroll";
import logo from "./banasthali-logo.jpg";
import "./Welcome.css";

const Counter = ({ endValue, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          let start = 0;
          const duration = 1500; // 1.5 seconds
          const interval = 16; // ~60fps
          const totalSteps = duration / interval;
          const increment = endValue / totalSteps;

          const timer = setInterval(() => {
            start += increment;
            if (start >= endValue) {
              setCount(endValue);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, interval);
        }
      },
      { threshold: 0.1 }
    );

    if (countRef.current) observer.observe(countRef.current);
    return () => observer.disconnect();
  }, [endValue]);

  return <h2 ref={countRef}>{count}{suffix}</h2>;
};

const Welcome = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [stats, setStats] = useState({ students: 5000, eventsMonthly: 10, activeClubs: 15 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("http://localhost:5001/api/dashboard/public-stats");
        if (response.ok) {
          const data = await response.json();
          setStats({
            students: data.students ?? 0,
            eventsMonthly: data.eventsMonthly ?? 0,
            activeClubs: data.activeClubs ?? 0
          });
        }
      } catch (error) {
        console.error("Failed to fetch stats", error);
      }
    };
    fetchStats();

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);

      // Step activation based on scroll
      const stepItems = document.querySelectorAll('.step-item');
      stepItems.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.75) {
          item.classList.add('active');
        }
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    window.addEventListener("scroll", handleScroll);

    // Initial call to check visibility
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <nav className={`lp-navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="lp-container">
          <div className="lp-nav-logo">
            <img src={logo} alt="banasthali-logo" className="lp-brand-logo" />
            Ban-verse
          </div>
          <div className="lp-nav-links">
            <ScrollLink to="hero" smooth={true} duration={500}>Home</ScrollLink>
            <ScrollLink to="problem" smooth={true} duration={500}>Problem</ScrollLink>
            <ScrollLink to="solution" smooth={true} duration={500}>Solution</ScrollLink>
            <ScrollLink to="steps" smooth={true} duration={500}>Steps</ScrollLink>
          </div>
          <div className="lp-nav-btns">
            <button className="lp-btn-login" onClick={() => navigate("/login")}>Login</button>
            <button className="lp-btn-signup" onClick={() => navigate("/signup")}>Sign Up</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="hero">
        <div className="hero-content reveal reveal-up active">
          <h1>Ban-verse</h1>
          <h2>Your Personalized Campus Activity Hub</h2>
          <p>
            Bringing all campus clubs, workshops, and events into one structured
            system designed exclusively for Banasthali Vidyapith students.
          </p>
          <div className="hero-btns">
            <button className="lp-btn-signup" onClick={() => navigate("/signup")}>Get Started</button>
            <button className="lp-btn-login" onClick={() => {
              const user = localStorage.getItem("user");
              const role = localStorage.getItem("role");
              if (user && role) {
                if (role === "admin") navigate("/admindashboard");
                else if (role === "club") navigate("/clubdashboard");
                else navigate("/studentdashboard");
              } else {
                navigate("/login");
              }
            }}>View Dashboard</button>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="lp-section stats-section">
        <div className="stats-grid reveal reveal-up">
          <div className="stat-item">
            <Counter endValue={stats.students} suffix="+" />
            <p>Students</p>
          </div>
          <div className="stat-item">
            <Counter endValue={stats.eventsMonthly} suffix="+" />
            <p>Events Monthly</p>
          </div>
          <div className="stat-item">
            <Counter endValue={stats.activeClubs} suffix="+" />
            <p>Active Clubs</p>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="lp-section problem">
        <div className="lp-section-header reveal reveal-left">
          <h2>The Problem</h2>
          <p>
            Campus information is scattered. Students miss opportunities while
            club administrators struggle to reach their audience effectively.
          </p>
        </div>
        <div className="problem-grid">
          <div className="problem-card reveal reveal-up delay-1">
            <div className="icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <h3>Missed Deadlines</h3>
            <p>Important event registrations often go unnoticed until it's too late.</p>
          </div>
          <div className="problem-card reveal reveal-up delay-2">
            <div className="icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            </div>
            <h3>Scattered Announcements</h3>
            <p>Information is spread across WhatsApp, posters, and notice boards.</p>
          </div>
          <div className="problem-card reveal reveal-up delay-3">
            <div className="icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </div>
            <h3>No Personalization</h3>
            <p>Students struggle to find events that actually match their interests.</p>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="solution" className="lp-section solution">
        <div className="lp-section-header reveal reveal-left">
          <h2>The Ban-verse Solution</h2>
          <p>
            A unified, intelligent, and visually structured campus ecosystem
            that empowers both students and administrators.
          </p>
        </div>
        <div className="solution-grid">
          <div className="solution-card reveal reveal-up delay-1">
            <div className="icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </div>
            <h3>Centralized Event System</h3>
            <p>One place for all clubs and workshops. Never check multiple groups again.</p>
          </div>
          <div className="solution-card reveal reveal-up delay-2">
            <div className="icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
            </div>
            <h3>Smart Recommendations</h3>
            <p>AI-driven suggestions based on your personal interests and skill sets.</p>
          </div>
          <div className="solution-card reveal reveal-up delay-3">
            <div className="icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </div>
            <h3>Smart Search & Filters</h3>
            <p>Quickly find exactly what you're looking for with advanced tagging.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="steps" className="lp-section how-it-works">
        <div className="lp-section-header reveal reveal-up">
          <h2>How It Works</h2>
          <p>
            Get started with Ban-verse in four simple steps and transform your
            campus experience.
          </p>
        </div>
        <div className="steps-container">
          <div className="step-item">
            <div className="step-number">1</div>
            <h3>Create Your Profile</h3>
            <p>Sign up and tell us about your department and year.</p>
          </div>
          <div className="step-item">
            <div className="step-number">2</div>
            <h3>Select Interests</h3>
            <p>Choose from technical, cultural, or sports categories.</p>
          </div>
          <div className="step-item">
            <div className="step-number">3</div>
            <h3>Discover Events</h3>
            <p>Explore personalized recommendations on your feed.</p>
          </div>
          <div className="step-item">
            <div className="step-number">4</div>
            <h3>Register & Participate</h3>
            <p>Secure your spot and get reminders for your events.</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="lp-section">
        <div className="lp-section-header reveal reveal-up">
          <h2>Frequently Asked Questions</h2>
          <p>Everything you need to know about the product and billing.</p>
        </div>
        <div className="faq-container reveal reveal-up delay-1">
          <details className="faq-item">
            <summary>Is Ban-verse free for students?</summary>
            <div className="faq-answer">Yes, Ban-verse is completely free for all Banasthali Vidyapith students. Simply sign up with your university email address.</div>
          </details>
          <details className="faq-item">
            <summary>How do I become a Club Leader?</summary>
            <div className="faq-answer">Club Leaders are designated by the administration or existing club faculty. If you are representing an official club, please use the Contact Us section or talk to your faculty coordinator.</div>
          </details>
          <details className="faq-item">
            <summary>How do the AI recommendations work?</summary>
            <div className="faq-answer">Our recommendation engine analyzes the interests, course details, and past activity you provide to match you with the most relevant clubs and upcoming events on campus.</div>
          </details>
        </div>
      </section>

      {/* Privacy Policy Section */}
      <section id="privacy" className="lp-section" style={{ background: 'var(--lp-surface)' }}>
        <div className="lp-section-header reveal reveal-up">
          <h2>Privacy Policy</h2>
          <p>Your data is secure and handled with care.</p>
        </div>
        <div className="legal-container reveal reveal-up delay-1">
          <h3>Information Collection</h3>
          <p>We only collect information directly related to your academic and extracurricular profile at Banasthali Vidyapith, ensuring a personalized experience.</p>
          <h3>Data Usage</h3>
          <p>Your data is used strictly for internal platform features (such as personalized recommendations) and is never shared with third-party advertisers.</p>
          <h3>Security</h3>
          <p>We implement strict security measures to ensure your data stays safe and is accessible only by authorized administrators.</p>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="lp-section">
        <div className="lp-section-header reveal reveal-up">
          <h2>Contact Us</h2>
          <p>Have questions or need to get your club registered?</p>
        </div>
        <div className="contact-card reveal reveal-up delay-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1rem' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          <h3>Send us an email</h3>
          <p>We're here to help and answer any question you might have.</p>
          <a href="mailto:banverse.app@gmail.com">banverse.app@gmail.com</a>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section reveal reveal-up">
        <h2>Ready to Explore Your Campus?</h2>
        <p>Join thousands of Banasthali students and never miss another opportunity.</p>
        <button className="btn-white" onClick={() => navigate("/signup")}>Sign Up Now</button>
      </section>

      {/* Footer */}
      <footer>
        <div className="lp-container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo-container">
                <img src={logo} alt="banasthali-logo" className="lp-brand-logo" />
                <h2>Ban-verse</h2>
              </div>
              <p>Empowering students of Banasthali Vidyapith through centralized discovery and engagement.</p>
            </div>
            <div className="footer-links">
              <h4>Platform</h4>
              <ul>
                <li><ScrollLink to="hero" smooth={true} duration={500}>Home</ScrollLink></li>
                <li><ScrollLink to="problem" smooth={true} duration={500}>The Problem</ScrollLink></li>
                <li><ScrollLink to="solution" smooth={true} duration={500}>Our Solution</ScrollLink></li>
                <li><ScrollLink to="steps" smooth={true} duration={500}>How It Works</ScrollLink></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Support</h4>
              <ul>
                <li><ScrollLink to="faq" smooth={true} duration={500} style={{ cursor: 'pointer' }}>FAQ</ScrollLink></li>
                <li><ScrollLink to="contact" smooth={true} duration={500} style={{ cursor: 'pointer' }}>Contact Us</ScrollLink></li>
                <li><ScrollLink to="privacy" smooth={true} duration={500} style={{ cursor: 'pointer' }}>Privacy Policy</ScrollLink></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Contact</h4>
              <ul>
                <li><a href="https://maps.google.com/?q=Banasthali+Vidyapith" target="_blank" rel="noopener noreferrer">Banasthali Vidyapith</a></li>
                <li>Rajasthan, India</li>
                <li><a href="mailto:banverse.app@gmail.com">banverse.app@gmail.com</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 Ban-verse. Designed for Banasthali Vidyapith.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
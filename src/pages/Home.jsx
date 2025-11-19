import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const elements = document.querySelectorAll('.animate-on-scroll');
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const isVisible = (rect.top <= window.innerHeight * 0.85) && (rect.bottom >= window.innerHeight * 0.15);
        if (isVisible) {
          el.classList.add('is-visible');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: '📖',
      title: 'Daily Tips',
      description: 'Get daily interview tips and best practices',
      color: '#00D9FF',
      path: '/daily-tips',
      delay: '0s'
    },
    {
      icon: '⚙️',
      title: 'Practice DSA',
      description: 'Solve data structures and algorithms problems',
      color: '#00D9FF',
      path: '/dsa',
      delay: '0.1s'
    },
    {
      icon: '👥',
      title: 'Practice HR',
      description: 'Prepare for HR and behavioral questions',
      color: '#FF006E',
      path: '/hr',
      delay: '0.2s'
    },
    {
      icon: '📚',
      title: 'Resources',
      description: 'Access study materials, articles, and guides',
      color: '#8B5CF6',
      path: '/resources',
      delay: '0.3s'
    },
    {
      icon: '🎤',
      title: 'Mock Interview',
      description: 'Simulate real interview scenarios with live interaction',
      color: '#FF006E',
      path: '/mock',
      delay: '0.4s'
    }
  ];

  const howItWorksSteps = [
    {
      icon: '📝',
      title: 'Choose Your Path',
      description: 'Select from DSA, HR, Resources, or Daily Tips to focus your preparation.'
    },
    {
      icon: '💪',
      title: 'Practice Effectively',
      description: 'Engage with interactive problems, record answers (HR), and review materials.'
    },
    {
      icon: '🤝',
      title: 'Live Mock Interviews',
      description: 'Connect with peers for realistic, 1-on-1 practice interview sessions.'
    },
    {
      icon: '🚀',
      title: 'Achieve Your Goals',
      description: 'Build confidence, refine your skills, and land your dream tech job.'
    }
  ];

  const testimonials = [
    {
      quote: "InterviewPrep transformed my preparation. The live mock interviews were incredibly realistic!",
      author: "Priya Sharma, Software Engineer at Google"
    },
    {
      quote: "The daily tips and DSA problems helped me build a strong foundation. Highly recommended!",
      author: "Rahul Singh, Data Scientist at Microsoft"
    },
    {
      quote: "Being able to practice HR answers and get structured resources in one place was a game-changer.",
      author: "Ananya Gupta, Product Manager at Amazon"
    }
  ];

  return (
    <div className="home-page-container">
      <div className="background-gradient-overlay"></div>
      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <section className="hero-section animate-on-scroll">
        <div className="hero-content">
          <h1 className="hero-title">
            Master Your <span className="gradient-text">Interviews</span>
          </h1>
          <p className="hero-subtitle">
            Comprehensive platform to prepare for technical and HR interviews with cutting-edge tools and live practice.
          </p>
          <button className="cta-button" onClick={() => navigate('/signup')}>
            Get Started <span className="arrow-icon">→</span>
          </button>
        </div>
        <div className="hero-image">
           <img
             src="https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?cs=srgb&dl=pexels-sora-shimazaki-5668858.jpg&fm=jpg"
             alt="Interview Preparation Illustration"
             onError={(e) => e.target.src='https://placehold.co/600x400/cccccc/ffffff?text=Image+Load+Error'}
           />
        </div>
      </section>

      <section className="features-section animate-on-scroll">
        <h2 className="section-title">Your Path to Success</h2>
        <p className="section-subtitle">Explore the powerful features designed to elevate your interview game.</p>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div
              key={index}
              className="feature-card animate-on-scroll"
              onClick={() => navigate(feature.path)}
              style={{ animationDelay: `calc(0.2s + ${feature.delay})` }}
            >
              <div className="feature-icon" style={{ color: feature.color }}>
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              <span className="card-arrow">→</span>
            </div>
          ))}
        </div>
      </section>

      <section className="how-it-works-section">
        <h2 className="section-title animate-on-scroll">How It Works</h2>
        <p className="section-subtitle animate-on-scroll" style={{animationDelay: '0.1s'}}>Simple steps to kickstart your interview preparation.</p>
        <div className="how-it-works-grid">
          {howItWorksSteps.map((step, index) => (
            <div key={index} className="how-it-works-card animate-on-scroll" style={{ animationDelay: `calc(0.2s + ${index * 0.1}s)` }}>
              <div className="step-number">{index + 1}</div>
              <div className="step-icon">{step.icon}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mock-promo-section animate-on-scroll">
        <div className="mock-promo-content">
          <h2 className="mock-promo-title">Experience Real Mock Interviews</h2>
          <p className="mock-promo-subtitle">Practice live 1-on-1 with peers in realistic interview scenarios. Sharpen your communication and problem-solving skills under pressure.</p>
          <button className="cta-button alt-button" onClick={() => navigate('/mock')}>
            Start Live Mock <span className="arrow-icon">→</span>
          </button>
        </div>
        <div className="mock-promo-image">
           <img
            src="https://placehold.co/500x350/0A0E27/FFF?text=Live+Mock+Interview&font=inter"
            alt="Live Mock Interview Illustration"
            onError={(e) => e.target.src='https://placehold.co/500x350/cccccc/ffffff?text=Image+Load+Error'}
           />
        </div>
      </section>

      <section className="testimonials-section">
        <h2 className="section-title animate-on-scroll">What Our Users Say</h2>
        <p className="section-subtitle animate-on-scroll" style={{animationDelay: '0.1s'}}>Hear from those who landed their dream jobs with InterviewPrep.</p>
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card animate-on-scroll" style={{ animationDelay: `calc(0.2s + ${index * 0.1}s)` }}>
              <p className="testimonial-quote">"{testimonial.quote}"</p>
              <p className="testimonial-author">- {testimonial.author}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-final-section animate-on-scroll">
        <h2 className="cta-final-title">Ready to Ace Your Next Interview?</h2>
        <p className="cta-final-subtitle">Join thousands of students and professionals preparing effectively with InterviewPrep.</p>
        <button className="cta-button" onClick={() => navigate('/signup')}>
          Join Now <span className="arrow-icon">→</span>
        </button>
      </section>
    </div>
  );
};

export default Home;

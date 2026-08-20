/* ===================================================================
   LANDING PAGE — Animations & Interactions
   =================================================================== */

(function () {
  'use strict';

  // ===== Smooth Scroll for Anchor Links =====
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ===== Nav Background on Scroll =====
  const nav = document.querySelector('.landing-nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.style.borderBottomColor = 'rgba(255, 255, 255, 0.08)';
      nav.style.background = 'rgba(10, 10, 15, 0.95)';
    } else {
      nav.style.borderBottomColor = 'rgba(255, 255, 255, 0.05)';
      nav.style.background = 'rgba(10, 10, 15, 0.8)';
    }
  });

  // ===== Intersection Observer for Scroll Animations =====
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe feature cards, steps, testimonials
  document.querySelectorAll('.landing-feature-card, .landing-step, .testimonial-card, .landing-stat').forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });

  // ===== Counter Animation =====
  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-target'));
    const duration = 2000;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * easeOut);

      if (target >= 1000000) {
        el.textContent = '$' + (current / 1000000).toFixed(1) + 'M+';
      } else if (target >= 1000) {
        el.textContent = current.toLocaleString() + '+';
      } else {
        el.textContent = current + (target === 89 ? '%' : '+');
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // Observe stat values
  const statObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          statObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  document.querySelectorAll('.stat-value').forEach((el) => {
    statObserver.observe(el);
  });

  // ===== Typing Effect for Hero Mockup =====
  const mockupSearch = document.querySelector('.mockup-search span');
  if (mockupSearch) {
    const phrases = [
      'Trending products on TikTok for summer 2026...',
      'Best selling beauty products on Amazon...',
      'Winning dropshipping products in fitness...',
      'High margin products under $20...',
    ];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function typeEffect() {
      const currentPhrase = phrases[phraseIndex];

      if (isDeleting) {
        mockupSearch.textContent = currentPhrase.substring(0, charIndex - 1);
        charIndex--;
      } else {
        mockupSearch.textContent = currentPhrase.substring(0, charIndex + 1);
        charIndex++;
      }

      let typeSpeed = isDeleting ? 30 : 60;

      if (!isDeleting && charIndex === currentPhrase.length) {
        typeSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        typeSpeed = 500;
      }

      setTimeout(typeEffect, typeSpeed);
    }

    setTimeout(typeEffect, 1500);
  }

  // ===== Stagger Animation Delays =====
  document.querySelectorAll('.landing-features-grid .landing-feature-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.1}s`;
  });

  document.querySelectorAll('.landing-testimonials-grid .testimonial-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.1}s`;
  });

  document.querySelectorAll('.landing-stats-grid .landing-stat').forEach((stat, i) => {
    stat.style.transitionDelay = `${i * 0.1}s`;
  });
})();

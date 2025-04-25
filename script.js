document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const html = document.documentElement;

  // Load saved theme or default to dark
  const savedTheme = localStorage.getItem('theme') || 'dark';
  html.dataset.theme = savedTheme;
  applyTheme(savedTheme);

  themeToggle.addEventListener('click', () => {
    const newTheme = html.dataset.theme === 'dark' ? 'light' : 'dark';
    html.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  });

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.style.setProperty('--dark', '#f0f0f0');
      document.documentElement.style.setProperty('--light', '#0a0a1a');
      document.documentElement.style.setProperty('--glass', 'rgba(0, 0, 0, 0.05)');
      document.documentElement.style.setProperty('--primary', '#ff00e4');
      document.documentElement.style.setProperty('--secondary', '#00f7ff');
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      document.documentElement.style.setProperty('--dark', '#0a0a1a');
      document.documentElement.style.setProperty('--light', '#f0f0f0');
      document.documentElement.style.setProperty('--glass', 'rgba(255, 255, 255, 0.05)');
      document.documentElement.style.setProperty('--primary', '#00f7ff');
      document.documentElement.style.setProperty('--secondary', '#ff00e4');
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
  }

  // Typing animation
  const typingText = document.getElementById('typing-text');
  const text = "Steven Emad";
  let i = 0;
  (function typeWriter() {
    if (i < text.length) {
      typingText.innerHTML += text.charAt(i++);
      setTimeout(typeWriter, 150);
    }
  })();

  // GSAP scroll animations
  gsap.registerPlugin(ScrollTrigger);
  gsap.utils.toArray('.section').forEach(section => {
    gsap.from(section, {
      scrollTrigger: { trigger: section, start: "top 80%" },
      opacity: 0, y: 50, duration: 1
    });
  });
  gsap.utils.toArray('.project-card').forEach((card, idx) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: "top 80%" },
      opacity: 0, y: 30, duration: 0.6, delay: idx * 0.1
    });
  });
  gsap.to('.icon-container', { y: 10, duration: 2, repeat: -1, yoyo: true, ease: "sine.inOut" });

  // Form validation
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      const email = this.querySelector('[name="email"]').value;
      if (!email.includes('@')) {
        e.preventDefault();
        alert('Please enter a valid email address');
      }
    });
  }

  // Smooth scrolling
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
    });
  });

  // Active nav link on scroll
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('nav a');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(sec => {
      if (pageYOffset >= sec.offsetTop - 200) current = sec.id;
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  });
});

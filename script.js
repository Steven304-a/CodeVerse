// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

themeToggle.addEventListener('click', () => {
    html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
    themeToggle.innerHTML = html.dataset.theme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    localStorage.setItem('theme', html.dataset.theme);
});

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
html.dataset.theme = savedTheme;
themeToggle.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';

// Typing Animation
const typingText = document.getElementById('typing-text');
const text = "Steven Emad";
let i = 0;

function typeWriter() {
    if (i < text.length) {
        typingText.innerHTML += text.charAt(i);
        i++;
        setTimeout(typeWriter, 150);
    }
}

typeWriter();

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

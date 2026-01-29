// Keep the form submission native so Netlify can capture it.
// Optional: show a friendly message AFTER the browser posts (no preventDefault).

const form = document.querySelector('form[name="early-access"]');
const message = document.getElementById('formMessage');

if (form && message) {
  form.addEventListener('submit', () => {
    message.textContent = "Submitting...";
  });
}

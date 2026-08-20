/* ===================================================================
   AUTH — Login, Signup, Forgot Password, Google Auth
   =================================================================== */

(function () {
  'use strict';

  const { auth, db } = window.HuntDrop.firebase;

  // ===== DOM Elements =====
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const forgotForm = document.getElementById('forgotForm');

  const loginFormEl = document.getElementById('loginFormEl');
  const signupFormEl = document.getElementById('signupFormEl');
  const forgotFormEl = document.getElementById('forgotFormEl');

  const loginError = document.getElementById('loginError');
  const signupError = document.getElementById('signupError');
  const forgotError = document.getElementById('forgotError');
  const forgotSuccess = document.getElementById('forgotSuccess');

  const showSignup = document.getElementById('showSignup');
  const showLogin = document.getElementById('showLogin');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const backToLogin = document.getElementById('backToLogin');

  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const googleSignupBtn = document.getElementById('googleSignupBtn');

  const strengthFill = document.getElementById('strengthFill');
  const strengthLabel = document.getElementById('strengthLabel');

  // ===== Check URL hash for signup =====
  if (window.location.hash === '#signup') {
    showSignupForm();
  }

  // ===== Check if already logged in =====
  auth.onAuthStateChanged((user) => {
    if (user) {
      window.location.href = 'index.html';
    }
  });

  // ===== Form Switching =====
  showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    showSignupForm();
  });

  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
  });

  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    showForgotForm();
  });

  backToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
  });

  function showLoginForm() {
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    forgotForm.style.display = 'none';
    clearErrors();
  }

  function showSignupForm() {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    forgotForm.style.display = 'none';
    clearErrors();
  }

  function showForgotForm() {
    loginForm.style.display = 'none';
    signupForm.style.display = 'none';
    forgotForm.style.display = 'block';
    clearErrors();
  }

  function clearErrors() {
    loginError.classList.remove('visible');
    signupError.classList.remove('visible');
    forgotError.classList.remove('visible');
    forgotSuccess.classList.remove('visible');
  }

  function showError(el, msg) {
    el.textContent = msg;
    el.classList.add('visible');
  }

  // ===== Login =====
  loginFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      showError(loginError, 'Please fill in all fields.');
      return;
    }

    const btn = loginFormEl.querySelector('button[type="submit"]');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
      await auth.signInWithEmailAndPassword(email, password);
      // Redirect handled by onAuthStateChanged
    } catch (error) {
      btn.classList.remove('loading');
      btn.disabled = false;

      switch (error.code) {
        case 'auth/user-not-found':
          showError(loginError, 'No account found with this email.');
          break;
        case 'auth/wrong-password':
          showError(loginError, 'Incorrect password. Please try again.');
          break;
        case 'auth/invalid-email':
          showError(loginError, 'Please enter a valid email address.');
          break;
        case 'auth/too-many-requests':
          showError(loginError, 'Too many attempts. Please try again later.');
          break;
        default:
          showError(loginError, 'Login failed. Please try again.');
      }
    }
  });

  // ===== Signup =====
  signupFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;

    if (!name || !email || !password || !confirm) {
      showError(signupError, 'Please fill in all fields.');
      return;
    }

    if (password !== confirm) {
      showError(signupError, 'Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      showError(signupError, 'Password must be at least 8 characters.');
      return;
    }

    const btn = signupFormEl.querySelector('button[type="submit"]');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Update display name
      await user.updateProfile({ displayName: name });

      // Save user data to Firestore
      await db.collection('users').doc(user.uid).set({
        name: name,
        email: email,
        plan: 'free',
        credits: 5000,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Redirect handled by onAuthStateChanged
    } catch (error) {
      btn.classList.remove('loading');
      btn.disabled = false;

      switch (error.code) {
        case 'auth/email-already-in-use':
          showError(signupError, 'An account with this email already exists.');
          break;
        case 'auth/invalid-email':
          showError(signupError, 'Please enter a valid email address.');
          break;
        case 'auth/weak-password':
          showError(signupError, 'Password is too weak. Use at least 8 characters.');
          break;
        default:
          showError(signupError, 'Signup failed. Please try again.');
      }
    }
  });

  // ===== Forgot Password =====
  forgotFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const email = document.getElementById('forgotEmail').value.trim();

    if (!email) {
      showError(forgotError, 'Please enter your email address.');
      return;
    }

    try {
      await auth.sendPasswordResetEmail(email);
      forgotSuccess.textContent = 'Reset link sent! Check your email inbox.';
      forgotSuccess.classList.add('visible');
      forgotFormEl.reset();
    } catch (error) {
      switch (error.code) {
        case 'auth/user-not-found':
          showError(forgotError, 'No account found with this email.');
          break;
        case 'auth/invalid-email':
          showError(forgotError, 'Please enter a valid email address.');
          break;
        default:
          showError(forgotError, 'Failed to send reset link. Please try again.');
      }
    }
  });

  // ===== Google Auth =====
  async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const result = await auth.signInWithPopup(provider);
      const user = result.user;

      // Save user data to Firestore if new user
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (!userDoc.exists) {
        await db
          .collection('users')
          .doc(user.uid)
          .set({
            name: user.displayName || 'User',
            email: user.email,
            plan: 'free',
            credits: 5000,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
          });
      } else {
        await db.collection('users').doc(user.uid).update({
          lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Redirect handled by onAuthStateChanged
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        alert('Google sign-in failed. Please try again.');
      }
    }
  }

  googleLoginBtn.addEventListener('click', signInWithGoogle);
  googleSignupBtn.addEventListener('click', signInWithGoogle);

  // ===== Password Strength Checker =====
  const signupPassword = document.getElementById('signupPassword');
  if (signupPassword) {
    signupPassword.addEventListener('input', (e) => {
      const password = e.target.value;
      const strength = checkPasswordStrength(password);

      strengthFill.style.width = strength.percent + '%';
      strengthFill.style.background = strength.color;
      strengthLabel.textContent = strength.label;
      strengthLabel.style.color = strength.color;
    });
  }

  function checkPasswordStrength(password) {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) return { percent: 20, color: '#ff3366', label: 'Weak' };
    if (score <= 2) return { percent: 40, color: '#ff8a00', label: 'Fair' };
    if (score <= 3) return { percent: 60, color: '#fbbf24', label: 'Good' };
    if (score <= 4) return { percent: 80, color: '#00d4aa', label: 'Strong' };
    return { percent: 100, color: '#00ff88', label: 'Very Strong' };
  }

  // ===== Toggle Password Visibility =====
  window.togglePassword = function (inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    } else {
      input.type = 'password';
      btn.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
  };
})();

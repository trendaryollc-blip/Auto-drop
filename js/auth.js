/* ===================================================================
   AUTH — Login, Signup, Forgot Password, Google Auth
   Self-contained: initializes Firebase directly, no external deps
   =================================================================== */

(function () {
  'use strict';

  // ===== Firebase Config (hardcoded for login page) =====
  const firebaseConfig = {
    apiKey: 'AIzaSyAspYJzwBTe7g_msKELnkJYZLNtb7Ssdns',
    authDomain: 'auto-drop-3d8b6.firebaseapp.com',
    projectId: 'auto-drop-3d8b6',
    storageBucket: 'auto-drop-3d8b6.firebasestorage.app',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abcdef',
  };

  // ===== Initialize Firebase =====
  let auth, db;

  try {
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK not loaded');
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    db = firebase.firestore();
    console.log('[Auth] Firebase initialized');
  } catch (err) {
    console.error('[Auth] Firebase init failed:', err);
    showFatalError('Failed to initialize Firebase: ' + err.message);
    return;
  }

  // ===== DOM Elements =====
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const forgotForm = document.getElementById('forgotForm');
  const loadingCard = document.getElementById('authLoading');

  const loginFormEl = document.getElementById('loginFormEl');
  const signupFormEl = document.getElementById('signupFormEl');
  const forgotFormEl = document.getElementById('forgotFormEl');

  const loginError = document.getElementById('loginError');
  const signupError = document.getElementById('signupError');
  const forgotError = document.getElementById('forgotError');
  const forgotSuccess = document.getElementById('forgotSuccess');

  const showSignupBtn = document.getElementById('showSignup');
  const showLoginBtn = document.getElementById('showLogin');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const backToLogin = document.getElementById('backToLogin');

  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const googleSignupBtn = document.getElementById('googleSignupBtn');

  const strengthFill = document.getElementById('strengthFill');
  const strengthLabel = document.getElementById('strengthLabel');

  // ===== Password Toggle (works immediately, no Firebase needed) =====
  document.querySelectorAll('.password-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const input = btn.parentElement.querySelector('input');
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML =
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
      } else {
        input.type = 'password';
        btn.innerHTML =
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      }
    });
  });

  // ===== Show Forms Immediately (no Firebase dependency) =====
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
    if (loginError) loginError.classList.remove('visible');
    if (signupError) signupError.classList.remove('visible');
    if (forgotError) forgotError.classList.remove('visible');
    if (forgotSuccess) forgotSuccess.classList.remove('visible');
  }

  function showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
  }

  // ===== Wire up form switching (no Firebase dependency) =====
  if (showSignupBtn) {
    showSignupBtn.addEventListener('click', function (e) {
      e.preventDefault();
      showSignupForm();
    });
  }
  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', function (e) {
      e.preventDefault();
      showLoginForm();
    });
  }
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', function (e) {
      e.preventDefault();
      showForgotForm();
    });
  }
  if (backToLogin) {
    backToLogin.addEventListener('click', function (e) {
      e.preventDefault();
      showLoginForm();
    });
  }

  // ===== Password Strength =====
  var signupPasswordInput = document.getElementById('signupPassword');
  if (signupPasswordInput && strengthFill && strengthLabel) {
    signupPasswordInput.addEventListener('input', function (e) {
      var password = e.target.value;
      var strength = checkPasswordStrength(password);
      strengthFill.style.width = strength.percent + '%';
      strengthFill.style.background = strength.color;
      strengthLabel.textContent = strength.label;
      strengthLabel.style.color = strength.color;
    });
  }

  function checkPasswordStrength(password) {
    var score = 0;
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

  // ===== Check URL hash for signup =====
  if (window.location.hash === '#signup') {
    showSignupForm();
  } else {
    showLoginForm();
  }

  // ===== Hide loading, show form =====
  if (loadingCard) loadingCard.style.display = 'none';

  // ===== Check if already logged in =====
  auth.onAuthStateChanged(function (user) {
    if (user) {
      window.location.href = 'app.html';
    }
  });

  // ===== Login =====
  loginFormEl.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearErrors();

    var email = document.getElementById('loginEmail').value.trim();
    var password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      showError(loginError, 'Please fill in all fields.');
      return;
    }

    var btn = document.getElementById('loginSubmitBtn');
    if (btn) {
      btn.classList.add('loading');
      btn.disabled = true;
    }

    try {
      await auth.signInWithEmailAndPassword(email, password);
      btn.classList.remove('loading');
      btn.innerHTML = '<span>Welcome back!</span>';
      setTimeout(function () {
        window.location.href = 'app.html';
      }, 300);
    } catch (error) {
      if (btn) {
        btn.classList.remove('loading');
        btn.disabled = false;
      }

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
        case 'auth/invalid-credential':
          showError(loginError, 'Invalid email or password. Please try again.');
          break;
        default:
          showError(loginError, 'Login failed: ' + error.message);
      }
    }
  });

  // ===== Signup =====
  signupFormEl.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearErrors();

    var name = document.getElementById('signupName').value.trim();
    var email = document.getElementById('signupEmail').value.trim();
    var password = document.getElementById('signupPassword').value;
    var confirm = document.getElementById('signupConfirm').value;

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

    var btn = document.getElementById('signupSubmitBtn');
    if (btn) {
      btn.classList.add('loading');
      btn.disabled = true;
    }

    try {
      var userCredential = await auth.createUserWithEmailAndPassword(email, password);
      var user = userCredential.user;

      await user.updateProfile({ displayName: name });

      await db.collection('users').doc(user.uid).set({
        name: name,
        email: email,
        plan: 'free',
        credits: 5000,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      if (btn) {
        btn.classList.remove('loading');
        btn.disabled = false;
      }

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
          showError(signupError, 'Signup failed: ' + error.message);
      }
    }
  });

  // ===== Forgot Password =====
  forgotFormEl.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearErrors();

    var email = document.getElementById('forgotEmail').value.trim();

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
          showError(forgotError, 'Failed to send reset link: ' + error.message);
      }
    }
  });

  // ===== Google Auth =====
  async function signInWithGoogle() {
    var provider = new firebase.auth.GoogleAuthProvider();
    try {
      var result = await auth.signInWithPopup(provider);
      var user = result.user;

      var userDoc = await db.collection('users').doc(user.uid).get();
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
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error('[Auth] Google sign-in error:', error);
        alert('Google sign-in failed: ' + error.message);
      }
    }
  }

  if (googleLoginBtn) googleLoginBtn.addEventListener('click', signInWithGoogle);
  if (googleSignupBtn) googleSignupBtn.addEventListener('click', signInWithGoogle);

  // ===== Fatal Error Display =====
  function showFatalError(msg) {
    document.body.innerHTML =
      '<div style="color:#fff;text-align:center;padding:80px 20px;font-family:sans-serif;background:#0a0a0f;min-height:100vh">' +
      '<h2 style="color:#ff3366;margin-bottom:12px">Authentication Error</h2>' +
      '<p style="color:rgba(255,255,255,0.6)">' +
      msg +
      '</p>' +
      '<p style="margin-top:20px"><a href="index.html" style="color:#6c63ff">Go back to home</a></p>' +
      '</div>';
  }
})();

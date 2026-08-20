/* ===================================================================
   Firebase Configuration — Reads from env-config.js
   =================================================================== */

(function () {
  'use strict';

  function initFirebase() {
    var HD = (window.HuntDrop = window.HuntDrop || {});

    // Get Firebase config from env-config.js
    var config = HD.firebaseConfig || {
      apiKey: 'AIzaSyAspYJzwBTe7g_msKELnkJYZLNtb7Ssdns',
      authDomain: 'auto-drop-3d8b6.firebaseapp.com',
      projectId: 'auto-drop-3d8b6',
      storageBucket: 'auto-drop-3d8b6.firebasestorage.app',
      messagingSenderId: '',
      appId: '',
    };

    // Initialize Firebase
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
      firebase.initializeApp(config);
    }

    // Initialize services
    var auth = firebase.auth();
    var db = firebase.firestore();

    // Export for use in other files
    HD.firebase = { auth, db };

    console.log('[Firebase] Initialized for project:', config.projectId);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebase);
  } else {
    initFirebase();
  }

  // Retry if firebase SDK loads later
  setTimeout(initFirebase, 100);
  setTimeout(initFirebase, 500);
})();

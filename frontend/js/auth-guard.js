(function() {
    const token = localStorage.getItem('token');
    const path = window.location.pathname;
    const isAuthPage = path.includes('login.html') || 
                       path.includes('register.html') ||
                       path.includes('forgot-password.html');
    
    // If no token and not on an auth page, redirect to login
    if (!token && !isAuthPage) {
        window.location.href = 'login.html';
    }
    
    // Optional: If token exists and on login/register page, redirect to index
    if (token && isAuthPage) {
        window.location.href = 'index.html';
    }
})();

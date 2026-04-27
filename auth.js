// Firebase Auth Logic

// Initialize Firebase (Check if firebase is loaded from CDN)
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Check Auth State
    auth.onAuthStateChanged(user => {
        const authSection = document.getElementById('authSection');
        const userDashboard = document.getElementById('userDashboard');
        const adminDashboard = document.getElementById('adminDashboard');
        
        if (user) {
            if (authSection) authSection.style.display = 'none';
            
            // For demo: any email with 'admin' in it or the specific admin email
            const isAdmin = user.email.includes('admin') || user.email === 'geetasimaria1958@gmail.com'; 
            
            if (isAdmin) {
                if (adminDashboard) adminDashboard.style.display = 'block';
                if (userDashboard) userDashboard.style.display = 'none';
                loadAdminAppointments();
            } else {
                // Check if we should redirect back to booking
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('redirect') === 'booking') {
                    window.location.href = "index.html?open=booking";
                    return;
                }
                
                if (userDashboard) {
                    userDashboard.style.display = 'block';
                    toggleVisitFields('Portal');
                }
                if (adminDashboard) adminDashboard.style.display = 'none';
                loadUserAppointments(user.uid);
            }
        } else {
            if (authSection) authSection.style.display = 'block';
            if (userDashboard) userDashboard.style.display = 'none';
            if (adminDashboard) adminDashboard.style.display = 'none';
        }
    });

    // Google Login
    window.loginWithGoogle = function() {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then(result => console.log('Logged in:', result.user))
            .catch(error => alert(error.message));
    };

    // Toggle Login/Signup
    let isLogin = true;
    window.toggleAuth = function(e) {
        e.preventDefault();
        isLogin = !isLogin;
        document.getElementById('authBtn').innerText = isLogin ? 'Login' : 'Sign Up';
        document.getElementById('toggleLink').innerText = isLogin ? 'Sign Up' : 'Login';
        document.querySelector('#authSection p').firstChild.textContent = isLogin ? "Don't have an account? " : "Already have an account? ";
    };

    // Email Login/Signup
    if (document.getElementById('loginForm')) {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (isLogin) {
                auth.signInWithEmailAndPassword(email, password)
                    .catch(error => alert("Login Error: " + error.message));
            } else {
                auth.createUserWithEmailAndPassword(email, password)
                    .then(result => {
                        alert("Account created successfully!");
                        // Optionally create user doc in Firestore
                        db.collection('users').doc(result.user.uid).set({
                            email: email,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    })
                    .catch(error => alert("Sign Up Error: " + error.message));
            }
        });
    }

    // Logout
    window.logout = function() {
        auth.signOut();
    };

    // Load User Appointments
    async function loadUserAppointments(uid) {
        const list = document.getElementById('userAppointmentList');
        if (!list) return;

        try {
            const snapshot = await db.collection('bookings')
                .where('userId', '==', uid)
                .get();
            
            // Sort in JS to avoid index requirement for now
            const docs = snapshot.docs.sort((a, b) => b.data().timestamp - a.data().timestamp);
            renderList({ empty: snapshot.empty, forEach: (cb) => docs.forEach(cb) }, list, false);
        } catch (error) {
            console.error('Error loading user bookings:', error);
            list.innerHTML = '<p>Error loading your appointments.</p>';
        }
    }

    // Load Admin Appointments
    async function loadAdminAppointments() {
        const list = document.getElementById('adminAppointmentList');
        if (!list) return;

        try {
            const snapshot = await db.collection('bookings')
                .orderBy('timestamp', 'desc')
                .get();
            
            let total = 0, completed = 0, pending = 0, homeVisits = 0;
            
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    const data = doc.data();
                    total++;
                    if (data.status === 'completed') completed++;
                    else pending++;
                    if (data.visitType === 'visit-home') homeVisits++;
                });
            }

            updateMetrics(total, completed, pending, homeVisits);
            renderList(snapshot, list, true);
        } catch (error) {
            console.error('Error loading all bookings:', error);
            list.innerHTML = '<p>Error loading appointments. Please check permissions.</p>';
        }
    }

    function updateMetrics(total, completed, pending, home) {
        if (document.getElementById('metricTotal')) {
            document.getElementById('metricTotal').innerText = total;
            document.getElementById('metricCompleted').innerText = completed;
            document.getElementById('metricPending').innerText = pending;
            document.getElementById('metricHome').innerText = home;
        }
    }

    function renderList(snapshot, list, canDelete) {
        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<p>No appointments found.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const dateStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : 'Pending...';
            const div = document.createElement('div');
            div.className = 'appointment-item';
            div.innerHTML = `
                <div style="flex: 1;">
                    <strong>${data.name}</strong> (${data.phone})<br>
                    <small>${data.service} - ${data.date} at ${data.time || 'N/A'}</small>
                    <div style="font-size: 0.85rem; margin-top: 0.5rem; color: #d4a017;">
                        <i class="fa-solid ${data.visitType === 'visit-home' ? 'fa-house-user' : 'fa-shop'}"></i> 
                        ${data.visitType === 'visit-home' ? 'Home Visit' : 'Shop Visit'}
                    </div>
                    ${data.visitType === 'visit-home' 
                        ? `<div style="font-size: 0.8rem; background: #f0f0f0; padding: 0.5rem; border-radius: 5px; margin-top: 0.3rem;"><strong>Customer Address:</strong> ${data.address}</div>` 
                        : `<div style="font-size: 0.8rem; background: #FFF9E6; border: 1px solid #FFE699; padding: 0.5rem; border-radius: 5px; margin-top: 0.3rem;">
                            <strong>Shop Address:</strong> 102, Silver Sea View, Sector 8, Charkop, Kandivali West, Mumbai 067<br>
                            <a href="https://maps.app.goo.gl/7HTLRLdd4hmUUw3k9?g_st=ac" target="_blank" style="color: #d4a017; font-weight: 600; text-decoration: none; font-size: 0.75rem;">
                                <i class="fa-solid fa-location-dot"></i> View Maps
                            </a>
                           </div>`
                    }
                    <div style="font-size: 0.75rem; color: #AAA; margin-top: 0.3rem;">Booked on: ${dateStr}</div>
                </div>
                <div style="text-align: right;">
                    ${data.status === 'completed' 
                        ? `<span style="color: #28a745; font-weight: 600; font-size: 0.9rem;"><i class="fa-solid fa-circle-check"></i> Completed</span>` 
                        : (canDelete ? `<button class="btn btn-outline" style="padding: 0.5rem 1rem;" onclick="markAsCompleted('${doc.id}')">Mark Done</button>` : `<span style="color: #d4a017; font-size: 0.9rem;">Pending</span>`)
                    }
                </div>
            `;
            list.appendChild(div);
        });
    }

    window.markAsCompleted = async (id) => {
        if (confirm('Mark this appointment as completed?')) {
            await db.collection('bookings').doc(id).update({
                status: 'completed',
                completedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            loadAdminAppointments();
        }
    };
}

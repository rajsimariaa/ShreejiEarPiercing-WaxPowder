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
            list.innerHTML = `
                <div class="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <i class="fa-solid fa-calendar-xmark text-4xl text-gray-300 mb-4 block"></i>
                    <p class="text-gray-500 font-medium">No appointments found.</p>
                </div>
            `;
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const dateStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Pending...';
            const statusColor = data.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700';
            
            const div = document.createElement('div');
            div.className = 'group p-6 mb-6 bg-white rounded-3xl border border-gray-100 hover:border-gold-300 hover:shadow-gold-soft transition-all duration-300';
            div.innerHTML = `
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div class="flex-grow">
                        <div class="flex items-center gap-3 mb-2">
                            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColor}">
                                ${data.status || 'pending'}
                            </span>
                            <span class="text-gray-400 text-xs">${dateStr}</span>
                        </div>
                        <h4 class="text-xl font-bold text-dark mb-1">${data.name}</h4>
                        <div class="flex items-center gap-4 text-sm text-gray-500 mb-4">
                            <span><i class="fa-solid fa-phone text-gold-500 mr-1"></i> ${data.phone}</span>
                            <span><i class="fa-solid fa-clock text-gold-500 mr-1"></i> ${data.time || 'TBD'}</span>
                        </div>
                        
                        <div class="flex flex-wrap gap-2 mb-4">
                            <span class="bg-gray-50 px-3 py-1 rounded-lg text-xs font-semibold text-gray-600">
                                <i class="fa-solid fa-wand-magic-sparkles mr-1 text-gold-500"></i> ${data.service}
                            </span>
                            <span class="bg-gold-50 px-3 py-1 rounded-lg text-xs font-semibold text-gold-600 uppercase">
                                <i class="fa-solid ${data.visitType === 'visit-home' ? 'fa-house-chimney' : 'fa-shop'} mr-1"></i>
                                ${data.visitType === 'visit-home' ? 'Home Visit' : 'Shop Visit'}
                            </span>
                        </div>

                        ${data.visitType === 'visit-home' 
                            ? `<div class="p-4 bg-gray-50 rounded-2xl text-sm border border-gray-100">
                                <strong class="text-xs uppercase text-gray-400 block mb-1">Customer Address</strong>
                                <p class="text-gray-600">${data.address}</p>
                               </div>` 
                            : `<div class="p-4 bg-gold-50/30 rounded-2xl text-sm border border-gold-100 flex justify-between items-center">
                                <div>
                                    <strong class="text-xs uppercase text-gold-500 block mb-1">Shop Location</strong>
                                    <p class="text-gold-700 text-xs">Charkop, Kandivali West, Mumbai</p>
                                </div>
                                <a href="https://maps.app.goo.gl/7HTLRLdd4hmUUw3k9?g_st=ac" target="_blank" class="text-gold-600 hover:text-gold-700 font-bold transition-colors">
                                    <i class="fa-solid fa-location-dot"></i>
                                </a>
                               </div>`
                        }
                    </div>
                    <div class="flex md:flex-col items-center justify-end gap-3 min-w-[120px]">
                        ${data.status !== 'completed' && canDelete 
                            ? `<button class="w-full md:w-auto px-6 py-2 rounded-xl bg-gold-500 text-white font-bold text-sm hover:bg-gold-600 shadow-gold-soft transition-all active:scale-95" onclick="markAsCompleted('${doc.id}')">
                                Mark Done
                               </button>` 
                            : ''
                        }
                        ${data.status === 'completed' 
                            ? `<div class="flex items-center gap-1 text-green-600 font-bold text-sm">
                                <i class="fa-solid fa-circle-check"></i> Finished
                               </div>` 
                            : ''
                        }
                    </div>
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

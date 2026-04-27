// Initialize Firebase if not already done
if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}

// UI Logic for Shreeji Ear Piercing

function openBooking() {
    document.getElementById('bookingModal').style.display = 'flex';
    toggleVisitFields(''); // Reset fields
}

function closeBooking() {
    document.getElementById('bookingModal').style.display = 'none';
}

function toggleVisitFields(prefix = '') {
    const isHome = document.querySelector(`input[name="visitType${prefix}"]:checked`).value === 'visit-home';
    document.getElementById(`shopAddressSection${prefix}`).style.display = isHome ? 'none' : 'block';
    document.getElementById(`homeAddressSection${prefix}`).style.display = isHome ? 'block' : 'none';
    if (isHome) {
        document.getElementById(`custAddress${prefix}`).setAttribute('required', 'true');
    } else {
        document.getElementById(`custAddress${prefix}`).removeAttribute('required');
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('bookingModal');
    if (event.target == modal) {
        closeBooking();
    }
}

// Booking Form Submission
async function handleBooking(e, prefix = '') {
    e.preventDefault();
    
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("Please login first!");
        window.location.href = "portal.html";
        return;
    }

    const visitType = document.querySelector(`input[name="visitType${prefix}"]:checked`).value;
    const bookingData = {
        userId: user.uid,
        name: document.getElementById('custName' + prefix).value,
        phone: document.getElementById('custPhone' + prefix).value,
        service: document.getElementById('custService' + prefix).value,
        date: document.getElementById('custDate' + prefix).value,
        time: document.getElementById('custTime' + prefix).value,
        visitType: visitType,
        address: visitType === 'visit-home' ? document.getElementById('custAddress' + prefix).value : 'Shop Visit',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const db = firebase.firestore();
        console.log('Attempting to save booking...', bookingData);
        await db.collection('bookings').add(bookingData);
        alert('Booking Successful! We will contact you soon.');
        
        if (prefix === '') {
            closeBooking();
        } else if (typeof loadUserAppointments !== 'undefined') {
            loadUserAppointments(user.uid);
        }
        
        e.target.reset();
    } catch (error) {
        console.error('Firestore Error:', error);
        alert('Booking Error: ' + error.message);
    }
}

// Attach to Home Form
if (document.getElementById('bookingForm')) {
    document.getElementById('bookingForm').addEventListener('submit', (e) => handleBooking(e, ''));
}

// Attach to Portal Form
if (document.getElementById('bookingFormPortal')) {
    document.getElementById('bookingFormPortal').addEventListener('submit', (e) => handleBooking(e, 'Portal'));
}

const getTicketCount = async () => {
    const countElement = document.getElementById('count');

    try {
        const response = await fetch('/api/tickets/count');
        if (!response.ok) {
            throw new Error('Greška prilikom dohvata broja ulaznica.');
        }
        const data = await response.json();
        countElement.textContent = data.count;
    } catch (error) {
        console.error('Greška prilikom dohvata broja ulaznica:', error);
        countElement.textContent = 'Greška prilikom dohvata broja ulaznica.';
    }
};

// Funkcija za provjeru prijavljenosti korisnika
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth-status');
        if (response.ok) {
            const data = await response.json();
            if (data.isAuthenticated) {
                document.getElementById('logout-container').style.display = 'flex';
                document.querySelector('.user-info span').textContent = data.user.name; 
                document.querySelector('.user-avatar').textContent = data.user.name.charAt(0); 
            } else {
                hideUserElements();
            }
        }
    } catch (error) {
        console.error('Greška prilikom provjere statusa prijave:', error);
    }
}

// Funkcija za sakrivanje elemenata korisnika
function hideUserElements() {
    document.getElementById('logout-container').style.display = 'none';
    document.querySelector('.user-info').style.display = 'none';
}


async function logout() {
    window.location.href = '/logout';
};


function initPage() {
    getTicketCount();
    checkAuthStatus();
}

document.addEventListener('DOMContentLoaded', initPage);
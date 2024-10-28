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
    document.querySelector('.ticketContainer').style.display = 'none';

}


async function logout() {
    //------
    const qrCodeElement = document.getElementById('qrCode'); // Id elementa sa QR kodom
    if (qrCodeElement) qrCodeElement.style.display = 'none';
    ///------
    window.location.href = '/logout';
};


//-------------------
async function fetchLastTicket() {
    try {
      const response = await fetch('/api/lastGeneratedTicket');
      
      if (!response.ok) {
        console.log('Nema generirane ulaznice za prikaz.');
        document.getElementById('ticketContainer').style.display = 'one';
        return;
      }

      const { qrCode } = await response.json();
   
      document.getElementById('ticketQRCode').src = qrCode;

      document.getElementById('ticketContainer').style.display = 'block';

    } catch (error) {
      console.error('Greška prilikom dohvata zadnje ulaznice:', error);
    }
  }


//==----------------------


function initPage() {
    getTicketCount();
    checkAuthStatus();
    //---
    fetchLastTicket();
    //---
}


document.addEventListener('DOMContentLoaded', initPage);
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

    // Giriş yapma formu
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            handleFormSubmit(e, "http://localhost:5000/login", "Giriş başarılı!", "user.html");
        });
    }

    // Kayıt olma formu
    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
            handleFormSubmit(e, "http://localhost:5000/register", "Kayıt başarılı!", "login.html");
        });
    }

    // Kullanıcı profil sayfası
    const userId = localStorage.getItem("userId");
    const userName = localStorage.getItem("userName");
    if (userId && document.querySelector("h2")) {
        document.querySelector("h2").textContent = `Hoş Geldiniz, ${userName}`;
    } else if (!userId && document.body.id === "user-page") {
        alert("Giriş yapmadınız! Lütfen giriş yapın.");
        window.location.href = "login.html";
    }

    // Çıkış yapma
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("userId");
            localStorage.removeItem("userName");
            alert("Çıkış yaptınız!");
            window.location.href = "index.html";
        });
    }
});

// Form gönderme işlemi
function handleFormSubmit(event, url, successMessage, redirectUrl) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
        .then((response) => {
            if (response.ok) {
                return response.json();
            } else {
                return response.json().then((data) => {
                    throw new Error(data.message || "Bir hata oluştu!");
                });
            }
        })
        .then((data) => {
            if (data.userId) {
                localStorage.setItem("userId", data.userId);
                localStorage.setItem("userName", data.userName);
            }
            alert(successMessage);
            window.location.href = redirectUrl;
        })
        .catch((error) => {
            console.error("Hata:", error);
            alert(error.message);
        });
}

// Şifre değiştirme
function changePassword() {
    const oldPassword = prompt("Eski şifrenizi girin:");
    const newPassword = prompt("Yeni şifrenizi girin:");
    const userId = localStorage.getItem("userId");

    if (!userId) {
        alert("Kullanıcı ID bulunamadı! Lütfen giriş yapın.");
        return;
    }

    fetch("/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, oldPassword, newPassword }),
    })
        .then((response) => response.json())
        .then((data) => {
            alert(data.message);
        })
        .catch((error) => {
            console.error("Hata:", error);
            alert("Şifre değiştirilirken bir hata oluştu.");
        });
}

// Rezervasyon iptali
function cancelReservation(eventName) {
    const userId = localStorage.getItem("userId");

    if (!userId) {
        alert("Kullanıcı ID bulunamadı! Lütfen giriş yapın.");
        return;
    }

    fetch("/cancel-reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, eventName }),
    })
        .then((response) => response.json())
        .then((data) => {
            alert(data.message);
        })
        .catch((error) => {
            console.error("Hata:", error);
            alert("Rezervasyon iptali sırasında bir hata oluştu.");
        });
}

// Kayıtlı etkinlikleri yükleme
function loadRegisteredEvents() {
    const userId = localStorage.getItem("userId");
    if (!userId) {
        alert("Kullanıcı bilgileri bulunamadı. Lütfen giriş yapın.");
        return;
    }

    fetch(`http://localhost:5000/user/${userId}/events`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Etkinlikler alınırken bir hata oluştu.");
            }
            return response.json();
        })
        .then(events => {
            const eventsContainer = document.getElementById("registered-events");
            eventsContainer.innerHTML = ""; // Eski etkinlikleri temizle

            if (events.length === 0) {
                eventsContainer.innerHTML = "<p>Kayıtlı etkinliğiniz bulunmamaktadır.</p>";
                return;
            }

            events.forEach(event => {
                const eventCard = document.createElement("div");
                eventCard.className = "event-card";
                eventCard.innerHTML = `
                    <h3>${event.event_name}</h3>
                    <p>Tarih: ${new Date(event.event_date).toLocaleDateString("tr-TR")}</p>
                    <p>Yer: ${event.event_location}</p>
                    <button onclick="cancelReservation('${event.event_name}')">Rezervasyonu İptal Et</button>
                `;
                eventsContainer.appendChild(eventCard);
            });
        })
        .catch(error => {
            console.error("Hata:", error);
            alert("Etkinlikler yüklenemedi.");
        });
}
function loadRentedEquipment() {
    const userId = localStorage.getItem("userId");
    if (!userId) {
        alert("Kullanıcı bilgileri bulunamadı. Lütfen giriş yapın.");
        return;
    }

    fetch(`http://localhost:5000/user/${userId}/equipment`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Kiraladığınız ekipmanlar alınırken bir hata oluştu.");
            }
            return response.json();
        })
        .then(equipment => {
            const equipmentContainer = document.getElementById("rented-equipment");
            equipmentContainer.innerHTML = ""; // Eski ekipmanları temizle

            if (equipment.length === 0) {
                equipmentContainer.innerHTML = "<p>Kiraladığınız ekipman bulunmamaktadır.</p>";
                return;
            }

            equipment.forEach(item => {
                const equipmentCard = document.createElement("div");
                equipmentCard.className = "equipment-card";
                equipmentCard.innerHTML = `
                    <h3>${item.equipment_name}</h3>
                    <p>Kiralanan Tarih: ${new Date(item.rental_date).toLocaleDateString("tr-TR")}</p>
                    <p>Durum: ${item.status}</p>
                    ${
                        item.status === "kiralandı"
                            ? `<button onclick="cancelRental(${item.rental_id})">Kiralamayı İptal Et</button>`
                            : `<p style="color: red;">Bu kiralama iptal edilmiştir.</p>`
                    }
                `;
                equipmentContainer.appendChild(equipmentCard);
            });
        })
        .catch(error => {
            console.error("Hata:", error);
            alert("Kiraladığınız ekipmanlar yüklenemedi.");
        });
}

function cancelRental(rentalId) {
    const userId = localStorage.getItem("userId"); // Kullanıcı ID'sini yerel depodan al

    if (!userId) {
        alert("Kullanıcı bilgileri bulunamadı. Lütfen giriş yapın.");
        return;
    }

    if (!rentalId) {
        alert("Kiralama ID'si bulunamadı.");
        return;
    }

    fetch("http://localhost:5000/cancel-rental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, rentalId }),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Kiralama iptal edilemedi.");
            }
            return response.json();
        })
        .then((data) => {
            alert(data.message || "Kiralama başarıyla iptal edildi.");
            loadRentedEquipment(); // Kiralanan ekipmanları tekrar yükle
        })
        .catch((error) => {
            console.error("Hata:", error);
            alert("Kiralama iptal edilirken bir hata oluştu.");
        });
}

// Sayfa yüklendiğinde etkinlikleri ve ekipmanları yükle
window.onload = () => {
    loadRegisteredEvents();
    loadRentedEquipment();
};

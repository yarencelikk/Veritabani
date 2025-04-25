// Etkinlik listesi yükleme
document.addEventListener("DOMContentLoaded", () => {
    fetch("http://localhost:5000/events")
        .then((response) => {
            if (!response.ok) {
                throw new Error("Etkinlikler yüklenirken bir hata oluştu.");
            }
            return response.json();
        })
        .then((events) => {
            const eventList = document.getElementById("event-list");
            eventList.innerHTML = ""; // Mevcut içeriği temizle

            events.forEach((event) => {
                const eventCard = document.createElement("div");
                eventCard.className = "event-card";

                const formattedDate = new Date(event.event_date).toLocaleDateString("tr-TR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                });

                eventCard.innerHTML = `
                    <h3>${event.event_name}</h3>
                    <p>Tarih: ${formattedDate}</p>
                    <p>Yer: ${event.event_location}</p>
                    <button onclick="showDetails(${event.id})">Detayları Gör</button>
                `;

                eventList.appendChild(eventCard);
            });
        })
        .catch((error) => {
            console.error("Hata:", error);
            alert("Etkinlikler yüklenemedi.");
        });
});

// Etkinlik detayına yönlendirme
function showDetails(eventId) {
    window.location.href = `event-details.html?eventId=${eventId}`;
}

// Etkinlik detaylarını yükleme
function loadEventDetails() {
    const eventId = new URLSearchParams(window.location.search).get("eventId");

    // Etkinlik detaylarını yükle
    fetch(`http://localhost:5000/events/${eventId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Etkinlik bilgileri yüklenirken bir hata oluştu.");
            }
            return response.json();
        })
        .then(event => {
            const eventDate = new Date(event.event_date).toLocaleDateString("tr-TR", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });

            document.querySelector("#event-details h2").textContent = event.event_name;
            document.querySelector("#event-details p:nth-of-type(1)").textContent = `Tarih: ${eventDate}`;
            document.querySelector("#event-details p:nth-of-type(2)").textContent = `Yer: ${event.event_location}`;
            document.querySelector("#event-details p:nth-of-type(3)").textContent = `Kapasite: ${event.capacity}`;
        })
        .catch(error => {
            console.error("Etkinlik bilgileri yüklenirken bir hata oluştu:", error);
            document.querySelector("#event-details").innerHTML = "<p>Etkinlik bulunamadı.</p>";
        });
}

// Ekipmanları yükleme
function loadEquipment(eventId) {
    fetch(`http://localhost:5000/events/${eventId}/equipment`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Ekipman bilgileri yüklenirken bir hata oluştu.");
            }
            return response.json();
        })
        .then(equipment => {
            const equipmentList = document.getElementById("equipment-list");

            // API'den dönen ekipman verisini kontrol edelim
            console.log(equipment); // API'den dönen ekipman verisi
            console.log(equipmentList); // Ekipmanların ekleneceği HTML elementi

            equipmentList.innerHTML = ""; // Önceki ekipmanları temizle

            equipment.forEach(item => {
                const equipmentItem = document.createElement("div");
                equipmentItem.className = "equipment-item";
                equipmentItem.innerHTML = `
                    <p>${item.equipment_name}</p>
                    <p>Mevcut Stok: ${item.stock}</p>
                    <button onclick="rentEquipment(${item.id})">Kirala</button>
                `;
                equipmentList.appendChild(equipmentItem);
            });
        })
        .catch(error => {
            console.error("Ekipmanlar yüklenirken bir hata oluştu:", error);
            alert("Ekipmanlar yüklenemedi.");
        });
}


// Ekipman kiralama
function rentEquipment(equipmentId) {
    const userId = localStorage.getItem("userId");
    if (!userId) {
        alert("Lütfen giriş yapın.");
        return;
    }

    fetch("http://localhost:5000/rentals", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, equipmentId }),
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Kiralama işlemi sırasında bir hata oluştu.");
            }
            return response.json();
        })
        .then(data => {
            alert(data.message || "Ekipman başarıyla kiralandı!");
            loadEquipment(); // Stok bilgisini güncelle
        })
        .catch(error => {
            console.error("Hata:", error);
            alert("Kiralama işlemi başarısız oldu.");
        });
}

// Sayfa yüklendiğinde
window.onload = () => {
    const eventId = getEventId(); // Etkinlik ID'sini alın
    if (eventId) {
        loadEventDetails(); // Etkinlik detaylarını yükle
        loadEquipment(eventId); // Ekipmanları yükle
    }
};



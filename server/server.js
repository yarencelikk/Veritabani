const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// MySQL Bağlantısı
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "yaren",
    database: "etkinliksistemi",
});

db.connect((err) => {
    if (err) {
        console.error("MySQL Bağlantı Hatası:", err);
    } else {
        console.log("MySQL Bağlantısı Başarılı!");
    }
});
// Kullanıcı Kaydı
app.post("/register", (req, res) => {
    const { name, email, password } = req.body;

    // Şifreyi hashle
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error("Şifre hashleme hatası:", err);
            return res.status(500).json({ message: "Bir hata oluştu." });
        }

        const sql = "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)";
        db.query(sql, [name, email, hashedPassword], (err, result) => {
            if (err) {
                console.error("Veritabanı hatası:", err);
                return res.status(500).json({ message: "Veritabanı hatası." });
            }
            res.status(200).json({ message: "Kayıt başarılı!" });
        });
    });
});

// Giriş Yapma
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], (err, results) => {
        if (err) {
            console.error("Veritabanı hatası:", err);
            return res.status(500).json({ message: "Bir hata oluştu." });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: "E-posta veya şifre hatalı." });
        }

        const user = results[0];

        // Şifreyi doğrula
        bcrypt.compare(password, user.password_hash, (err, isMatch) => {
            if (err) {
                console.error("Şifre doğrulama hatası:", err);
                return res.status(500).json({ message: "Bir hata oluştu." });
            }

            if (!isMatch) {
                return res.status(401).json({ message: "E-posta veya şifre hatalı." });
            }

            res.status(200).json({
                message: "Giriş başarılı!",
                userId: user.id,
                userName: user.name,
                profilePic: user.profile_pic,
            });
        });
    });
});
// Şifre Değiştirme
app.post("/change-password", (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;

    const sql = "SELECT password_hash FROM users WHERE id = ?";
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Veritabanı hatası:", err);
            return res.status(500).json({ message: "Bir hata oluştu." });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "Kullanıcı bulunamadı." });
        }

        const user = results[0];

        bcrypt.compare(oldPassword, user.password_hash, (err, isMatch) => {
            if (!isMatch) {
                return res.status(401).json({ message: "Eski şifre hatalı." });
            }

            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                if (err) {
                    console.error("Şifre hashleme hatası:", err);
                    return res.status(500).json({ message: "Bir hata oluştu." });
                }

                const updateSql = "UPDATE users SET password_hash = ? WHERE id = ?";
                db.query(updateSql, [hashedPassword, userId], (err, result) => {
                    if (err) {
                        console.error("Veritabanı hatası:", err);
                        return res.status(500).json({ message: "Şifre güncellenemedi." });
                    }
                    res.status(200).json({ message: "Şifre başarıyla güncellendi." });
                });
            });
        });
    });
});
// Etkinlikleri Getirme
app.get("/events", (req, res) => {
    const sql = "SELECT id, event_name, event_date, event_location, capacity, price FROM events";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Veritabanı hatası:", err);
            return res.status(500).json({ message: "Etkinlikler alınamadı." });
        }
        res.status(200).json(results);
    });
});

// Belirli bir etkinliği getirme
app.get("/events/:id", (req, res) => {
    const eventId = req.params.id;
    const sql = "SELECT id, event_name, event_date, event_location, capacity, price FROM events WHERE id = ?";
    db.query(sql, [eventId], (err, results) => {
        if (err) {
            console.error("Veritabanı hatası:", err);
            return res.status(500).json({ message: "Etkinlik alınamadı." });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "Etkinlik bulunamadı." });
        }
        res.status(200).json(results[0]);
    });
});

// Belirli bir etkinliğe ait ekipmanları getirme
app.get("/events/:id/equipment", (req, res) => {
    const eventId = req.params.id;
    const sql = "SELECT id, equipment_name, stock FROM event_equipment WHERE event_id = ?";
    db.query(sql, [eventId], (err, results) => {
        if (err) {
            console.error("Veritabanı hatası:", err);
            return res.status(500).json({ message: "Ekipmanlar alınamadı." });
        }
        res.status(200).json(results);
    });
});
app.post("/reserve", (req, res) => {
    const { userId, eventId } = req.body;

    const sqlCheckCapacity = `
        SELECT capacity, 
               (SELECT COUNT(*) FROM user_events WHERE event_id = ?) AS current_participants 
        FROM events 
        WHERE id = ?;
    `;

    db.query(sqlCheckCapacity, [eventId, eventId], (err, results) => {
        if (err) {
            console.error("Veritabanı hatası:", err);
            return res.status(500).json({ message: "Bir hata oluştu." });
        }

        const { capacity, current_participants } = results[0];
        if (current_participants >= capacity) {
            return res.status(400).json({ message: "Etkinlik kapasitesi dolu." });
        }

        const sqlInsertReservation = "INSERT INTO user_events (user_id, event_id) VALUES (?, ?)";
        db.query(sqlInsertReservation, [userId, eventId], (err) => {
            if (err) {
                console.error("Rezervasyon kaydedilemedi:", err);
                return res.status(500).json({ message: "Rezervasyon işlemi başarısız oldu." });
            }
            res.status(200).json({ message: "Rezervasyon başarıyla tamamlandı!" });
        });
    });
});
app.post("/rentals", (req, res) => {
    const { userId, equipmentId } = req.body;

    const sqlCheckStock = "SELECT stock FROM event_equipment WHERE id = ?";
    db.query(sqlCheckStock, [equipmentId], (err, results) => {
        if (err) {
            console.error("Veritabanı hatası:", err);
            return res.status(500).json({ message: "Bir hata oluştu." });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "Ekipman bulunamadı." });
        }
        if (results[0].stock <= 0) {
            return res.status(400).json({ message: "Ekipman stokta yok." });
        }

        const sqlInsertRental = "INSERT INTO rentals (user_id, equipment_id) VALUES (?, ?)";
        db.query(sqlInsertRental, [userId, equipmentId], (err) => {
            if (err) {
                console.error("Rezervasyon kaydedilemedi:", err);
                return res.status(500).json({ message: "Kiralama işlemi başarısız oldu." });
            }

            const sqlUpdateStock = "UPDATE event_equipment SET stock = stock - 1 WHERE id = ?";
            db.query(sqlUpdateStock, [equipmentId], (err) => {
                if (err) {
                    console.error("Stok güncellenemedi:", err);
                    return res.status(500).json({ message: "Stok güncellenemedi." });
                }
                res.status(200).json({ message: "Ekipman başarıyla kiralandı!" });
            });
        });
    });
});
app.get("/user/:id/events", (req, res) => {
    const userId = req.params.id;
    const sql = `
        SELECT e.event_name, e.event_date, e.event_location 
        FROM user_events ue 
        INNER JOIN events e ON ue.event_id = e.id 
        WHERE ue.user_id = ?;
    `;
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Veritabanı hatası:", err);
            return res.status(500).json({ message: "Etkinlikler alınamadı." });
        }
        res.status(200).json(results);
    });
});
app.post("/cancel-reservation", (req, res) => {
    const { userId, eventName } = req.body;

    const sqlDeleteReservation = `
        DELETE ue 
        FROM user_events ue
        INNER JOIN events e ON ue.event_id = e.id
        WHERE ue.user_id = ? AND e.event_name = ?;
    `;

    db.query(sqlDeleteReservation, [userId, eventName], (err, result) => {
        if (err) {
            console.error("Rezervasyon iptal hatası:", err);
            return res.status(500).json({ message: "Rezervasyon iptal edilemedi." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Rezervasyon bulunamadı." });
        }

        // Kapasiteyi artır
        const sqlIncreaseCapacity = `
            UPDATE events 
            SET capacity = capacity + 1 
            WHERE event_name = ?;
        `;

        db.query(sqlIncreaseCapacity, [eventName], (err) => {
            if (err) {
                console.error("Kapasite artırılamadı:", err);
                return res.status(500).json({ message: "Kapasite artırılamadı." });
            }

            res.status(200).json({ message: `${eventName} etkinliği için rezervasyon iptal edildi ve kapasite artırıldı.` });
        });
    });
});

app.get("/user/:id/equipment", (req, res) => {
    const userId = req.params.id;
    const sql = `
        SELECT r.id AS rental_id, e.equipment_name, r.rental_date, r.status
        FROM rentals r
        INNER JOIN event_equipment e ON r.equipment_id = e.id
        WHERE r.user_id = ?;
    `;
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Veritabanı hatası:", err);
            return res.status(500).json({ message: "Ekipmanlar alınamadı." });
        }
        res.status(200).json(results);
    });
});

app.post("/cancel-rental", (req, res) => {
    console.log("Gelen Veriler:", req.body); // Gelen veriyi logla

    const { userId, rentalId } = req.body;

    if (!userId || !rentalId) {
        return res.status(400).json({ message: "Kullanıcı ID ve Kiralama ID gerekli." });
    }

    // Kiralama durumunu kontrol et
    const sqlCheckRental = `
        SELECT equipment_id 
        FROM rentals 
        WHERE id = ? AND user_id = ? AND status = 'kiralandı';
    `;

    db.query(sqlCheckRental, [rentalId, userId], (err, results) => {
        if (err) {
            console.error("Veritabanı hatası:", err);
            return res.status(500).json({ message: "Kiralama bilgisi alınamadı." });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "Kiralama bulunamadı veya zaten iptal edilmiş." });
        }

        const equipmentId = results[0].equipment_id;

        // Kiralamayı iptal et ve iade tarihini güncelle
        const sqlUpdateRental = `
            UPDATE rentals 
            SET status = 'iptal edildi', return_date = NOW() 
            WHERE id = ? AND user_id = ?;
        `;

        db.query(sqlUpdateRental, [rentalId, userId], (err, updateResult) => {
            if (err) {
                console.error("Kiralama durumu güncellenemedi:", err);
                return res.status(500).json({ message: "Kiralama iptal edilemedi." });
            }

            if (updateResult.affectedRows === 0) {
                return res.status(404).json({ message: "Kiralama iptal edilemedi. Belirtilen kayıt bulunamadı." });
            }

            // Stok bilgisini güncelle
            const sqlUpdateStock = `
                UPDATE event_equipment 
                SET stock = stock + 1 
                WHERE id = ?;
            `;

            db.query(sqlUpdateStock, [equipmentId], (err) => {
                if (err) {
                    console.error("Stok güncellenemedi:", err);
                    return res.status(500).json({ message: "Stok güncellenemedi." });
                }

                res.status(200).json({ message: "Kiralama başarıyla iptal edildi ve stok güncellendi." });
            });
        });
    });
});


// Sunucuyu Başlat
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});

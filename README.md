# Game Penjumlahan - Seret Jawaban dengan Tangan (CNN)

Tugas mata kuliah **Kecerdasan Buatan**.

## Cara menjalankan
1. Ekstrak file zip.
2. Buka terminal di folder `game-penjumlahan` lalu jalankan: `python3 -m http.server 8000`
3. Buka **Google Chrome** ke `http://localhost:8000` dan **izinkan akses kamera**.
4. Tidak perlu internet: library & model MediaPipe sudah ada di folder `mediapipe/`.

(Harus lewat `localhost`, bukan klik dua kali `index.html`, karena browser memblokir pemuatan model dari `file://`.)

## Cara bermain
- Kamera menyala dan menampilkan tangan Anda beserta 21 titik sendinya.
- Titik biru = ujung **jempol** dan **telunjuk**. **Cubit** keduanya (dekatkan sampai menyentuh) di atas kartu angka jawaban.
- Selama masih mencubit, **seret** kartu ke kotak **?** pada soal, lalu **lepas** cubitan.
- Jika dilepas di luar kotak, kartu kembali ke tempat semula dan Anda bisa mencoba lagi.
- Tombol Mulai / Main Lagi: cubit di atasnya, atau tahan telunjuk ~1 detik.
- Total **10 soal** acak (penjumlahan 1-10), **10 poin per soal**, **skor maksimal 100**.
- Jika kamera tidak tersedia, game tetap bisa dicoba dengan mouse (tekan & seret).

## Metode CNN yang dipakai
Deteksi tangan memakai **MediaPipe Hands** yang terdiri dari dua model Convolutional Neural Network:
1. **Palm Detector** - CNN (single-shot detector) yang mencari lokasi telapak tangan pada frame kamera.
2. **Hand Landmark Model** - CNN regresi yang memprediksi **21 titik sendi (landmark)** tangan dalam koordinat 3D.

Gestur **cubit** dideteksi dari landmark: jarak ujung jempol (titik 4) ke ujung telunjuk (titik 8) dibagi ukuran telapak
(titik 0 ke titik 9). Rasio < 0,30 = mencubit (mulai menyeret), rasio > 0,50 = lepas (hysteresis agar tidak berkedip).
Posisi kartu mengikuti titik tengah jempol-telunjuk yang dihaluskan (exponential smoothing).

## Struktur file
- `index.html` - tampilan halaman
- `style.css` - gaya tampilan
- `game.js` - logika game, gestur cubit & seret, integrasi deteksi tangan
- `mediapipe/` - library dan model CNN MediaPipe Hands (lokal)

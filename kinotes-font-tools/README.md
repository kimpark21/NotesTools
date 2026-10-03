# KINOTES TUTORIAL TOOLS

Downloader font DaFont berbasis Vercel, dibuat untuk workflow batch sederhana.

## Fitur utama
- **Auto download:** cukup masukkan jumlah, misalnya `100`, lalu daftar font diambil otomatis dan diunduh satu per satu.
- Maksimal 500 font per sesi.
- Progress bar + jumlah berhasil, dilewati, dan gagal.
- Anti-duplikat berbasis `localStorage` pada browser.
- Pencarian font DaFont tetap tersedia sebagai mode manual.
- Tempel banyak URL font jika ingin menentukan font sendiri.
- Download dilakukan berurutan untuk mengurangi burst request.
- Halaman lisensi tetap ditautkan agar pengguna dapat memeriksa ketentuan font.
- Dashboard transparansi donasi dan misi sosial.

## Deploy ke Vercel
1. Upload folder ini ke GitHub.
2. Di Vercel pilih **Add New → Project** lalu import repository.
3. Tidak perlu build command khusus.
4. Deploy.

## Cara memakai Auto download
1. Buka tab **Auto download**.
2. Isi jumlah, misalnya `100`.
3. Klik **Mulai download otomatis**.
4. Browser akan meminta/menjalankan banyak download jika pengaturan browser mengizinkannya.
5. Font yang sudah tercatat di perangkat akan otomatis dilewati.

## Catatan penting
- Mode auto mengambil daftar dari halaman daftar font DaFont melalui `/api/list`.
- DaFont dapat mengubah struktur halaman atau menerapkan pembatasan akses; jika itu terjadi, endpoint dapat perlu diperbarui.
- Project ini tidak mengklaim afiliasi dengan DaFont maupun OpenAI.
- Status lisensi setiap font berbeda. Periksa halaman font sebelum penggunaan komersial.
- Jangan gunakan batch besar secara agresif. Fitur sengaja memproses satu per satu.

## Donasi
Data donasi di `app.js` sengaja kosong sampai kamu memasukkan data transaksi nyata. Jangan mengisi nominal fiktif.

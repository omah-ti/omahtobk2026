# CSV Import Template (Soal Service)

Import soal sekarang memakai **1 file CSV saja**.

## Endpoint

- Method: `POST`
- URL: `/soal/import/csv`
- Auth: wajib JWT + role `admin`
- Content-Type: `multipart/form-data`

Alternatif bulk CSV + image sekaligus:

- Method: `POST`
- URL: `/soal/import/csv-bundle`
- Auth: wajib JWT + role `admin`
- Content-Type: `multipart/form-data`

## Multipart Form Field

- `soal_csv` (wajib, maksimal 5 MB)

Untuk endpoint `/soal/import/csv-bundle`:

- `bundle_zip` (wajib, maksimal 30 MB)

## Paket Soal

- Paket soal otomatis dipakai: `paket1`
- Nama paket default: `Paket Soal Tryout`

## Header CSV

Required headers:

- `kode_soal`
- `subtest`
- `tipe_soal`
- `text_soal`
- `bobot_soal`
- `is_image`

Optional headers:

- `pembahasan`
- `image_path`
- `pilihan_a`
- `pilihan_b`
- `pilihan_c`
- `pilihan_d`
- `pilihan_e`
- `kunci_pg`
- `pilihan_tf`
- `jawaban_tf`
- `jawaban_uraian`

## Aturan Validasi

- `subtest` hanya boleh: `subtest_pu`, `subtest_ppu`, `subtest_pbm`, `subtest_pk`, `subtest_lbi`, `subtest_lbe`, `subtest_pm`
- `tipe_soal` hanya boleh: `multiple_choice`, `true_false`, `short_answer`
- `bobot_soal` integer 1..100
- `kode_soal` harus unik per file
- `is_image=true` wajib mengisi `image_path`
- `image_path` tidak boleh berisi `..`, `\\`, atau awalan `/`

Per tipe soal:

- `multiple_choice`: minimal 2 pilihan terisi dari `pilihan_a..pilihan_e`, `kunci_pg` wajib valid dan menunjuk pilihan terisi. Bisa single (`B`) atau multi (`B|D`) dengan pemisah `|`, `,`, `;`, `/`, atau spasi.
- `true_false`: `jawaban_tf` wajib (`true/false`), `pilihan_tf` opsional (kalau kosong akan pakai `text_soal`)
- `short_answer`: `jawaban_uraian` wajib

## Catatan Gambar

`image_path` langsung disimpan ke `path_gambar_soal`.
Kalau ingin upload binary image ke object storage, tetap pakai endpoint upload image terpisah.

Jika memakai endpoint `/soal/import/csv-bundle`, image akan dicari dari ZIP sesuai `image_path`, dikonversi ke WebP, lalu diupload ke object storage otomatis.

### Struktur ZIP yang direkomendasikan

Contoh:

```text
bundle-import.zip
  soal.csv
  images/
    imgtest.png
    subtest_pu/
      pu-001.png
```

Maka nilai `image_path` di CSV harus match persis relatif terhadap root ZIP, misalnya:

- `images/imgtest.png`
- `images/subtest_pu/pu-001.png`

## Contoh cURL

```bash
curl -X POST "http://localhost:8082/soal/import/csv" \
  -H "Authorization: Bearer <token-admin>" \
  -F "soal_csv=@soal.csv"
```

Contoh bundle ZIP:

```bash
curl -X POST "http://localhost:8082/soal/import/csv-bundle" \
  -H "Authorization: Bearer <token-admin>" \
  -F "bundle_zip=@bundle-import.zip"
```

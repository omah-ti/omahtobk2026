export type Alumni = {
  name: string
  role: string
  image: string
  desc: string
  division?:
    | 'frontend'
    | 'backend'
    | 'uiux'
    | 'mobapps'
    | 'cysec'
    | 'dsai'
    | 'gamedev'
}

export const ALUMNI: Alumni[] = [
  {
    name: 'Ken Bima Satria Gandasasmita',
    role: "UX Champion | CS'23",
    division: 'uiux',
    image: '/assets/alumni/ken-bima-satria-gandasasmita.webp',
    desc: 'Menyabet gelar juara pertama pada ajang 4C National Competition (UX Challenge) serta berhasil menembus jajaran finalis GEMASTIK XVII. Rekam jejaknya dalam berbagai turnamen desain skala nasional menjadi bukti nyata kemampuannya dalam melahirkan konsep digital yang segar dan solutif bagi para penggunanya.',
  },
  {
    name: 'Nadia Hasna Azzahra',
    role: "UX & Product Design Enthusiast | CS'21",
    division: 'uiux',
    image: '/assets/alumni/nadia-hasna-azzahra.webp',
    desc: 'Merupakan peraih posisi kedua di TECHFEST UI/UX Competition dan salah satu finalis unggulan dalam kategori Desain Pengalaman Pengguna pada GEMASTIK XVI. Intensitasnya dalam mengikuti berbagai ajang kompetisi nasional menunjukkan kemahiran dalam menyusun rancangan aplikasi yang mengedepankan kemudahan serta kebutuhan pengguna.',
  },
  {
    name: 'Gabriella Christina Kandinata',
    role: 'Product Designer',
    division: 'uiux',
    image: '/assets/alumni/gabriella-christina.webp',
    desc: 'Saat ini mendedikasikan keahliannya di Fairatmos, setelah sebelumnya memperkuat tim Momentree. Ia memiliki spesialisasi dalam menciptakan ekosistem digital yang humanis, di mana setiap elemen visual dan fungsionalitas produk dibangun berdasarkan hasil analisis serta riset yang mendalam.',
  },
  {
    name: 'Angger Dillah K.',
    role: 'UX Researcher',
    division: 'uiux',
    image: '/assets/alumni/angger-dillah-k.webp',
    desc: 'Tenaga ahli senior di DELOS yang bertugas menjamin setiap aspek teknologi terasa alami dan mudah dipahami oleh pemakai. Melalui metodologi berbasis data, ia berperan besar dalam menciptakan interaksi digital yang lebih aksesibel dan mampu menjawab tantangan di beragam sektor industri.',
  },
  {
    name: 'Andreas Kevin Rahman',
    role: "Software Developer | CS'17",
    division: 'frontend',
    image: '/assets/alumni/andreas-kevin-rahman.webp',
    desc: 'Berkarir di Indomaret Group, ia memiliki spesialisasi dalam membangun infrastruktur perangkat lunak yang memperkuat lini operasional ritel. Fokusnya tertuju pada pemanfaatan teknologi terkini guna mendorong efektivitas kerja serta menyempurnakan interaksi pelanggan di dalam jaringan digital perusahaan.',
  },
  {
    name: 'Daniel Suranta Sitepu',
    role: "Frontend Engineer | CS'18",
    division: 'frontend',
    image: '/assets/alumni/daniel-suranta-sitepu.webp',
    desc: 'Sebagai ahli di Tiket.com, ia bertanggung jawab merakit tampilan aplikasi yang dinamis dan memanjakan mata. Dengan mengandalkan teknologi web mutakhir, ia memastikan setiap elemen visual berfungsi dengan sempurna guna memberikan kenyamanan maksimal bagi para pelancong digital.',
  },
  {
    name: 'Vidiskiu Fortino Kurniawan',
    role: "VP of Engineering | CS'16",
    division: 'frontend',
    image: '/assets/alumni/vidiskiu-fortino-kurniawan.webp',
    desc: 'Pucuk pimpinan teknis di Bukit Vista Hospitality Services ini memiliki misi mengawinkan kecanggihan teknologi dengan keramahtamahan industri perhotelan. Ia memimpin penciptaan sistem cerdas berbasis data untuk mengotomatisasi manajemen aset serta melahirkan terobosan layanan yang transformatif di sektor properti.',
  },
  {
    name: 'Alvin Januar Ramadan',
    role: "Software Engineer | CS'18",
    division: 'frontend',
    image: '/assets/alumni/alvin-januar-ramadan.webp',
    desc: 'Bagian dari tim inti di Gojek yang berperan dalam memperkokoh fondasi sistem untuk layanan mobilitas, transaksi finansial, hingga pengiriman barang. Melalui kode yang ia susun, ia memastikan platform tetap tangguh, aman, dan mampu melayani kebutuhan jutaan orang dengan kecepatan tinggi setiap harinya.',
  },
  {
    name: 'Patrick Aura Wibawa',
    role: "Backend Developer | CS'16",
    division: 'backend',
    image: '/assets/alumni/placeholder.webp',
    desc: 'Alumni tim teknis Tokopedia yang memiliki spesialisasi dalam menyusun serta merawat arsitektur di balik layar untuk trafik tinggi. Ia berfokus pada penguatan performa server guna menjamin layanan tetap responsif dan kokoh meskipun diakses oleh jutaan pengguna secara bersamaan.',
  },
  {
    name: 'Putra Perdana Haryana',
    role: "Backend Engineer | CS'15",
    division: 'backend',
    image: '/assets/alumni/putra-perdana-haryana.webp',
    desc: 'Membawa pengalaman luas dari berbagai sektor di GRUNDFOS, SMEsHub, hingga Warkum, ia mahir dalam merakit logika sistem yang efisien. Keahlian utamanya terletak pada pembangunan infrastruktur digital yang adaptif untuk menjawab kebutuhan spesifik berbagai jenis industri.',
  },
  {
    name: 'Josua Aditya Mustiko',
    role: "Software Engineer | CS'15",
    division: 'backend',
    image: '/assets/alumni/josua-aditya-mustiko.webp',
    desc: 'Berpengalaman memperkuat Xendit dan Tiket.com, ia fokus pada pengembangan fondasi teknis untuk ekosistem pembayaran serta layanan digital. Prioritas utamanya adalah memastikan setiap pertukaran data dan transaksi daring berjalan dengan tingkat keamanan yang sangat ketat serta keandalan yang tinggi.',
  },
  {
    name: 'Ikhsan Permadi Kusumah',
    role: "Lead Backend Engineer | CS'10",
    division: 'backend',
    image: '/assets/alumni/ikhsan-permadi-kusumah.webp',
    desc: 'Sebagai nakhoda teknis, ia memegang kendali atas perancangan arsitektur sistem pusat dan mengarahkan tim pengembang menuju standar keunggulan. Ia bertanggung jawab penuh dalam memastikan sistem perusahaan mampu berkembang secara fleksibel serta beroperasi dengan efisiensi sumber daya yang maksimal.',
  },
  {
    name: 'Prabowo Wahyu Sudarno',
    role: "Mobile Android Developer | CS'14",
    division: 'mobapps',
    image: '/assets/alumni/prabowo-wahyu-sudarno.webp',
    desc: 'Memiliki rekam jejak yang solid di Mamikos dan Astra, ia mendedikasikan keahliannya dalam merakit aplikasi berbasis Android. Fokus utamanya adalah merancang fitur-fitur baru serta terus mengasah performa aplikasi agar interaksi pengguna menjadi lebih lancar dan memuaskan.',
  },
  {
    name: 'Hadi Fahriza',
    role: "Mobile App Developer | CS'16",
    division: 'mobapps',
    image: '/assets/alumni/hadi-fahriza.webp',
    desc: 'Berkarir di CAD-IT Consultants (ASIA) Pte Ltd, ia berpengalaman dalam menavigasi pengembangan aplikasi lintas platform. Ia berperan aktif dalam melahirkan berbagai solusi mobile yang kreatif namun tetap mengedepankan efisiensi teknis yang tinggi.',
  },
  {
    name: 'Caroline Chan',
    role: "iOS Developer | CS'19",
    division: 'mobapps',
    image: '/assets/alumni/caroline-chan.webp',
    desc: 'Melalui Apple Developer Academy @ Infinite Learning, ia fokus pada penciptaan aplikasi inovatif khusus untuk ekosistem iOS. Ia secara aktif menerapkan teknologi terbaru dari Apple guna menghadirkan perangkat lunak yang tidak hanya interaktif, tetapi juga sangat intuitif bagi para penggunanya.',
  },
  {
    name: 'Doni Tan Hero',
    role: "Game Programmer | CS'18",
    division: 'gamedev',
    image: '/assets/alumni/doni-tan-hero.webp',
    desc: 'Sebagai pengembang di Niji Games Studio, ia bertanggung jawab merancang logika mekanik permainan serta menyempurnakan struktur kode di balik layar. Fokus utamanya adalah memastikan setiap baris program berjalan seefisien mungkin guna menghadirkan performa permainan yang mulus dan bebas hambatan bagi para pemain.',
  },
  {
    name: 'Nabila Yumna',
    role: "Data Science Enthusiast | CS'23",
    division: 'dsai',
    image: '/assets/alumni/nabila-yumna.webp',
    desc: 'Peraih penghargaan 1st Honorable Mention Data Mining serta juara pertama dalam kompetisi karya tulis ilmiah. Ia memiliki portofolio gemilang dalam riset data, termasuk kesuksesannya sebagai juara ketiga di Data Royale. Keahlian teknisnya mencakup pengembangan sistem klasifikasi melalui Deep Learning serta penguatan mesin pencari e-commerce menggunakan teknik pengelompokan data.',
  },
  {
    name: 'Muhammad Dafa Wisnu Galih',
    role: "Data Analytics & Mining Enthusiast | CS'22",
    division: 'dsai',
    image: '/assets/alumni/muhammad-dafa-wisnu-galih.webp',
    desc: 'Juara utama pada ISFEST UMN dan peraih posisi kedua dalam ajang RISTEK Datathon UI. Sebagai finalis di berbagai kompetisi bergengsi seperti COMPFEST dan GEMASTIK, ia sangat mahir dalam membedah pola data yang kompleks serta mengolah informasi mentah menjadi solusi strategis yang berbasis bukti.',
  },
  {
    name: 'Hafid Ambardi',
    role: "Data Science & AI Enthusiast | CS'23",
    division: 'dsai',
    image: '/assets/alumni/hafid-ambardi.webp',
    desc: 'Sosok di balik kemenangan telak pada RISTEK Datathon Fraud Detection, di mana ia meraih tim terbaik sekaligus skor evaluasi tertinggi di Kaggle Leaderboard. Ia juga diakui atas inovasinya dalam pembaruan mesin pencari belanja daring, dengan spesialisasi pada Machine Learning dan pembangunan sistem kecerdasan buatan.',
  },
  {
    name: 'Desthalia',
    role: "Data Division Lead | CS'15",
    division: 'dsai',
    image: '/assets/alumni/desthalia.webp',
    desc: 'Seorang ahli data di Widya Analytic yang berfokus pada transformasi data menjadi wawasan bisnis yang strategis. Ia memiliki peran krusial dalam merancang model pembelajaran mesin serta algoritma cerdas guna meningkatkan akurasi dan efisiensi dalam pengolahan informasi perusahaan.',
  },
]

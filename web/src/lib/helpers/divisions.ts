/* 
    Computer Science divisions along with their logos and descriptions.
    DIVISIONS.<division>.name
*/
export type Division = {
  name: string
  slug: string
  img?: string
  description: string
  career: {
    firstDescription: string
    secondDescription: string
  }
}

export const DIVISIONS = [
  {
    name: 'Front End',
    slug: 'frontend',
    img: '/assets/divisions/frontend.webp',
    description:
      'Mengembangkan tampilan dan interaksi pengguna pada sebuah website atau aplikasi. Mencakup desain responsif, animasi, dan optimasi agar antarmuka terlihat menarik serta mudah digunakan di berbagai perangkat.',
    career: {
      firstDescription: 'You show strong aptitude for Front-End Development.',
      secondDescription:
        'Pernah nggak sih kamu mengunjungi website yang tampilannya keren, loading-nya cepat, dan interaksinya mulus? Itu semua hasil kerja seorang Front-End Developer! Mereka bertanggung jawab mengubah desain menjadi kode yang bisa dilihat dan digunakan oleh pengguna. Dengan HTML, CSS, dan JavaScript, Front-End Developer memastikan setiap elemen dari tombol, animasi, hingga tata letak berfungsi dengan baik dan responsif di berbagai perangkat. Bayangkan kalau sebuah website tampilannya berantakan, nggak bisa diakses di HP, atau tombolnya nggak bekerja—pasti bikin frustrasi, kan? Inilah alasan kenapa Front-End Development sangat penting! Dengan kode yang rapi dan efisien, sebuah website bisa lebih cepat, nyaman digunakan, dan tentunya menarik secara visual. Kalau kamu suka menggabungkan logika dengan kreativitas, tertarik dengan dunia web, dan ingin menciptakan tampilan website yang interaktif dan user-friendly, Front-End Development bisa jadi pilihan karir yang tepat!',
    },
  },
  {
    name: 'Back End',
    slug: 'backend',
    img: '/assets/divisions/backend.webp',
    description:
      'Mengelola logika, database, dan server agar sistem berjalan dengan lancar. Mencakup pengolahan data, keamanan, dan optimasi performa untuk memastikan aplikasi dapat berfungsi dengan baik di balik layar.',
    career: {
      firstDescription:
        'Your results indicate you would excel in Back-End Development.',
      secondDescription:
        'Pernah penasaran bagaimana aplikasi bisa menyimpan data, memproses permintaan, dan berjalan tanpa hambatan? Itu semua berkat kerja Back-End Developer! Mereka adalah arsitek di balik layar yang membangun sistem inti dari sebuah aplikasi atau website. Dengan menggunakan bahasa pemrograman seperti Python, Java, atau PHP, mereka menangani server, database, dan API yang menghubungkan berbagai layanan. Tanpa back-end yang kuat, website atau aplikasi hanyalah tampilan kosong tanpa fungsi. Bayangkan kalau kamu login tapi data akunmu hilang, atau saat checkout di e-commerce malah error—pasti bikin kesal, kan? Inilah kenapa Back-End Development sangat penting! Mereka memastikan semua proses berjalan efisien, data tersimpan dengan aman, dan sistem bisa menangani banyak pengguna tanpa lemot. Buat kamu yang suka berpikir logis, menikmati tantangan dalam mengelola data dan sistem, serta ingin membangun teknologi yang bisa diandalkan, Back-End Development adalah dunia yang menarik untuk dijelajahi!',
    },
  },
  {
    name: 'UI/UX Design',
    slug: 'uiux',
    img: '/assets/divisions/uiux.webp',
    description:
      'Menggabungkan kreativitas dan analisis untuk menciptakan desain yang menarik serta pengalaman pengguna yang intuitif. Mencakup tampilan antarmuka, ikon, ilustrasi, dan interaksi pengguna dengan fitur dalam aplikasi atau website.',
    career: {
      firstDescription:
        'Your results suggest you have a strong eye for UI/UX Design.',
      secondDescription:
        'Pernah nggak sih kamu pakai aplikasi atau website yang bikin betah karena tampilannya menarik dan gampang digunakan? Itu semua adalah hasil kerja dari UI/UX Designer! UI (User Interface) berfokus pada bagaimana sebuah aplikasi atau website terlihat, mulai dari warna, ikon, font, hingga tata letaknya. Sementara itu, UX (User Experience) memastikan pengalaman pengguna tetap nyaman, mudah, dan intuitif, sehingga orang-orang nggak kebingungan saat menggunakannya. Bayangkan kalau aplikasi favoritmu tampilannya berantakan, susah dinavigasi, atau tombolnya nggak responsif—pasti langsung malas, kan? Inilah alasan kenapa UI/UX sangat penting! Desain yang baik bisa meningkatkan kepuasan pengguna, membuat orang-orang lebih lama menggunakan aplikasi, dan bahkan membantu bisnis berkembang. Kalau kamu suka desain, tertarik dengan perilaku manusia, dan ingin menciptakan pengalaman digital yang lebih baik, UI/UX bisa jadi jalan karier yang seru buatmu! Di era digital ini, peran UI/UX semakin dibutuhkan untuk menciptakan produk yang user-centered dan menarik.',
    },
  },
  {
    name: 'Mobile Apps',
    slug: 'mobapps',
    img: '/assets/divisions/mobapps.webp',
    description:
      'Membangun aplikasi yang fungsional dan user-friendly untuk berbagai perangkat mobile. Mencakup desain antarmuka, pengembangan fitur, dan optimasi performa agar aplikasi berjalan lancar di berbagai sistem operasi.',
    career: {
      firstDescription: 'You demonstrate natural talent for Mobile App Development.',
      secondDescription:
        'Smartphone sudah jadi bagian tak terpisahkan dari kehidupan kita, dan di balik setiap aplikasi yang kita gunakan—mulai dari media sosial, e-commerce, hingga transportasi online—ada Mobile App Developer yang membuat semuanya berjalan lancar. Pengembangan aplikasi mobile dibagi menjadi dua jenis utama: Android (menggunakan Kotlin atau Java) dan iOS (menggunakan Swift). Ada juga cross-platform development, seperti Flutter atau React Native, yang memungkinkan aplikasi dibuat untuk kedua sistem sekaligus. Seorang mobile developer harus memastikan aplikasi tidak hanya tampil menarik, tetapi juga ringan, responsif, dan berjalan tanpa bug. Buat kamu yang suka membangun sesuatu yang bisa langsung digunakan banyak orang, senang bereksperimen dengan teknologi, dan ingin menciptakan aplikasi yang memudahkan kehidupan sehari-hari, Mobile App Development adalah bidang yang menarik dan penuh peluang!',
    },
  },
  {
    name: 'Cyber Security',
    slug: 'cysec',
    img: '/assets/divisions/cysec.webp',
    description:
      'Melindungi data dan sistem dari ancaman digital dengan berbagai teknik keamanan. Mencakup enkripsi, deteksi ancaman, serta pengamanan jaringan dan aplikasi untuk menjaga informasi tetap aman dari serangan siber.',
    career: {
      description: 'You demonstrate aptitude for Cyber Security.',
      fullDescription:
        'Di era digital seperti sekarang, data adalah aset paling berharga. Tapi, pernahkah kamu berpikir bagaimana data pribadimu tetap aman saat bertransaksi online, login ke akun media sosial, atau mengakses layanan digital? Di sinilah peran Cybersecurity! Cybersecurity adalah bidang yang berfokus pada melindungi sistem, jaringan, dan data dari serangan siber. Bayangkan jika informasi penting seperti data perbankan atau identitasmu jatuh ke tangan hacker—bisa berbahaya, bukan? Dengan teknik seperti enkripsi, firewall, dan penetration testing, para ahli keamanan siber bekerja tanpa henti untuk mencegah pencurian data, serangan malware, dan ancaman digital lainnya. Buat kamu yang suka tantangan, berpikir analitis, dan tertarik dengan dunia teknologi serta keamanan digital, Cybersecurity adalah pilihan karier yang menjanjikan! Selain memiliki peran krusial dalam berbagai industri, profesi ini juga terus berkembang seiring dengan meningkatnya ancaman siber di seluruh dunia.',
    },
  },
  {
    name: 'Data Science AI',
    slug: 'dsai',
    img: '/assets/divisions/dsai.webp',
    description:
      'Mengolah data dan kecerdasan buatan untuk menghasilkan keputusan yang lebih cerdas dan efisien. Mencakup analisis data, machine learning, dan otomatisasi untuk berbagai bidang, dari bisnis hingga teknologi masa depan.',
    career: {
      description: 'You show great potential in Data Science & AI.',
      firstDescription:
        'Data Scientist bertanggung jawab mengolah kumpulan data mentah menjadi wawasan bisnis yang berharga dan dapat ditindaklanjuti. Fokus utamamu adalah merancang model prediktif, membersihkan anomali data, serta memvisualisasikan tren kompleks menjadi informasi yang mudah dipahami oleh tim.',
      secondDescription:
        'Kamu berperan penting dalam mengarahkan strategi produk berdasarkan fakta dan angka nyata. Dengan menguasai algoritma machine learning dan bahasa pemrograman analitik, kamu memastikan keputusan bisnis tidak lagi berdasarkan tebakan tetapi didukung oleh akurasi data bagi semua orang.',
    },
  },
  {
    name: 'Game Development',
    slug: 'gamedev',
    img: '/assets/divisions/gamedev.webp',
    description:
      'Mengembangkan dunia virtual yang interaktif dengan menggabungkan desain, pemrograman, dan kreativitas. Mencakup pembuatan karakter, mekanik permainan, hingga optimasi performa untuk pengalaman gaming yang lebih imersif.',
    career: {
      firstDescription:
        'Your results indicate strong potential in Game Development.',
      secondDescription:
        'Siapa yang tidak suka bermain game? Tapi, pernahkah kamu berpikir bagaimana sebuah game bisa dibuat? Di balik grafis yang keren, gameplay yang seru, dan pengalaman yang imersif, ada peran besar dari Game Developer! Game Development adalah proses menciptakan permainan, mulai dari perancangan konsep, pengembangan mekanik, hingga pengujian dan peluncuran. Dalam bidang ini, kamu bisa menjadi Game Programmer yang menulis kode dengan bahasa seperti C# atau C++, Game Designer yang menciptakan alur permainan, atau Game Artist yang membuat karakter dan lingkungan visual. Mesin game seperti Unity dan Unreal Engine juga memainkan peran penting dalam pengembangannya. Buat kamu yang kreatif, suka memecahkan masalah, dan ingin menciptakan pengalaman yang bisa dinikmati banyak orang, Game Development adalah dunia yang penuh tantangan dan keseruan! Dari game mobile hingga AAA games, industri ini terus berkembang dan selalu membuka peluang bagi para inovator baru.',
    },
  },
  // monggo" dikomen aja karena gak ada di figma
  // {
  //   name: 'Competitive Programming',
  //   slug: 'cp',
  //   img: '/assets/divisions/cp.webp',
  //   description:
  //     'tubi verba arcana resonant inter columnas memoriae. In aethere suspenso inter chaos et ordinem, conceptus ignoti efflorescunt sicut flores siderum, formantes nexus incomprehensibiles inter finitum et infinitum. Quisquis intrat hanc aulam cogitationis, detegit scripturas vetustatis.',
  //   career: {
  //     description: 'You show exceptional talent for Competitive Programming.',
  //     fullDescription:
  //       'This field tests your ability to solve complex algorithmic problems efficiently. Your logical thinking and problem-solving skills would be valuable in competitions and in roles that require algorithmic optimization.',
  //   },
  // },
]

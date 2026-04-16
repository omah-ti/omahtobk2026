export type CareerProfile = {
  id: string
  title: string
  imageSlug: string
  firstDescription: string
  secondDescription: string
  aliases: string[]
}

export const CAREER_PROFILES: CareerProfile[] = [
  {
    id: 'backend',
    title: 'BACK END',
    imageSlug: 'backend',
    firstDescription:
      'Back End Developer bertanggung jawab membangun logika sisi server dan arsitektur basis data yang kokoh. Fokus utamamu adalah merancang API yang efisien, mengelola sistem manajemen data yang aman, serta memastikan stabilitas infrastruktur agar aplikasi dapat berjalan tanpa hambatan.',
    secondDescription:
      'Kamu berperan penting dalam menjaga mesin penggerak utama di balik layar tetap beroperasi. Dengan menguasai bahasa pemrograman server dan optimasi kueri basis data, kamu memastikan sistem tidak hanya aman dari ancaman tetapi juga mampu menangani lonjakan pengguna dengan baik bagi semua orang.',
    aliases: ['back end', 'backend', 'backend engineer', 'back end developer'],
  },
  {
    id: 'frontend',
    title: 'FRONT END',
    imageSlug: 'frontend',
    firstDescription:
      'Front End Developer bertanggung jawab membangun antarmuka digital yang interaktif dan responsif menggunakan HTML, CSS, dan JavaScript. Fokus utamamu adalah mengubah desain visual menjadi kode nyata yang fungsional, memastikan setiap elemen UI berjalan mulus di berbagai perangkat, serta mengoptimalkan kecepatan akses demi pengalaman pengguna yang maksimal.',
    secondDescription:
      'Kamu berperan penting dalam menjembatani sisi estetika desain dengan logika pemrograman. Dengan menguasai struktur kode yang bersih dan integrasi data yang efisien, kamu memastikan aplikasi tidak hanya terlihat menarik tetapi juga memiliki performa tinggi dan aksesibilitas yang baik bagi semua orang.',
    aliases: [
      'fron end',
      'front end',
      'frontend',
      'front end developer',
      'front-end developer',
    ],
  },
  {
    id: 'uiux',
    title: 'UI/UX DESIGNER',
    imageSlug: 'uiux',
    firstDescription:
      'UI/UX Designer bertanggung jawab merancang antarmuka visual yang estetis sekaligus menciptakan alur pengalaman pengguna yang intuitif. Fokus utamamu adalah melakukan riset kebutuhan audiens, menyusun wireframe interaktif, serta membuat prototipe desain yang fungsional di berbagai ukuran layar.',
    secondDescription:
      'Kamu berperan penting dalam menghubungkan empati pengguna dengan solusi produk digital. Dengan menguasai prinsip desain empati dan tipografi yang harmonis, kamu memastikan aplikasi tidak hanya indah dipandang tetapi juga sangat mudah digunakan dan dinavigasi bagi semua orang.',
    aliases: [
      'ui/ux designer',
      'ui ux designer',
      'uiux',
      'ui ux',
      'ui/ux designer or front-end engineer',
    ],
  },
  {
    id: 'cysec',
    title: 'CYBER SECURITY',
    imageSlug: 'cysec',
    firstDescription:
      'Cyber Security Analyst bertanggung jawab melindungi sistem jaringan dan data sensitif dari berbagai ancaman digital. Fokus utamamu adalah memantau aktivitas mencurigakan, melakukan pengujian kerentanan sistem, serta merancang protokol keamanan berlapis untuk mencegah kebocoran informasi.',
    secondDescription:
      'Kamu berperan penting dalam membangun benteng pertahanan utama untuk ekosistem digital. Dengan menguasai teknik enkripsi data dan analisis forensik jaringan, kamu memastikan privasi pengguna tetap terjaga dan platform beroperasi dengan tingkat kepercayaan yang tinggi bagi semua orang.',
    aliases: ['cyber security', 'cysec', 'security analyst'],
  },
  {
    id: 'data-scientist',
    title: 'DATA SCIENTIST',
    imageSlug: 'dsai',
    firstDescription:
      'Data Scientist bertanggung jawab mengolah kumpulan data mentah menjadi wawasan bisnis yang berharga dan dapat ditindaklanjuti. Fokus utamamu adalah merancang model prediktif, membersihkan anomali data, serta memvisualisasikan tren kompleks menjadi informasi yang mudah dipahami oleh tim.',
    secondDescription:
      'Kamu berperan penting dalam mengarahkan strategi produk berdasarkan fakta dan angka nyata. Dengan menguasai algoritma machine learning dan bahasa pemrograman analitik, kamu memastikan keputusan bisnis tidak lagi berdasarkan tebakan tetapi didukung oleh akurasi data bagi semua orang.',
    aliases: [
      'data scientist',
      'data engineer / big data architect',
      'data engineer',
      'big data architect',
    ],
  },
  {
    id: 'dsai',
    title: 'DSAI',
    imageSlug: 'dsai',
    firstDescription:
      'AI Engineer bertanggung jawab merancang dan melatih model kecerdasan buatan untuk mengotomatisasi sistem yang kompleks. Fokus utamamu adalah membangun jaringan saraf tiruan, mengimplementasikan pemrosesan bahasa alami, serta mengoptimalkan algoritma agar mesin dapat belajar secara mandiri.',
    secondDescription:
      'Kamu berperan penting dalam membawa inovasi masa depan ke dalam produk digital masa kini. Dengan menguasai logika matematika lanjutan dan arsitektur model komputasi, kamu memastikan teknologi tidak hanya menjadi alat pasif tetapi juga asisten cerdas yang proaktif bagi semua orang.',
    aliases: [
      'dsai',
      'ai engineer',
      'ai & machine learning engineer',
      'machine learning engineer',
      'data science ai',
    ],
  },
  {
    id: 'mobile-development',
    title: 'MOBILE DEVELOPMENT',
    imageSlug: 'mobapps',
    firstDescription:
      'Mobile Developer bertanggung jawab merancang dan membangun aplikasi ponsel pintar yang berjalan mulus di sistem operasi iOS maupun Android. Fokus utamamu adalah menyusun kode yang efisien, mengintegrasikan fitur perangkat keras seperti kamera, serta memastikan konsistensi antarmuka di berbagai ukuran gawai.',
    secondDescription:
      'Kamu berperan penting dalam membawa teknologi agar selalu berada dalam genggaman pengguna. Dengan menguasai kerangka kerja aplikasi seluler dan manajemen memori yang baik, kamu memastikan aplikasi tidak hanya kaya fitur tetapi juga hemat baterai dan responsif bagi semua orang.',
    aliases: ['mobile development', 'mobile developer', 'mobapps', 'mobile apps'],
  },
  {
    id: 'cloud-engineer',
    title: 'CLOUD ENGINEER',
    imageSlug: 'backend',
    firstDescription:
      'Cloud Engineer bertanggung jawab menjembatani proses pengembangan perangkat lunak dengan operasi IT melalui sistem otomatisasi komputasi awan. Fokus utamamu adalah merancang alur integrasi berkelanjutan, mengelola server virtual, serta memantau kesehatan infrastruktur agar selalu tersedia setiap saat.',
    secondDescription:
      'Kamu berperan penting dalam mempercepat siklus peluncuran fitur baru ke tangan pengguna. Dengan menguasai arsitektur sistem terdistribusi dan manajemen kontainer aplikasi, kamu memastikan platform tidak hanya stabil saat pembaruan tetapi juga skalabel dan andal bagi semua orang.',
    aliases: ['cloud engineer', 'devops', 'devops engineer'],
  },
  {
    id: 'game-development',
    title: 'GAME DEVELOPMENT',
    imageSlug: 'gamedev',
    firstDescription:
      'Game Developer bertanggung jawab mengubah baris kode dan aset visual menjadi pengalaman interaktif yang imersif dan hidup. Fokus utamamu adalah merancang logika permainan yang kompleks, mengoptimalkan mekanik gameplay, serta memastikan performa aplikasi tetap lancar di berbagai perangkat melalui penguasaan game engine.',
    secondDescription:
      'Kamu berperan penting dalam menghidupkan visi kreatif ke dalam dunia digital yang dapat dimainkan. Dengan menguasai arsitektur sistem real-time dan integrasi aset multimedia, kamu memastikan bahwa setiap interaksi terasa responsif, duniamu bebas dari kendala teknis, serta setiap pembaruan konten memberikan petualangan yang tak terlupakan bagi para pemain.',
    aliases: ['game development', 'game developer', 'gamedev'],
  },
]

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const aliasMap = new Map<string, CareerProfile>()

for (const profile of CAREER_PROFILES) {
  aliasMap.set(normalize(profile.id), profile)
  aliasMap.set(normalize(profile.title), profile)

  for (const alias of profile.aliases) {
    aliasMap.set(normalize(alias), profile)
  }
}

export const resolveCareerProfile = (rawRole?: string | null) => {
  if (!rawRole) {
    return null
  }

  const normalizedRole = normalize(rawRole)
  if (!normalizedRole) {
    return null
  }

  const direct = aliasMap.get(normalizedRole)
  if (direct) {
    return direct
  }

  // Fuzzy fallback for role names sent by backend.
  if (normalizedRole.includes('backend')) {
    return aliasMap.get('backend') || null
  }
  if (normalizedRole.includes('front')) {
    return aliasMap.get('frontend') || null
  }
  if (normalizedRole.includes('ui') || normalizedRole.includes('ux')) {
    return aliasMap.get('uiux') || null
  }
  if (normalizedRole.includes('cyber') || normalizedRole.includes('security')) {
    return aliasMap.get('cysec') || null
  }
  if (normalizedRole.includes('machine learning') || normalizedRole.includes('ai')) {
    return aliasMap.get('dsai') || null
  }
  if (normalizedRole.includes('data')) {
    return aliasMap.get('data scientist') || null
  }
  if (normalizedRole.includes('mobile')) {
    return aliasMap.get('mobile development') || null
  }
  if (normalizedRole.includes('cloud') || normalizedRole.includes('devops')) {
    return aliasMap.get('cloud engineer') || null
  }
  if (normalizedRole.includes('game')) {
    return aliasMap.get('game development') || null
  }

  return null
}

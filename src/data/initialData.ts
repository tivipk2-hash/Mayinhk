import { AppState } from '../types';
import { DEFAULT_CATEGORY_CONFIGS } from '../services/categoryService';

export const INITIAL_STATE: AppState = {
  masterPassword: '0112143',

  users: [
    {
      id: 'usr_admin',
      username: 'admin',
      name: 'Quản Lý Cổ Trấn',
      role: 'admin',
      passwordHash: '0112143',
    },
    {
      id: 'usr_thanhhang',
      username: 'thanhhang',
      name: 'Thanh Hằng',
      role: 'staff',
      passwordHash: '123456',
    },
    {
      id: 'usr_minhtri',
      username: 'minhtri',
      name: 'Minh Trí',
      role: 'staff',
      passwordHash: '123456',
    },
    {
      id: 'usr_ketoan',
      username: 'ketoan',
      name: 'Kế Toán Cổ Trấn',
      role: 'viewer',
      passwordHash: '123456',
    }
  ],

  printerSettings: {
    billPrinterIp: '192.168.1.79',
    billPrinterPort: 9100,
    billPaperWidthMm: 85,
    billCopies: 1,
    billPrinterName: 'XP-80C (Bill LAN)',

    labelPrinterIp: '192.168.1.52',
    labelPrinterPort: 9100,
    labelWidthMm: 50,
    labelHeightMm: 30,
    labelPrinterName: 'XP-350B (Tem LAN)',
    labelCommandType: 'tspl',
    printBothOnCheckout: true,

    bridgeWsUrl: 'ws://localhost:13579',
    printMode: 'bridge',
    qzHost: 'localhost',
    qzPort: 13579,
    qzUseSecure: false,
  },

  billTemplate: {
    shopName: 'HongKong Cổ Trấn',
    address: 'Lâm Đồng',
    phone: '0336730797',
    billTitle: 'HOÁ ĐƠN THANH TOÁN',
    tableNotice: 'Vui lòng nhận nước tại quầy nước (Tầng 4)',
    wifiSsid: 'HongKong94',
    wifiPass: '99999999',
    footerMessage: 'Cảm ơn Quý khách & Hẹn gặp Lại!',
    printDateTime: true,
    printCashier: true,
    vietQr: {
      enabled: true,
      bankId: 'MB',
      bankName: 'MBBank - Ngân hàng Quân Đội',
      accountNo: '0336730797',
      accountName: 'HONGKONG CO TRAN',
      template: 'compact2',
      transferSyntax: 'DH {code}',
    },
  },

  categoryConfigs: DEFAULT_CATEGORY_CONFIGS,

  categories: [
    'Coffee',
    'Nước Trái Cây',
    'Trà Trái Cây',
    'Trà Sữa',
    'Sữa Tươi',
    'Yaourt',
    'Đồ Ăn',
    'Món Mới',
    'Đồ Dùng & Phụ Kiện',
    'Cổ Phục & Đồ Mặc'
  ],

  labelTemplate: {
    headerPrefix: 'Ly',
    showCupNumber: true,
    showOrderCode: true,
    showDateTime: true,
    footerNote: 'HongKong Cổ Trấn - Chúc ngon miệng',
  },

  homepage: {
    shopName: 'HONGKONG CỔ TRẤN',
    tagline: 'Một thoáng Hong Kong thập niên 90 giữa lòng Cao Nguyên',
    subTagline: 'KHÔNG GIAN HOÀI CỔ HONG KONG ĐỘC BẢN',
    address: 'Lâm Đồng, Việt Nam',
    hotline: '0336730797',
    openHours: '07:00 - 22:30 hàng ngày',
    wifiSsid: 'HongKong94',
    wifiPass: '99999999',
    introText: 'HongKong Cổ Trấn đưa bạn lạc bước vào không gian điện ảnh TVB thập niên 80-90. Nơi những bảng hiệu gỗ thư pháp, lồng đèn đỏ thắm, tivi bóng hình cổ và tiếng nhạc đĩa than hòa quyện cùng hương vị cà phê Lâm Đồng thơm nồng.',

    tvChannels: [
      {
        id: 1,
        channelName: 'Kênh 1: Hong Kong 90s Vibes',
        youtubeId: 'Wk4h77B4wQ8', // Retro Cantopop / Hong Kong ambient
        title: 'Bản Tình Ca Phố Cũ - Thập Niên 90',
        description: 'Những giai điệu hoài niệm TVB ngân vang trong quán nước xưa.',
      },
      {
        id: 2,
        channelName: 'Kênh 2: Wong Kar-wai Mood',
        youtubeId: 'q_tS_2Z0zQk',
        title: 'Tâm Trạng Khi Yêu (In the Mood for Love)',
        description: 'Khung hình điện ảnh đầy chất thơ và ánh đèn neon lấp lánh.',
      },
      {
        id: 3,
        channelName: 'Kênh 3: Phố Đêm Cửu Long (Kowloon)',
        youtubeId: 'V9P739pEhhw',
        title: 'Đêm Mưa Mong Kok & Bảng Hiệu Neon',
        description: 'Âm thanh đường phố Hong Kong rộn rã những thập niên trước.',
      },
      {
        id: 4,
        channelName: 'Kênh 4: Băng Cassette & Dĩa Than',
        youtubeId: 'kJQP7kiw5Fk',
        title: 'Trương Quốc Vinh & Mai Diễm Phương Tuyển Tập',
        description: 'Tiếng rè mộc mạc của máy phát băng cối cổ điển.',
      },
      {
        id: 5,
        channelName: 'Kênh 5: Hương Trà Cổ Trấn',
        youtubeId: 'jfKfPfyJRdk',
        title: 'Lo-Fi Cổ Phong Cổ Trấn Chill',
        description: 'Nhẹ nhàng thư thái thưởng thức ly cà phê rang mộc Tây Nguyên.',
      },
    ],

    corners: [
      {
        id: 'corner-1',
        title: 'Hiên Cổ Phục',
        subtitle: '尖沙嘴 Select 18',
        category: 'cophuc',
        description: 'Không gian gác gỗ mộc mạc lưu giữ nét duyên trang phục hỷ sự cổ truyền Hong Kong.',
        images: [
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80',
        ]
      },
      {
        id: 'corner-2',
        title: 'Góc Trú Mưa Mái Tôn',
        subtitle: '中西區',
        category: 'gacgo',
        description: 'Tiểu cảnh mộc phong rêu, bảng hiệu lam sơn hoài niệm giữa làn sương mờ.',
        images: [
          'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&auto=format&fit=crop&q=80',
        ]
      },
      {
        id: 'corner-3',
        title: 'Cổng Trung Tây Khu (中西區)',
        subtitle: 'Cổng Gỗ Khắc Chữ Hán',
        category: 'gacgo',
        description: 'Biển hiệu chữ Hán khắc gỗ sơn, mái ngói cổ truyền bên rèm lụa hoài cổ.',
        images: [
          'https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
        ]
      },
      {
        id: 'corner-4',
        title: 'Phố Tiệm Sa Chùy (尖沙嘴)',
        subtitle: 'Select 18 Vintage',
        category: 'doco',
        description: 'Lối đi lát gạch hoa cổ rực rỡ, góc phố Kowloon hoa lệ thời hoàng kim.',
        images: [
          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
        ]
      },
      {
        id: 'corner-5',
        title: 'Tiệm Đồ Cổ & Tivi Thập Niên 80',
        subtitle: 'Cassette & Màn Hình Bóng',
        category: 'doco',
        description: 'Góc tivi bóng hình cổ, máy điện thoại quay số và đồng hồ quả lắc xưa.',
        images: [
          'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1516116211227-bbc13fcf867d?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
        ]
      },
      {
        id: 'corner-6',
        title: 'Lầu Ngắm Cảnh Nhất Đại Tông Sư',
        subtitle: 'Nhất Đại Tông Sư',
        category: 'gacgo',
        description: 'Lan can gỗ nhìn ra thung lũng, liền đôi Tứ Hải Giai Huynh Đệ sơn thẫm.',
        images: [
          'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&auto=format&fit=crop&q=80',
        ]
      },
      {
        id: 'corner-7',
        title: 'Phòng Trà Loa Kèn & Guitar',
        subtitle: 'Âm Sắc Hoài Cổ',
        category: 'doco',
        description: 'Giai điệu sườn xám bên máy hát đĩa than cổ và ánh đèn hoa đăng ấm áp.',
        images: [
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
        ]
      },
      {
        id: 'corner-8',
        title: 'Bếp Cổ Trấn (廚房 食神)',
        subtitle: 'Quầy Bếp & Hương Vị',
        category: 'gacgo',
        description: 'Quầy gỗ mộc bên dây ớt đỏ, hương thơm cà phê phin và dimsum nghi ngút.',
        images: [
          'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&auto=format&fit=crop&q=80',
        ]
      },
      {
        id: 'corner-9',
        title: 'Gác Hồng Lâu Mộng (紅樓夢)',
        subtitle: 'Cành Đào & Sắc Đỏ',
        category: 'cophuc',
        description: 'Cành hoa đào đón xuân, dàn cassette băng từ và ánh đèn vàng lắng đọng.',
        images: [
          'https://images.unsplash.com/photo-1528164344705-475426879c0d?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&auto=format&fit=crop&q=80',
        ]
      }
    ]
  },

  menu: [
    // Coffee
    {
      id: 'm1',
      name: 'Cacao đá',
      category: 'Coffee',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Cacao nguyên chất béo ngậy thơm lừng'
    },
    {
      id: 'm2',
      name: 'Cacao nóng',
      category: 'Coffee',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Ấm áp ngày se lạnh Tây Nguyên'
    },
    {
      id: 'm3',
      name: 'Bạc xỉu (đá)',
      category: 'Coffee',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Hương vị Sài Gòn - Hong Kong chuẩn vị sữa đặc'
    },
    {
      id: 'm4',
      name: 'Bạc xỉu (nóng)',
      category: 'Coffee',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Vị ngọt dịu dàng, lớp bọt sánh mịn'
    },
    {
      id: 'm5',
      name: 'Cafe sữa đá',
      category: 'Coffee',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Cà phê rang mộc phin truyền thống'
    },
    {
      id: 'm6',
      name: 'Cafe sữa (nóng)',
      category: 'Coffee',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Hương vị đậm đà đánh thức mọi giác quan'
    },
    {
      id: 'm7',
      name: 'Cafe đen (đá)',
      category: 'Coffee',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Đậm đặc nguyên chất không pha tạp'
    },
    {
      id: 'm8',
      name: 'Cafe đen (nóng)',
      category: 'Coffee',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Phin nhỏ giọt phong cách hoài niệm'
    },
    {
      id: 'm9',
      name: 'Cà phê muối',
      category: 'Coffee',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Lớp kem béo mằn mặn hòa quyện cà phê đậm vị'
    },
    {
      id: 'm10',
      name: 'Americano',
      category: 'Coffee',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Cà phê nguyên chất thanh tao sảng khoái'
    },

    // Trà sữa & Sữa tươi (matches actual bill photo hd.jpg)
    {
      id: 'm11',
      name: 'Khoai môn kem chessee(M)',
      category: 'Trà Sữa',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1558857563-b37cf5b7a157?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Khoai môn dẻo thơm kem cheese mặn béo'
    },
    {
      id: 'm12',
      name: 'Matcha sữa tươi đá(M)',
      category: 'Sữa Tươi',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Matcha Uji Nhật Bản kết hợp sữa tươi thanh trùng'
    },
    {
      id: 'm13',
      name: 'Sữa tươi trân châu đường đen(M)',
      category: 'Sữa Tươi',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Đường thốt nốt nấu thủ công và trân châu dai ngon'
    },
    {
      id: 'm14',
      name: 'Cam tươi(M)',
      category: 'Nước Trái Cây',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Cam sành tươi vắt nguyên chất dồi dào vitamin C'
    },
    {
      id: 'm15',
      name: 'Trà đào cam sả',
      category: 'Trà Trái Cây',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Đào giòn thơm ngát tinh dầu sả tươi'
    },
    {
      id: 'm16',
      name: 'Trà vải kim tơ',
      category: 'Trà Trái Cây',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Thanh mát hương vải chín mọng Hồng Kông'
    },
    {
      id: 'm17',
      name: 'Yaourt việt quất',
      category: 'Yaourt',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Sữa chua dẻo nhà làm sốt việt quất tươi'
    },
    {
      id: 'm18',
      name: 'Há cảo tôm sò điệp',
      category: 'Đồ Ăn',
      price: 70000,
      image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Dimsum nóng hổi vỏ mỏng nhân đầy đặn'
    },
    {
      id: 'm19',
      name: 'Bánh bao kim sa',
      category: 'Đồ Ăn',
      price: 60000,
      image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Nhân trứng muối tan chảy béo ngậy'
    },

    // Phụ kiện & Đồ dùng (Không in tem khi gọi món theo cấu hình danh mục)
    {
      id: 'acc_khanlanh',
      name: 'Khăn lạnh Cổ Trấn',
      category: 'Đồ Dùng & Phụ Kiện',
      price: 3000,
      image: 'https://images.unsplash.com/photo-1606907570494-0f2c416e8666?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Khăn ướt ướp hoa lài thơm mát - Không in tem',
      printLabel: false,
    },
    {
      id: 'acc_muongdua',
      name: 'Bộ muỗng đũa gỗ mang đi',
      category: 'Đồ Dùng & Phụ Kiện',
      price: 5000,
      image: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Dụng cụ ăn thân thiện môi trường - Không in tem',
      printLabel: false,
    },
    {
      id: 'acc_cophuc',
      name: 'Thuê cổ phục Hong Kong (1 Bộ)',
      category: 'Cổ Phục & Đồ Mặc',
      price: 80000,
      image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80',
      isAvailable: true,
      description: 'Áo khỏa hoặc sườn xám chụp hình cổ điển - Không in tem',
      printLabel: false,
    }
  ],

  // Initial clean states for production orders and expenses
  orders: [],
  expenses: [],
  shifts: [],
  currentShift: null
};
